import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { User, DrillHole, ProductionLog, SampleShipmentAR, OreasStockEntry, QAQCSamplePhoto } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  localDb,
  MASTER_USER,
  INITIAL_USERS,
  INITIAL_HOLES,
  INITIAL_ARS,
  INITIAL_OREAS_STOCK,
  INITIAL_LOGS,
} from '../utils/localDb';

export {
  MASTER_USER,
  INITIAL_USERS,
  INITIAL_HOLES,
  INITIAL_ARS,
  INITIAL_OREAS_STOCK,
  INITIAL_LOGS,
};

// Initialize Firebase App safely
let app: any = null;
let firestoreDb: any = null;
let firebaseStorage: any = null;

try {
  if (firebaseConfig && firebaseConfig.projectId) {
    app = initializeApp(firebaseConfig);
    try {
      firestoreDb = initializeFirestore(
        app,
        {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        },
        firebaseConfig.firestoreDatabaseId || undefined
      );
    } catch {
      firestoreDb = firebaseConfig.firestoreDatabaseId
        ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
        : getFirestore(app);
    }
    firebaseStorage = getStorage(app);
  }
} catch (e) {
  console.warn('[Local Mode] Firebase não inicializado ou operando 100% em modo offline local:', e);
}

export const db = firestoreDb;
export const storage = firebaseStorage;

// ============================================================================
// CACHE ACCESSORS (Instant Local Access)
// ============================================================================
export function getLocalCachedUsers(): User[] {
  return localDb.getUsers();
}
export function setLocalCachedUsers(users: User[]): void {
  users.forEach((u) => localDb.saveUser(u));
}
export function updateUserInLocalCache(user: User): void {
  localDb.saveUser(user);
}
export function deleteUserFromLocalCache(userId: string): void {
  localDb.deleteUser(userId);
}

export function getLocalCachedHoles(): DrillHole[] {
  return localDb.getHoles();
}
export function setLocalCachedHoles(holes: DrillHole[]): void {
  holes.forEach((h) => localDb.saveHole(h));
}

export function getLocalCachedLogs(): ProductionLog[] {
  return localDb.getLogs();
}
export function setLocalCachedLogs(logs: ProductionLog[]): void {
  logs.forEach((l) => localDb.saveLog(l));
}

export function getLocalCachedARs(): SampleShipmentAR[] {
  return localDb.getARs();
}
export function setLocalCachedARs(ars: SampleShipmentAR[]): void {
  ars.forEach((a) => localDb.saveAR(a));
}

export function getLocalCachedOreasStock(): OreasStockEntry[] {
  return localDb.getOreasStock();
}
export function setLocalCachedOreasStock(entries: OreasStockEntry[]): void {
  entries.forEach((e) => localDb.saveOreasStockEntry(e));
}

export function getLocalCachedPhotos(): QAQCSamplePhoto[] {
  return localDb.getPhotos();
}
export function setLocalCachedPhotos(photos: QAQCSamplePhoto[]): void {
  photos.forEach((p) => localDb.savePhoto(p));
}

// ============================================================================
// REACTIVE SUBSCRIPTION EXPORTS (100% Local-First + Firestore Sync)
// ============================================================================
export function subscribeUsers(onUpdate: (users: User[]) => void): () => void {
  const unsubLocal = localDb.subscribeUsers(onUpdate);

  let unsubFirestore: (() => void) | null = null;
  if (db) {
    try {
      unsubFirestore = onSnapshot(
        collection(db, 'users'),
        (snapshot) => {
          if (!snapshot.empty) {
            snapshot.forEach((docSnap) => {
              const u = { id: docSnap.id, ...docSnap.data() } as User;
              localDb.saveUser(u);
            });
          }
        },
        () => {
          // Silent local fallback
        }
      );
    } catch {
      // ignore
    }
  }

  return () => {
    unsubLocal();
    if (unsubFirestore) unsubFirestore();
  };
}

export function subscribeHoles(onUpdate: (holes: DrillHole[]) => void): () => void {
  const unsubLocal = localDb.subscribeHoles(onUpdate);

  let unsubFirestore: (() => void) | null = null;
  if (db) {
    try {
      unsubFirestore = onSnapshot(
        collection(db, 'holes'),
        (snapshot) => {
          if (!snapshot.empty) {
            snapshot.forEach((docSnap) => {
              const h = { id: docSnap.id, ...docSnap.data() } as DrillHole;
              localDb.saveHole(h);
            });
          }
        },
        () => {
          // Silent local fallback
        }
      );
    } catch {
      // ignore
    }
  }

  return () => {
    unsubLocal();
    if (unsubFirestore) unsubFirestore();
  };
}

