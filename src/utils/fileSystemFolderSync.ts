// File System Access API Integration for Shared PC Folders
// Allows saving and synchronizing the app database directly in a folder on the computer (e.g. C:\Galpao_Dados, D:\Sondagem_ARGMGP)

const IDB_FS_NAME = 'argmgp_fs_handle_store_v1';
const IDB_FS_STORE = 'fs_handles';
const MAIN_DB_FILE = 'ARGMGP_DATABASE.json';

export interface FolderSyncState {
  isSupported: boolean;
  isLinked: boolean;
  folderName: string | null;
  lastSavedAt: string | null;
  lastLoadedAt: string | null;
  isAutoSaveActive: boolean;
  error: string | null;
  isWriting: boolean;
}

let activeDirHandle: any = null;
let debounceTimer: any = null;
const subscribers = new Set<(state: FolderSyncState) => void>();

let currentState: FolderSyncState = {
  isSupported: typeof window !== 'undefined' && 'showDirectoryPicker' in window,
  isLinked: false,
  folderName: null,
  lastSavedAt: null,
  lastLoadedAt: null,
  isAutoSaveActive: true,
  error: null,
  isWriting: false,
};

function emitState() {
  const copy = { ...currentState };
  subscribers.forEach((cb) => cb(copy));
}

// IndexedDB Helper to persist Directory Handle
function getFsIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = window.indexedDB.open(IDB_FS_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_FS_STORE)) {
        db.createObjectStore(IDB_FS_STORE);
      }
    };
  });
}

async function persistHandleToIdb(handle: any): Promise<void> {
  try {
    const db = await getFsIdb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_FS_STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(IDB_FS_STORE).put(handle, 'main_folder_handle');
    });
  } catch (err) {
    console.warn('[FileSystem] Erro ao salvar handle no IDB:', err);
  }
}

