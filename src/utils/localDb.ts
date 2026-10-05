import { User, DrillHole, ProductionLog, SampleShipmentAR, OreasStockEntry, QAQCSamplePhoto } from '../types';
import { triggerAutoSaveToFolder } from './fileSystemFolderSync';

// Constants for Local Storage Keys
export const STORAGE_KEYS = {
  USERS: 'argmgp_users_local_v5',
  HOLES: 'argmgp_holes_local_v5',
  ARS: 'argmgp_ars_local_v5',
  OREAS_STOCK: 'argmgp_oreas_stock_local_v5',
  PHOTOS: 'argmgp_photos_local_v5',
  LOGS: 'argmgp_logs_local_v5',
  ACTIVE_USER: 'argmgp_active_user_v5',
  THEME: 'argmgp_theme',
  AUTH: 'argmgp_authenticated',
  DELETED_HOLES: 'argmgp_deleted_hole_ids_v1',
  DELETED_ARS: 'argmgp_deleted_ar_ids_v1',
};

// Cross-tab synchronization channel
const BROADCAST_CHANNEL_NAME = 'argmgp_tabs_sync_v1';
let syncChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    syncChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }
} catch {
  syncChannel = null;
}

// Initial Seed Data
export const MASTER_USER: User = {
  id: 'usr_master_rafael',
  name: 'Rafael Leite',
  login: 'llk.rafael',
  email: 'llk.rafael@gmail.com',
  password: 'yasmin2015',
  role: 'Coordenador de Galpão',
  isMaster: true,
  badgeColor: 'bg-amber-500',
  createdAt: '2026-01-01T00:00:00.000Z',
};

export const INITIAL_USERS: User[] = [MASTER_USER];

// Empty Clean State for Holes, ARs and Logs
export const INITIAL_HOLES: DrillHole[] = [];

export const INITIAL_ARS: SampleShipmentAR[] = [];

export const INITIAL_OREAS_STOCK: OreasStockEntry[] = [
  {
    id: 'os_1',
    code: '250c',
    quantity: 15,
    date: '2026-07-01',
    lotOrNotes: 'Recebimento Inicial',
    createdById: 'usr_master_rafael',
    createdByName: 'Rafael Leite',
    createdAt: '2026-07-01T10:00:00.000Z',
  },
  {
    id: 'os_2',
    code: '250c',
    quantity: 20,
    date: '2026-07-05',
    lotOrNotes: 'Reabastecimento',
    createdById: 'usr_master_rafael',
    createdByName: 'Rafael Leite',
    createdAt: '2026-07-05T10:00:00.000Z',
  },
  {
    id: 'os_3',
    code: '251c',
    quantity: 10,
    date: '2026-07-10',
    lotOrNotes: 'Entrada de galpão',
    createdById: 'usr_master_rafael',
    createdByName: 'Rafael Leite',
    createdAt: '2026-07-10T10:00:00.000Z',
  },
  {
    id: 'os_4',
    code: '626',
    quantity: 8,
    date: '2026-07-10',
    lotOrNotes: 'Lote especial 626',
    createdById: 'usr_master_rafael',
    createdByName: 'Rafael Leite',
    createdAt: '2026-07-10T10:00:00.000Z',
  },
  {
    id: 'os_5',
    code: '230b',
    quantity: 12,
    date: '2026-07-15',
    lotOrNotes: 'Lote 230b',
    createdById: 'usr_master_rafael',
    createdByName: 'Rafael Leite',
    createdAt: '2026-07-15T10:00:00.000Z',
  },
  {
    id: 'os_6',
    code: '231b',
    quantity: 10,
    date: '2026-07-15',
    lotOrNotes: 'Lote 231b',
    createdById: 'usr_master_rafael',
    createdByName: 'Rafael Leite',
    createdAt: '2026-07-15T10:00:00.000Z',
  },
  {
    id: 'os_7',
    code: '235b',
    quantity: 12,
    date: '2026-07-15',
    lotOrNotes: 'Lote 235b',
    createdById: 'usr_master_rafael',
    createdByName: 'Rafael Leite',
    createdAt: '2026-07-15T10:00:00.000Z',
  },
];

export const INITIAL_LOGS: ProductionLog[] = [];