export function subscribeARs(onUpdate: (ars: SampleShipmentAR[]) => void): () => void {
  const unsubLocal = localDb.subscribeARs(onUpdate);

  let unsubFirestore: (() => void) | null = null;
  if (db) {
    try {
      unsubFirestore = onSnapshot(
        collection(db, 'ars'),
        (snapshot) => {
          if (!snapshot.empty) {
            snapshot.forEach((docSnap) => {
              const a = { id: docSnap.id, ...docSnap.data() } as SampleShipmentAR;
              localDb.saveAR(a);
            });
          }
        },
        () => {
          // Silent local fallback
        }
      );
    } catch {
      // ignore
    }
  }

  return () => {
    unsubLocal();
    if (unsubFirestore) unsubFirestore();
  };
}

export function subscribeOreasStock(onUpdate: (stock: OreasStockEntry[]) => void): () => void {
  const unsubLocal = localDb.subscribeOreasStock(onUpdate);

  let unsubFirestore: (() => void) | null = null;
  if (db) {
    try {
      unsubFirestore = onSnapshot(
        collection(db, 'oreasStock'),
        (snapshot) => {
          if (!snapshot.empty) {
            snapshot.forEach((docSnap) => {
              const s = { id: docSnap.id, ...docSnap.data() } as OreasStockEntry;
              localDb.saveOreasStockEntry(s);
            });
          }
        },
        () => {
          // Silent local fallback
        }
      );
    } catch {
      // ignore
    }
  }

  return () => {
    unsubLocal();
    if (unsubFirestore) unsubFirestore();
  };
}

export function subscribeQAQCPhotos(onUpdate: (photos: QAQCSamplePhoto[]) => void): () => void {
  const unsubLocal = localDb.subscribePhotos(onUpdate);

  let unsubFirestore: (() => void) | null = null;
  if (db) {
    try {
      unsubFirestore = onSnapshot(
        collection(db, 'qaqc_photos'),
        (snapshot) => {
          if (!snapshot.empty) {
            snapshot.forEach((docSnap) => {
              const p = { id: docSnap.id, ...docSnap.data() } as QAQCSamplePhoto;
              localDb.savePhoto(p);
            });
          }
        },
        () => {
          // Silent local fallback
        }
      );
    } catch {
      // ignore
    }
  }

  return () => {
    unsubLocal();
    if (unsubFirestore) unsubFirestore();
  };
}

export function subscribeLogs(onUpdate: (logs: ProductionLog[]) => void): () => void {
  const unsubLocal = localDb.subscribeLogs(onUpdate);

  let unsubFirestore: (() => void) | null = null;
  if (db) {
    try {
      unsubFirestore = onSnapshot(
        collection(db, 'logs'),
        (snapshot) => {
          if (!snapshot.empty) {
            snapshot.forEach((docSnap) => {
              const l = { id: docSnap.id, ...docSnap.data() } as ProductionLog;
              localDb.saveLog(l);
            });
          }
        },
        () => {
          // Silent local fallback
        }
      );
    } catch {
      // ignore
    }
  }

  return () => {
    unsubLocal();
    if (unsubFirestore) unsubFirestore();
  };
}

// Helper to recursively strip undefined properties before sending to Firestore
function cleanData<T extends Record<string, any>>(data: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        cleaned[key] = value.map((item) =>
          typeof item === 'object' && item !== null ? cleanData(item) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        cleaned[key] = cleanData(value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
}

// ============================================================================
// DATABASE CRUD WRITE OPERATIONS (Instant Local Persistence)
// ============================================================================

export async function saveUserToDb(user: User): Promise<void> {
  // 1. Immediately persist locally
  localDb.saveUser(user);

  // 2. Silent background sync
  if (db) {
    try {
      await setDoc(doc(db, 'users', user.id), cleanData(user), { merge: true });
    } catch (e) {
      console.warn('[Local Mode] Usuário salvo no armazenamento local:', e);
    }
  }
}

export async function deleteUserFromDb(userId: string): Promise<void> {
  localDb.deleteUser(userId);
  if (db) {
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (e) {
      console.warn('[Local Mode] Usuário excluído localmente:', e);
    }
  }
}

export async function saveHoleToDb(hole: DrillHole): Promise<void> {
  localDb.saveHole(hole);
  if (db) {
    try {
      await setDoc(doc(db, 'holes', hole.id), cleanData(hole));
    } catch (e) {
      console.warn('[Local Mode] Furo salvo localmente:', e);
    }
  }
}

export async function deleteHoleFromDb(holeId: string, associatedLogIds: string[] = [], associatedArIds: string[] = []): Promise<void> {
  localDb.deleteHole(holeId, associatedLogIds, associatedArIds);
  if (db) {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'holes', holeId));
      for (const logId of associatedLogIds) {
        batch.delete(doc(db, 'logs', logId));
      }
      for (const arId of associatedArIds) {
        batch.delete(doc(db, 'ars', arId));
      }
      await batch.commit();
    } catch (e) {
      console.warn('[Local Mode] Furo excluído localmente:', e);
    }
  }
}