async function getStoredHandleFromIdb(): Promise<any> {
  try {
    const db = await getFsIdb();
    return await new Promise<any>((resolve, reject) => {
      const tx = db.transaction(IDB_FS_STORE, 'readonly');
      const req = tx.objectStore(IDB_FS_STORE).get('main_folder_handle');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function clearStoredHandleFromIdb(): Promise<void> {
  try {
    const db = await getFsIdb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_FS_STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(IDB_FS_STORE).delete('main_folder_handle');
    });
  } catch {
    // ignore
  }
}

// Verify Permission
export async function verifyFolderPermission(fileHandle: any, readWrite = true): Promise<boolean> {
  if (!fileHandle) return false;
  const options: any = {};
  if (readWrite) {
    options.mode = 'readwrite';
  }
  try {
    if ((await fileHandle.queryPermission(options)) === 'granted') {
      return true;
    }
    if ((await fileHandle.requestPermission(options)) === 'granted') {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

// Initialize and restore previous handle
export async function initFileSystemFolderSync(
  onDataLoadedFromDisk?: (jsonString: string) => Promise<void>
): Promise<void> {
  currentState.isSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  
  if (!currentState.isSupported) {
    emitState();
    return;
  }

  try {
    const savedHandle = await getStoredHandleFromIdb();
    if (savedHandle) {
      activeDirHandle = savedHandle;
      currentState.isLinked = true;
      currentState.folderName = savedHandle.name || 'Pasta do PC';
      emitState();

      // Check if we already have permission, then try to load existing database
      const hasPerm = await verifyFolderPermission(savedHandle, false);
      if (hasPerm && onDataLoadedFromDisk) {
        const fileContent = await readDatabaseFileFromHandle(savedHandle);
        if (fileContent) {
          await onDataLoadedFromDisk(fileContent);
          currentState.lastLoadedAt = new Date().toISOString();
          emitState();
        }
      }
    }
  } catch (err: any) {
    console.warn('[FileSystem] Inicialização da pasta:', err);
  }
}

// Connect Folder (Prompt user to select folder on PC)
export async function selectAndLinkFolder(
  getCurrentBackupJson: () => string,
  onDataLoadedFromDisk?: (jsonString: string) => Promise<boolean>
): Promise<{ success: boolean; message: string; action: 'loaded' | 'saved' | 'none' }> {
  if (!('showDirectoryPicker' in window)) {
    return {
      success: false,
      message: 'Seu navegador não suporta a API de Pastas Locais do PC. Recomendamos o Google Chrome ou Microsoft Edge.',
      action: 'none',
    };
  }

  try {
    const dirHandle = await (window as any).showDirectoryPicker({
      id: 'argmgp_db_folder',
      mode: 'readwrite',
      startIn: 'documents',
    });

    const hasPerm = await verifyFolderPermission(dirHandle, true);
    if (!hasPerm) {
      return {
        success: false,
        message: 'Permissão de leitura/escrita na pasta selecionada não foi concedida.',
        action: 'none',
      };
    }

    activeDirHandle = dirHandle;
    await persistHandleToIdb(dirHandle);

    currentState.isLinked = true;
    currentState.folderName = dirHandle.name;
    currentState.error = null;
    emitState();

    // Check if ARGMGP_DATABASE.json already exists in the selected folder
    let existingFileContent: string | null = null;
    try {
      existingFileContent = await readDatabaseFileFromHandle(dirHandle);
    } catch {
      existingFileContent = null;
    }

    if (existingFileContent && existingFileContent.trim().length > 10) {
      // Prompt or load the existing data from folder
      if (onDataLoadedFromDisk) {
        const loadedOk = await onDataLoadedFromDisk(existingFileContent);
        if (loadedOk) {
          currentState.lastLoadedAt = new Date().toISOString();
          emitState();
          return {
            success: true,
            message: `Pasta "${dirHandle.name}" vinculada! Os dados existentes na pasta foram carregados com sucesso no app.`,
            action: 'loaded',
          };
        }
      }
    }

    // Otherwise, write current database state into the folder
    const currentJson = getCurrentBackupJson();
    await writeDatabaseFileToHandle(dirHandle, currentJson);
    currentState.lastSavedAt = new Date().toISOString();
    emitState();

    return {
      success: true,
      message: `Pasta "${dirHandle.name}" vinculada com sucesso! O arquivo ${MAIN_DB_FILE} foi salvo na pasta do seu computador.`,
      action: 'saved',
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { success: false, message: 'Seleção de pasta cancelada.', action: 'none' };
    }
    return {
      success: false,
      message: err?.message || 'Falha ao selecionar pasta do computador.',
      action: 'none',
    };
  }
}

// Read database file from directory handle
async function readDatabaseFileFromHandle(dirHandle: any): Promise<string | null> {
  try {
    const fileHandle = await dirHandle.getFileHandle(MAIN_DB_FILE, { create: false });
    const file = await fileHandle.getFile();
    return await file.text();
  } catch {
    return null;
  }
}

// Global sequential write mutex lock to guarantee atomic writes without race conditions
let writeLockPromise: Promise<void> = Promise.resolve();
let lastGetBackupJsonFn: (() => string) | null = null;

// Write database file to directory handle with atomic sequential mutex lock
async function writeDatabaseFileToHandle(dirHandle: any, jsonContent: string): Promise<void> {
  writeLockPromise = writeLockPromise.then(async () => {
    try {
      const fileHandle = await dirHandle.getFileHandle(MAIN_DB_FILE, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(jsonContent);
      await writable.close();

      // Also write a daily backup copy inside a 'backups_automaticos' subfolder
      try {
        const dateStr = new Date().toISOString().slice(0, 10);
        const backupDirHandle = await dirHandle.getDirectoryHandle('backups_automaticos', { create: true });
        const backupFileHandle = await backupDirHandle.getFileHandle(`ARGMGP_Backup_${dateStr}.json`, { create: true });
        const bWritable = await backupFileHandle.createWritable();
        await bWritable.write(jsonContent);
        await bWritable.close();
      } catch (backupErr) {
        console.warn('[FileSystem] Aviso ao criar cópia de backup na pasta:', backupErr);
      }
    } catch (writeErr) {
      console.error('[FileSystem] Erro crítico ao gravar arquivo no disco:', writeErr);
      throw writeErr;
    }
  });

  return writeLockPromise;
}

// Emergency flush helper if tab is closed or hidden while auto-save is debounced
if (typeof window !== 'undefined') {
  const flushPendingSave = () => {
    if (debounceTimer && lastGetBackupJsonFn && activeDirHandle && currentState.isAutoSaveActive) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
      try {
        const jsonContent = lastGetBackupJsonFn();
        writeDatabaseFileToHandle(activeDirHandle, jsonContent);
      } catch (e) {
        console.warn('[FileSystem Emergency Flush]:', e);
      }
    }
  };

  window.addEventListener('beforeunload', flushPendingSave);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushPendingSave();
    }
  });
}

// Manual Save to Folder
export async function saveCurrentDatabaseToFolder(jsonContent: string): Promise<{ success: boolean; message: string }> {
  if (!activeDirHandle) {
    return {
      success: false,
      message: 'Nenhuma pasta do computador está vinculada no momento.',
    };
  }

  const hasPerm = await verifyFolderPermission(activeDirHandle, true);
  if (!hasPerm) {
    return {
      success: false,
      message: 'Permissão de gravação na pasta expirou. Clique em "Revalidar Permissão" na pasta.',
    };
  }

  try {
    currentState.isWriting = true;
    emitState();

    await writeDatabaseFileToHandle(activeDirHandle, jsonContent);

    currentState.lastSavedAt = new Date().toISOString();
    currentState.error = null;
    currentState.isWriting = false;
    emitState();

    return {
      success: true,
      message: `Dados salvos com sucesso na pasta "${activeDirHandle.name}" (${MAIN_DB_FILE})!`,
    };
  } catch (err: any) {
    currentState.isWriting = false;
    currentState.error = err?.message || 'Erro de gravação';
    emitState();
    return {
      success: false,
      message: `Erro ao salvar arquivo na pasta: ${err?.message || 'Falha de I/O'}`,
    };
  }
}

// Manual Reload from Folder
export async function loadDatabaseFromLinkedFolder(
  onDataLoaded: (jsonString: string) => Promise<boolean>
): Promise<{ success: boolean; message: string }> {
  if (!activeDirHandle) {
    return {
      success: false,
      message: 'Nenhuma pasta do computador está vinculada.',
    };
  }

  const hasPerm = await verifyFolderPermission(activeDirHandle, false);
  if (!hasPerm) {
    return {
      success: false,
      message: 'Permissão de leitura na pasta necessária.',
    };
  }

  try {
    const fileContent = await readDatabaseFileFromHandle(activeDirHandle);
    if (!fileContent) {
      return {
        success: false,
        message: `Arquivo ${MAIN_DB_FILE} não encontrado na pasta "${activeDirHandle.name}".`,
      };
    }

    const success = await onDataLoaded(fileContent);
    if (success) {
      currentState.lastLoadedAt = new Date().toISOString();
      emitState();
      return {
        success: true,
        message: `Dados da pasta "${activeDirHandle.name}" sincronizados com sucesso!`,
      };
    }
    return {
      success: false,
      message: 'Falha ao processar a estrutura de dados do arquivo da pasta.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erro ao ler pasta: ${err?.message || 'Erro desconhecido'}`,
    };
  }
}

// Disconnect / Unlink Folder
export async function unlinkLocalFolder(): Promise<void> {
  activeDirHandle = null;
  await clearStoredHandleFromIdb();
  currentState.isLinked = false;
  currentState.folderName = null;
  currentState.error = null;
  emitState();
}

// Convert Base64/DataURL to Blob for direct disk writing
function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// Save individual photos directly to the fotos_qaqc subfolder on PC disk
export async function savePhotosToDiskFolder(
  photos: Array<{
    id: string;
    sampleCode?: string;
    sampleType?: string;
    arCode?: string;
    holeName?: string;
    capturedAt?: string;
    dataUrl?: string;
    photoUrl?: string;
    originalBlob?: Blob;
    fileName?: string;
    mimeType?: string;
  }>,
  onProgress?: (saved: number, total: number, currentName: string) => void
): Promise<{ success: boolean; savedCount: number; message: string }> {
  if (!activeDirHandle) {
    return {
      success: false,
      savedCount: 0,
      message: 'Nenhuma pasta do computador está vinculada.',
    };
  }

  const hasPerm = await verifyFolderPermission(activeDirHandle, true);
  if (!hasPerm) {
    return {
      success: false,
      savedCount: 0,
      message: 'Permissão de gravação na pasta necessária.',
    };
  }

  try {
    const photosDirHandle = await activeDirHandle.getDirectoryHandle('fotos_qaqc', { create: true });
    let saved = 0;

    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      const data = p.dataUrl || (p.photoUrl?.startsWith('data:') ? p.photoUrl : null);

      // Use exact original bit-a-bit Blob if present, or reconstruct from lossless dataUrl
      let blobToWrite: Blob | null = p.originalBlob || null;
      if (!blobToWrite && data) {
        blobToWrite = dataUrlToBlob(data);
      }
      if (!blobToWrite) continue;

      // Preserve original file extension if available
      let ext = 'jpg';
      if (p.fileName && p.fileName.includes('.')) {
        ext = p.fileName.split('.').pop()?.toLowerCase() || 'jpg';
      } else if (p.mimeType) {
        ext = p.mimeType.split('/')[1]?.toLowerCase().replace('jpeg', 'jpg') || 'jpg';
      }

      const cleanCode = (p.sampleCode || 'SEM_CODIGO').replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanHole = (p.holeName || p.arCode || 'FURO').replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanType = (p.sampleType || 'QAQC').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${cleanCode}_${cleanHole}_${cleanType}_${p.id.slice(-6)}.${ext}`;

      onProgress?.(saved, photos.length, filename);

      try {
        const fileHandle = await photosDirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blobToWrite);
        await writable.close();
        saved++;
      } catch (fErr) {
        console.warn('[Disk Photo Write] Erro ao gravar foto individual:', filename, fErr);
      }
    }

    return {
      success: true,
      savedCount: saved,
      message: `${saved} foto(s) salvas com sucesso na subpasta "fotos_qaqc/" dentro de "${activeDirHandle.name}"!`,
    };
  } catch (err: any) {
    return {
      success: false,
      savedCount: 0,
      message: `Erro ao gravar fotos no disco: ${err?.message || 'Falha de I/O'}`,
    };
  }
}

// Debounced Auto-Save to Folder triggered on database change
export function triggerAutoSaveToFolder(getCurrentBackupJson: () => string): void {
  lastGetBackupJsonFn = getCurrentBackupJson;
  if (!activeDirHandle || !currentState.isAutoSaveActive) return;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(async () => {
    try {
      const hasPerm = await verifyFolderPermission(activeDirHandle, true);
      if (hasPerm) {
        currentState.isWriting = true;
        emitState();
        const jsonContent = getCurrentBackupJson();
        await writeDatabaseFileToHandle(activeDirHandle, jsonContent);
        currentState.lastSavedAt = new Date().toISOString();
        currentState.isWriting = false;
        emitState();
      }
    } catch (err: any) {
      currentState.isWriting = false;
      console.warn('[FileSystem AutoSave] Erro ao salvar na pasta:', err);
    }
  }, 1200);
}

// Subscribe to state changes
export function subscribeFolderSync(callback: (state: FolderSyncState) => void): () => void {
  callback({ ...currentState });
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}