// Helper to read and write LocalStorage safely
function getStorageItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[LocalDB] Aviso ao persistir no localStorage (${key}):`, err);
  }
}

// IndexedDB Helper for High-Capacity Local Storage (Photos & Large Blobs)
const IDB_NAME = 'argmgp_local_indexeddb_v2';
const IDB_STORE_PHOTOS = 'qaqc_photos_store';
const IDB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getIndexedDb(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB not supported'));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE_PHOTOS)) {
          db.createObjectStore(IDB_STORE_PHOTOS, { keyPath: 'id' });
        }
      };
    });
  }
  return dbPromise;
}

export async function idbSavePhoto(photo: QAQCSamplePhoto): Promise<void> {
  try {
    const db = await getIndexedDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_PHOTOS, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(IDB_STORE_PHOTOS).put(photo);
    });
  } catch (err) {
    console.warn('[IndexedDB] Salvo em fallback LocalStorage:', err);
  }
}

export async function idbDeletePhoto(photoId: string): Promise<void> {
  try {
    const db = await getIndexedDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_PHOTOS, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(IDB_STORE_PHOTOS).delete(photoId);
    });
  } catch (err) {
    console.warn('[IndexedDB] Erro ao deletar foto do IndexedDB:', err);
  }
}

export async function idbGetAllPhotos(): Promise<QAQCSamplePhoto[]> {
  try {
    const db = await getIndexedDb();
    return await new Promise<QAQCSamplePhoto[]>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_PHOTOS, 'readonly');
      const req = tx.objectStore(IDB_STORE_PHOTOS).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function idbClearPhotos(): Promise<void> {
  try {
    const db = await getIndexedDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_PHOTOS, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(IDB_STORE_PHOTOS).clear();
    });
  } catch (err) {
    console.warn('[IndexedDB] Erro ao limpar fotos:', err);
  }
}

// Reactive In-Memory & Local Storage State Hub
class LocalDatabaseHub {
  private users: User[] = [];
  private holes: DrillHole[] = [];
  private ars: SampleShipmentAR[] = [];
  private oreasStock: OreasStockEntry[] = [];
  private photos: QAQCSamplePhoto[] = [];
  private logs: ProductionLog[] = [];

  private userSubscribers = new Set<(users: User[]) => void>();
  private holeSubscribers = new Set<(holes: DrillHole[]) => void>();
  private arSubscribers = new Set<(ars: SampleShipmentAR[]) => void>();
  private oreasStockSubscribers = new Set<(stock: OreasStockEntry[]) => void>();
  private photoSubscribers = new Set<(photos: QAQCSamplePhoto[]) => void>();
  private logSubscribers = new Set<(logs: ProductionLog[]) => void>();

  constructor() {
    this.init();
  }

  public init() {
    // Clear legacy storage keys if present to ensure completely fresh clean state
    try {
      localStorage.removeItem('argmgp_holes_local_v4');
      localStorage.removeItem('argmgp_ars_local_v4');
      localStorage.removeItem('argmgp_logs_local_v4');
      localStorage.removeItem('argmgp_photos_local_v4');
      localStorage.removeItem('argmgp_holes_v3');
      localStorage.removeItem('argmgp_ars_v3');
      localStorage.removeItem('argmgp_logs_v3');
    } catch {
      // ignore
    }

    // 1. Load users
    const loadedUsers = getStorageItem<User[]>(STORAGE_KEYS.USERS, []);
    if (loadedUsers.length > 0) {
      // Ensure master user exists
      const hasMaster = loadedUsers.some((u) => u.id === MASTER_USER.id || u.isMaster);
      this.users = hasMaster ? loadedUsers : [MASTER_USER, ...loadedUsers];
    } else {
      this.users = [...INITIAL_USERS];
      setStorageItem(STORAGE_KEYS.USERS, this.users);
    }

    // 2. Load holes
    const loadedHoles = getStorageItem<DrillHole[]>(STORAGE_KEYS.HOLES, []);
    this.holes = loadedHoles;
    setStorageItem(STORAGE_KEYS.HOLES, this.holes);

    // 3. Load ARs
    const loadedARs = getStorageItem<SampleShipmentAR[]>(STORAGE_KEYS.ARS, []);
    this.ars = loadedARs;
    setStorageItem(STORAGE_KEYS.ARS, this.ars);

    // 4. Load OREAS Stock
    const loadedStock = getStorageItem<OreasStockEntry[]>(STORAGE_KEYS.OREAS_STOCK, []);
    this.oreasStock = loadedStock.length > 0 ? loadedStock : [...INITIAL_OREAS_STOCK];
    if (loadedStock.length === 0) setStorageItem(STORAGE_KEYS.OREAS_STOCK, this.oreasStock);

    // 5. Load Logs
    const loadedLogs = getStorageItem<ProductionLog[]>(STORAGE_KEYS.LOGS, []);
    this.logs = loadedLogs;
    setStorageItem(STORAGE_KEYS.LOGS, this.logs);

    // 6. Load Photos from localStorage first, then merge with IndexedDB asynchronously
    this.photos = getStorageItem<QAQCSamplePhoto[]>(STORAGE_KEYS.PHOTOS, []);
    this.loadPhotosFromIndexedDb();

    // 7. Setup Cross-Tab Realtime Synchronization (BroadcastChannel & Storage Events)
    if (syncChannel) {
      syncChannel.onmessage = (event) => {
        if (event.data?.type === 'SYNC_ENTITY' && event.data.entity) {
          this.handleExternalSync(event.data.entity);
        }
      };
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key && Object.values(STORAGE_KEYS).includes(event.key)) {
          this.handleStorageEvent(event.key);
        }
      });
    }
  }

  // Tombstone & Cross-Tab Helpers
  private recordDeletedHole(holeId: string) {
    const deleted = new Set(getStorageItem<string[]>(STORAGE_KEYS.DELETED_HOLES, []));
    deleted.add(holeId);
    setStorageItem(STORAGE_KEYS.DELETED_HOLES, Array.from(deleted));
  }

  private clearDeletedHole(holeId: string) {
    const deleted = new Set(getStorageItem<string[]>(STORAGE_KEYS.DELETED_HOLES, []));
    if (deleted.has(holeId)) {
      deleted.delete(holeId);
      setStorageItem(STORAGE_KEYS.DELETED_HOLES, Array.from(deleted));
    }
  }

  private recordDeletedAR(arId: string) {
    const deleted = new Set(getStorageItem<string[]>(STORAGE_KEYS.DELETED_ARS, []));
    deleted.add(arId);
    setStorageItem(STORAGE_KEYS.DELETED_ARS, Array.from(deleted));
  }

  private clearDeletedAR(arId: string) {
    const deleted = new Set(getStorageItem<string[]>(STORAGE_KEYS.DELETED_ARS, []));
    if (deleted.has(arId)) {
      deleted.delete(arId);
      setStorageItem(STORAGE_KEYS.DELETED_ARS, Array.from(deleted));
    }
  }

  private broadcastSync(entity: string) {
    if (syncChannel) {
      try {
        syncChannel.postMessage({ type: 'SYNC_ENTITY', entity, timestamp: Date.now() });
      } catch {
        // ignore
      }
    }
  }

  private handleStorageEvent(key: string) {
    if (key === STORAGE_KEYS.HOLES) this.handleExternalSync('holes');
    else if (key === STORAGE_KEYS.ARS) this.handleExternalSync('ars');
    else if (key === STORAGE_KEYS.LOGS) this.handleExternalSync('logs');
    else if (key === STORAGE_KEYS.USERS) this.handleExternalSync('users');
    else if (key === STORAGE_KEYS.OREAS_STOCK) this.handleExternalSync('oreasStock');
    else if (key === STORAGE_KEYS.PHOTOS) this.handleExternalSync('photos');
  }

  private handleExternalSync(entity: string) {
    if (entity === 'holes') {
      const updated = getStorageItem<DrillHole[]>(STORAGE_KEYS.HOLES, []);
      this.holes = updated;
      const data = [...this.holes];
      this.holeSubscribers.forEach((cb) => cb(data));
    } else if (entity === 'ars') {
      const updated = getStorageItem<SampleShipmentAR[]>(STORAGE_KEYS.ARS, []);
      this.ars = updated;
      const data = [...this.ars];
      this.arSubscribers.forEach((cb) => cb(data));
    } else if (entity === 'logs') {
      const updated = getStorageItem<ProductionLog[]>(STORAGE_KEYS.LOGS, []);
      this.logs = updated;
      const data = [...this.logs];
      this.logSubscribers.forEach((cb) => cb(data));
    } else if (entity === 'users') {
      const updated = getStorageItem<User[]>(STORAGE_KEYS.USERS, []);
      this.users = updated;
      const data = [...this.users];
      this.userSubscribers.forEach((cb) => cb(data));
    } else if (entity === 'oreasStock') {
      const updated = getStorageItem<OreasStockEntry[]>(STORAGE_KEYS.OREAS_STOCK, []);
      this.oreasStock = updated;
      const data = [...this.oreasStock];
      this.oreasStockSubscribers.forEach((cb) => cb(data));
    } else if (entity === 'photos') {
      const updated = getStorageItem<QAQCSamplePhoto[]>(STORAGE_KEYS.PHOTOS, []);
      this.photos = updated;
      const data = [...this.photos];
      this.photoSubscribers.forEach((cb) => cb(data));
    }
  }

  private async loadPhotosFromIndexedDb() {
    try {
      const idbPhotos = await idbGetAllPhotos();
      if (idbPhotos && idbPhotos.length > 0) {
        // Merge without duplicates
        const map = new Map<string, QAQCSamplePhoto>();
        this.photos.forEach((p) => map.set(p.id, p));
        idbPhotos.forEach((p) => map.set(p.id, p));
        this.photos = Array.from(map.values()).sort(
          (a, b) => new Date(b.capturedAt || 0).getTime() - new Date(a.capturedAt || 0).getTime()
        );
        this.emitPhotos();
      }
    } catch {
      // ignore
    }
  }

  // Emitters with Broadcast Notification
  private emitUsers() {
    setStorageItem(STORAGE_KEYS.USERS, this.users);
    const data = [...this.users];
    this.userSubscribers.forEach((cb) => cb(data));
    this.broadcastSync('users');
    triggerAutoSaveToFolder(() => this.exportBackup());
  }

  private emitHoles() {
    setStorageItem(STORAGE_KEYS.HOLES, this.holes);
    const data = [...this.holes];
    this.holeSubscribers.forEach((cb) => cb(data));
    this.broadcastSync('holes');
    triggerAutoSaveToFolder(() => this.exportBackup());
  }

  private emitARs() {
    setStorageItem(STORAGE_KEYS.ARS, this.ars);
    const data = [...this.ars];
    this.arSubscribers.forEach((cb) => cb(data));
    this.broadcastSync('ars');
    triggerAutoSaveToFolder(() => this.exportBackup());
  }

  private emitOreasStock() {
    setStorageItem(STORAGE_KEYS.OREAS_STOCK, this.oreasStock);
    const data = [...this.oreasStock];
    this.oreasStockSubscribers.forEach((cb) => cb(data));
    this.broadcastSync('oreasStock');
    triggerAutoSaveToFolder(() => this.exportBackup());
  }

  private emitPhotos() {
    // Only save metadata or light copies to localStorage to prevent quota errors, save full in IndexedDB
    try {
      setStorageItem(STORAGE_KEYS.PHOTOS, this.photos);
    } catch {
      // If local storage is full due to photos, strip large dataUrls for local storage key only
      const lightweight = this.photos.map((p) => ({
        ...p,
        dataUrl: p.dataUrl && p.dataUrl.length > 50000 ? p.dataUrl.substring(0, 50) + '...' : p.dataUrl,
      }));
      setStorageItem(STORAGE_KEYS.PHOTOS, lightweight);
    }
    const data = [...this.photos];
    this.photoSubscribers.forEach((cb) => cb(data));
    this.broadcastSync('photos');
    triggerAutoSaveToFolder(() => this.exportBackup());
  }

  private emitLogs() {
    setStorageItem(STORAGE_KEYS.LOGS, this.logs);
    const data = [...this.logs];
    this.logSubscribers.forEach((cb) => cb(data));
    this.broadcastSync('logs');
    triggerAutoSaveToFolder(() => this.exportBackup());
  }

  // Subscription methods
  public subscribeUsers(cb: (users: User[]) => void): () => void {
    cb([...this.users]);
    this.userSubscribers.add(cb);
    return () => this.userSubscribers.delete(cb);
  }

  public subscribeHoles(cb: (holes: DrillHole[]) => void): () => void {
    cb([...this.holes]);
    this.holeSubscribers.add(cb);
    return () => this.holeSubscribers.delete(cb);
  }

  public subscribeARs(cb: (ars: SampleShipmentAR[]) => void): () => void {
    cb([...this.ars]);
    this.arSubscribers.add(cb);
    return () => this.arSubscribers.delete(cb);
  }

  public subscribeOreasStock(cb: (stock: OreasStockEntry[]) => void): () => void {
    cb([...this.oreasStock]);
    this.oreasStockSubscribers.add(cb);
    return () => this.oreasStockSubscribers.delete(cb);
  }

  public subscribePhotos(cb: (photos: QAQCSamplePhoto[]) => void): () => void {
    cb([...this.photos]);
    this.photoSubscribers.add(cb);
    return () => this.photoSubscribers.delete(cb);
  }

  public subscribeLogs(cb: (logs: ProductionLog[]) => void): () => void {
    cb([...this.logs]);
    this.logSubscribers.add(cb);
    return () => this.logSubscribers.delete(cb);
  }

  // Getters
  public getUsers(): User[] {
    return [...this.users];
  }
  public getHoles(): DrillHole[] {
    return [...this.holes];
  }
  public getARs(): SampleShipmentAR[] {
    return [...this.ars];
  }
  public getOreasStock(): OreasStockEntry[] {
    return [...this.oreasStock];
  }
  public getPhotos(): QAQCSamplePhoto[] {
    return [...this.photos];
  }
  public getLogs(): ProductionLog[] {
    return [...this.logs];
  }

  // User CRUD
  public saveUser(user: User): void {
    const idx = this.users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      this.users[idx] = user;
    } else {
      this.users.push(user);
    }
    this.emitUsers();
  }

  public deleteUser(userId: string): void {
    this.users = this.users.filter((u) => u.id !== userId);
    this.emitUsers();
  }

  // Hole CRUD
  public saveHole(hole: DrillHole): void {
    this.clearDeletedHole(hole.id);
    const idx = this.holes.findIndex((h) => h.id === hole.id);
    if (idx >= 0) {
      this.holes[idx] = hole;
    } else {
      this.holes.unshift(hole);
    }
    this.emitHoles();
  }

  public deleteHole(holeId: string, logIds: string[] = [], arIds: string[] = []): void {
    this.recordDeletedHole(holeId);
    this.holes = this.holes.filter((h) => h.id !== holeId);
    if (logIds.length > 0) {
      const logSet = new Set(logIds);
      this.logs = this.logs.filter((l) => !logSet.has(l.id));
      this.emitLogs();
    }
    if (arIds.length > 0) {
      arIds.forEach((id) => this.recordDeletedAR(id));
      const arSet = new Set(arIds);
      this.ars = this.ars.filter((a) => !arSet.has(a.id));
      this.emitARs();
    }
    this.emitHoles();
  }

  // AR CRUD
  public saveAR(ar: SampleShipmentAR): void {
    this.clearDeletedAR(ar.id);
    const idx = this.ars.findIndex((a) => a.id === ar.id);
    if (idx >= 0) {
      this.ars[idx] = ar;
    } else {
      this.ars.unshift(ar);
    }
    this.emitARs();
  }

  public deleteAR(arId: string): void {
    this.recordDeletedAR(arId);
    this.ars = this.ars.filter((a) => a.id !== arId);
    this.emitARs();
  }

  // OREAS Stock CRUD
  public saveOreasStockEntry(entry: OreasStockEntry): void {
    const idx = this.oreasStock.findIndex((e) => e.id === entry.id);
    if (idx >= 0) {
      this.oreasStock[idx] = entry;
    } else {
      this.oreasStock.unshift(entry);
    }
    this.emitOreasStock();
  }

  public deleteOreasStockEntry(entryId: string): void {
    this.oreasStock = this.oreasStock.filter((e) => e.id !== entryId);
    this.emitOreasStock();
  }

  public deleteOreasCode(code: string): number {
    const norm = (code || '').trim().toUpperCase();
    const before = this.oreasStock.length;
    this.oreasStock = this.oreasStock.filter((e) => (e.code || '').trim().toUpperCase() !== norm);
    const removed = before - this.oreasStock.length;
    if (removed > 0) {
      this.emitOreasStock();
    }
    return removed;
  }

  // Photos CRUD
  public async savePhoto(photo: QAQCSamplePhoto): Promise<void> {
    const idx = this.photos.findIndex((p) => p.id === photo.id);
    if (idx >= 0) {
      this.photos[idx] = photo;
    } else {
      this.photos.unshift(photo);
    }
    await idbSavePhoto(photo);
    this.emitPhotos();
  }

  public async deletePhoto(photoId: string): Promise<void> {
    this.photos = this.photos.filter((p) => p.id !== photoId);
    await idbDeletePhoto(photoId);
    this.emitPhotos();
  }

  public async deleteExpiredPhotos(daysRetention = 1095): Promise<number> {
    const cutoff = Date.now() - daysRetention * 24 * 60 * 60 * 1000;
    const toDelete = this.photos.filter((p) => new Date(p.capturedAt || 0).getTime() < cutoff);
    for (const p of toDelete) {
      await this.deletePhoto(p.id);
    }
    return toDelete.length;
  }

  // Logs CRUD
  public saveLog(log: ProductionLog): void {
    const idx = this.logs.findIndex((l) => l.id === log.id);
    if (idx >= 0) {
      this.logs[idx] = log;
    } else {
      this.logs.unshift(log);
    }
    this.emitLogs();
  }

  // Clear all holes, AR shipments, photos and logs completely
  public async clearAllHolesAndShipments(): Promise<void> {
    this.holes.forEach((h) => this.recordDeletedHole(h.id));
    this.ars.forEach((a) => this.recordDeletedAR(a.id));
    this.holes = [];
    this.ars = [];
    this.logs = [];
    this.photos = [];

    await idbClearPhotos();

    this.emitHoles();
    this.emitARs();
    this.emitLogs();
    this.emitPhotos();
  }

  // Reset to demo data
  public async resetToDemo(): Promise<void> {
    setStorageItem(STORAGE_KEYS.DELETED_HOLES, []);
    setStorageItem(STORAGE_KEYS.DELETED_ARS, []);
    this.users = [...INITIAL_USERS];
    this.holes = [...INITIAL_HOLES];
    this.ars = [...INITIAL_ARS];
    this.oreasStock = [...INITIAL_OREAS_STOCK];
    this.logs = [...INITIAL_LOGS];
    this.photos = [];

    await idbClearPhotos();

    this.emitUsers();
    this.emitHoles();
    this.emitARs();
    this.emitOreasStock();
    this.emitLogs();
    this.emitPhotos();
  }

  // Full Database Export to JSON (with lightweight photo references to prevent memory/file bloat)
  public exportBackup(): string {
    const safePhotos = this.photos.map((p) => ({
      ...p,
      dataUrl: p.dataUrl && p.dataUrl.length > 50000 ? undefined : p.dataUrl,
      originalBlob: undefined,
    }));

    const backupData = {
      app: 'ARGMGP - Gestão de Remessas & QA/QC',
      version: '5.0.0-local-atomic',
      exportedAt: new Date().toISOString(),
      data: {
        users: this.users,
        holes: this.holes,
        ars: this.ars,
        oreasStock: this.oreasStock,
        photos: safePhotos,
        logs: this.logs,
      },
    };
    return JSON.stringify(backupData, null, 2);
  }

  // Full Database Import from JSON with Non-Destructive Intelligent Merge (Union by ID & Timestamp)
  public async importBackup(jsonString: string): Promise<{ success: boolean; message: string; counts: Record<string, number> }> {
    try {
      const parsed = JSON.parse(jsonString);
      const data = parsed.data || parsed;

      if (!data || typeof data !== 'object') {
        throw new Error('Arquivo JSON inválido ou sem a estrutura de dados esperada.');
      }

      const deletedHoleIds = new Set(getStorageItem<string[]>(STORAGE_KEYS.DELETED_HOLES, []));
      const deletedArIds = new Set(getStorageItem<string[]>(STORAGE_KEYS.DELETED_ARS, []));

      // 1. Non-destructive merge for Holes:
      if (Array.isArray(data.holes)) {
        const holeMap = new Map<string, DrillHole>();

        // Keep current local holes not marked as deleted
        this.holes.forEach((h) => {
          if (h && h.id && !deletedHoleIds.has(h.id)) {
            holeMap.set(h.id, h);
          }
        });

        // Merge incoming holes from file
        data.holes.forEach((h: DrillHole) => {
          if (!h || !h.id) return;
          if (deletedHoleIds.has(h.id)) return; // Never resurrect explicitly deleted hole

          const existing = holeMap.get(h.id);
          if (!existing) {
            holeMap.set(h.id, h);
          } else {
            // Keep latest version based on creation/modification timestamp
            const existTime = new Date(existing.createdAt || 0).getTime();
            const inTime = new Date(h.createdAt || 0).getTime();
            if (inTime > existTime) {
              holeMap.set(h.id, h);
            }
          }
        });

        this.holes = Array.from(holeMap.values());
        this.emitHoles();
      }

      // 2. Non-destructive merge for ARs:
      if (Array.isArray(data.ars)) {
        const arMap = new Map<string, SampleShipmentAR>();

        this.ars.forEach((a) => {
          if (a && a.id && !deletedArIds.has(a.id)) {
            arMap.set(a.id, a);
          }
        });

        data.ars.forEach((a: SampleShipmentAR) => {
          if (!a || !a.id) return;
          if (deletedArIds.has(a.id)) return;

          const existing = arMap.get(a.id);
          if (!existing) {
            arMap.set(a.id, a);
          } else {
            const existTime = new Date(existing.createdAt || 0).getTime();
            const inTime = new Date(a.createdAt || 0).getTime();
            if (inTime > existTime) {
              arMap.set(a.id, a);
            }
          }
        });

        this.ars = Array.from(arMap.values());
        this.emitARs();
      }

      // 3. Non-destructive merge for Logs:
      if (Array.isArray(data.logs)) {
        const logMap = new Map<string, ProductionLog>();
        this.logs.forEach((l) => {
          if (l && l.id) logMap.set(l.id, l);
        });
        data.logs.forEach((l: ProductionLog) => {
          if (!l || !l.id) return;
          if (!logMap.has(l.id)) logMap.set(l.id, l);
        });
        this.logs = Array.from(logMap.values());
        this.emitLogs();
      }

      // 4. Non-destructive merge for OREAS Stock:
      if (Array.isArray(data.oreasStock)) {
        const stockMap = new Map<string, OreasStockEntry>();
        this.oreasStock.forEach((s) => {
          if (s && s.id) stockMap.set(s.id, s);
        });
        data.oreasStock.forEach((s: OreasStockEntry) => {
          if (!s || !s.id) return;
          if (!stockMap.has(s.id)) stockMap.set(s.id, s);
        });
        this.oreasStock = Array.from(stockMap.values());
        this.emitOreasStock();
      }

      // 5. Non-destructive merge for Users:
      if (Array.isArray(data.users) && data.users.length > 0) {
        const userMap = new Map<string, User>();
        this.users.forEach((u) => {
          if (u && u.id) userMap.set(u.id, u);
        });
        data.users.forEach((u: User) => {
          if (!u || !u.id) return;
          userMap.set(u.id, u);
        });
        if (!userMap.has(MASTER_USER.id)) {
          userMap.set(MASTER_USER.id, MASTER_USER);
        }
        this.users = Array.from(userMap.values());
        this.emitUsers();
      }

      // 6. Non-destructive merge for Photos:
      if (Array.isArray(data.photos)) {
        const photoMap = new Map<string, QAQCSamplePhoto>();
        this.photos.forEach((p) => {
          if (p && p.id) photoMap.set(p.id, p);
        });
        for (const p of data.photos) {
          if (p && p.id && !photoMap.has(p.id)) {
            photoMap.set(p.id, p);
            await idbSavePhoto(p);
          }
        }
        this.photos = Array.from(photoMap.values()).sort(
          (a, b) => new Date(b.capturedAt || 0).getTime() - new Date(a.capturedAt || 0).getTime()
        );
        this.emitPhotos();
      }

      const counts = {
        users: this.users.length,
        holes: this.holes.length,
        ars: this.ars.length,
        oreasStock: this.oreasStock.length,
        photos: this.photos.length,
        logs: this.logs.length,
      };

      return {
        success: true,
        message: `Sincronização concluída com sucesso! (${counts.holes} furos, ${counts.ars} remessas, ${counts.photos} fotos).`,
        counts,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Erro ao processar o arquivo de backup.',
        counts: {},
      };
    }
  }
}

// Global Singleton Instance
export const localDb = new LocalDatabaseHub();