export async function saveLogToDb(log: ProductionLog): Promise<void> {
  localDb.saveLog(log);
  if (db) {
    try {
      await setDoc(doc(db, 'logs', log.id), cleanData(log));
    } catch (e) {
      console.warn('[Local Mode] Log salvo localmente:', e);
    }
  }
}

export async function saveARToDb(ar: SampleShipmentAR): Promise<void> {
  localDb.saveAR(ar);
  if (db) {
    try {
      await setDoc(doc(db, 'ars', ar.id), cleanData(ar));
    } catch (e) {
      console.warn('[Local Mode] AR salva localmente:', e);
    }
  }
}

export async function deleteARFromDb(arId: string): Promise<void> {
  localDb.deleteAR(arId);
  if (db) {
    try {
      await deleteDoc(doc(db, 'ars', arId));
    } catch (e) {
      console.warn('[Local Mode] AR excluída localmente:', e);
    }
  }
}

export async function saveOreasStockEntryToDb(entry: OreasStockEntry): Promise<void> {
  localDb.saveOreasStockEntry(entry);
  if (db) {
    try {
      await setDoc(doc(db, 'oreasStock', entry.id), cleanData(entry));
    } catch (e) {
      console.warn('[Local Mode] Estoque salvo localmente:', e);
    }
  }
}

export async function deleteOreasStockEntryFromDb(entryId: string): Promise<void> {
  localDb.deleteOreasStockEntry(entryId);
  if (db) {
    try {
      await deleteDoc(doc(db, 'oreasStock', entryId));
    } catch (e) {
      console.warn('[Local Mode] Entrada de estoque excluída localmente:', e);
    }
  }
}

export async function deleteOreasCodeFromDb(code: string, entries?: OreasStockEntry[]): Promise<number> {
  const count = localDb.deleteOreasCode(code);
  if (db && entries) {
    try {
      const normCode = (code || '').trim().toUpperCase();
      const targetEntries = entries.filter((e) => (e.code || '').trim().toUpperCase() === normCode);
      if (targetEntries.length > 0) {
        const batch = writeBatch(db);
        for (const entry of targetEntries) {
          batch.delete(doc(db, 'oreasStock', entry.id));
        }
        await batch.commit();
      }
    } catch (e) {
      console.warn('[Local Mode] Código de estoque excluído localmente:', e);
    }
  }
  return count;
}

// ============================================================================
// QA/QC PHOTOS (100% Offline Compression & Local Storage)
// ============================================================================

/**
 * Generates a lightweight thumbnail for UI preview performance only.
 * The original image is NEVER modified, compressed or resized.
 */
export function generatePhotoThumbnail(
  file: Blob,
  maxDimension = 480,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve('');
    };
    img.src = objectUrl;
  });
}

// Deprecated alias for backwards-compatibility
export const compressImageForStorage = async (file: File) => {
  const dataUrl = await fileToDataUrl(file);
  return { compressedBlob: file, dataUrl };
};

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export async function uploadQAQCSamplePhoto(
  photoData: Omit<QAQCSamplePhoto, 'id' | 'photoUrl'>,
  file: File,
  onProgress?: (percent: number, statusText: string) => void
): Promise<QAQCSamplePhoto> {
  const photoId = 'photo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const originalSizeBytes = file.size;

  onProgress?.(15, `Lendo arquivo original (${(originalSizeBytes / (1024 * 1024)).toFixed(1)} MB) sem compressão...`);

  // 1. Read exact lossless bit-a-bit Data URL
  const originalDataUrl = await fileToDataUrl(file);

  // 2. Fast Object URL for zero-overhead local rendering
  const objectUrl = URL.createObjectURL(file);

  onProgress?.(50, 'Gerando miniatura para interface...');
  // 3. Generate thumbnail strictly for UI performance
  let thumbnailUrl = '';
  try {
    thumbnailUrl = await generatePhotoThumbnail(file, 480, 0.75);
  } catch (tErr) {
    console.warn('[Photo] Falha ao gerar thumbnail de preview:', tErr);
    thumbnailUrl = originalDataUrl;
  }

  onProgress?.(80, 'Gravando arquivo original bit-a-bit no banco local seguro...');

  const newPhoto: QAQCSamplePhoto = {
    ...photoData,
    id: photoId,
    photoUrl: objectUrl,
    dataUrl: originalDataUrl,
    originalBlob: file, // 100% exact raw original File / Blob (intact bit-a-bit, ~15MB)
    thumbnailUrl: thumbnailUrl || objectUrl,
    fileName: file.name,
    fileSizeBytes: originalSizeBytes,
    mimeType: file.type || 'image/jpeg',
  };

  // 4. Save lossless object and raw Blob directly to IndexedDB & LocalDatabase
  await localDb.savePhoto(newPhoto);

  // 5. Silent background storage attempt if connected (also with raw lossless file!)
  if (storage && db) {
    try {
      const sanitizeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storageRef = ref(storage, `qaqc_photos/${photoData.arId}/${photoId}_${sanitizeName}`);
      const task = uploadBytesResumable(storageRef, file);

      task.then(async (snap) => {
        const cloudUrl = await getDownloadURL(snap.ref);
        const updatedPhoto = { ...newPhoto, photoUrl: cloudUrl };
        await setDoc(doc(db, 'qaqc_photos', photoId), cleanData(updatedPhoto));
      }).catch(() => {
        // silent fallback to local
      });
    } catch {
      // silent fallback to local
    }
  }

  onProgress?.(100, `Foto original salva intacta (${(originalSizeBytes / (1024 * 1024)).toFixed(2)} MB)!`);
  return newPhoto;
}

export async function deleteQAQCSamplePhotoFromDb(photo: QAQCSamplePhoto): Promise<void> {
  await localDb.deletePhoto(photo.id);

  if (storage && photo.photoUrl && photo.photoUrl.includes('firebasestorage')) {
    try {
      const sanitizeName = (photo.fileName || 'photo.jpg').replace(/[^a-zA-Z0-9.-]/g, '_');
      const storageRef = ref(storage, `qaqc_photos/${photo.arId}/${photo.id}_${sanitizeName}`);
      await deleteObject(storageRef);
    } catch {
      // ignore
    }
  }

  if (db) {
    try {
      await deleteDoc(doc(db, 'qaqc_photos', photo.id));
    } catch {
      // ignore
    }
  }
}

export async function deleteExpiredQAQCPhotosFromDb(photos: QAQCSamplePhoto[], daysRetention = 1095): Promise<number> {
  return await localDb.deleteExpiredPhotos(daysRetention);
}

// ============================================================================
// RESET & BACKUP MANAGEMENT
// ============================================================================

export async function resetDatabaseToDemoData(): Promise<void> {
  await localDb.resetToDemo();

  if (db) {
    try {
      const batch = writeBatch(db);
      const userSnaps = await getDocs(collection(db, 'users'));
      userSnaps.forEach((d) => batch.delete(d.ref));

      const holeSnaps = await getDocs(collection(db, 'holes'));
      holeSnaps.forEach((d) => batch.delete(d.ref));

      const logSnaps = await getDocs(collection(db, 'logs'));
      logSnaps.forEach((d) => batch.delete(d.ref));

      const arSnaps = await getDocs(collection(db, 'ars'));
      arSnaps.forEach((d) => batch.delete(d.ref));

      const stockSnaps = await getDocs(collection(db, 'oreasStock'));
      stockSnaps.forEach((d) => batch.delete(d.ref));

      for (const user of INITIAL_USERS) batch.set(doc(db, 'users', user.id), user);
      for (const hole of INITIAL_HOLES) batch.set(doc(db, 'holes', hole.id), hole);
      for (const log of INITIAL_LOGS) batch.set(doc(db, 'logs', log.id), log);
      for (const ar of INITIAL_ARS) batch.set(doc(db, 'ars', ar.id), ar);
      for (const entry of INITIAL_OREAS_STOCK) batch.set(doc(db, 'oreasStock', entry.id), entry);

      await batch.commit();
    } catch (e) {
      console.warn('[Local Mode] Reset efetuado localmente:', e);
    }
  }
}

export async function clearAllHolesAndShipmentsLocal(): Promise<void> {
  await localDb.clearAllHolesAndShipments();

  if (db) {
    try {
      const batch = writeBatch(db);
      const holeSnaps = await getDocs(collection(db, 'holes'));
      holeSnaps.forEach((d) => batch.delete(d.ref));

      const logSnaps = await getDocs(collection(db, 'logs'));
      logSnaps.forEach((d) => batch.delete(d.ref));

      const arSnaps = await getDocs(collection(db, 'ars'));
      arSnaps.forEach((d) => batch.delete(d.ref));

      await batch.commit();
    } catch (e) {
      console.warn('[Local Mode] Limpeza efetuada localmente:', e);
    }
  }
}

export function exportLocalBackupJson(): string {
  return localDb.exportBackup();
}

export async function importLocalBackupJson(jsonString: string): Promise<{ success: boolean; message: string; counts: Record<string, number> }> {
  return await localDb.importBackup(jsonString);
}
