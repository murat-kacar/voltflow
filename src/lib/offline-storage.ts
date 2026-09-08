// Voltflow ERP - IndexedDB Yerel Depolama Motoru (Offline-First)
// Zero-Null, GAG Protokolü uyumlu Structured Clone depolama katmanı.

export interface OutboxRecord {
  id: string;
  url: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  payload: unknown;
  label: string;
  station: "POS" | "PROCUREMENT" | "OPERATIONS";
  createdAt: string;
  status: "PENDING" | "SYNCING" | "FAILED" | "SYNCED";
  retryCount: number;
  lastError?: string;
}

export interface CatalogCacheRecord {
  key: string;
  data: unknown;
  updatedAt: string;
}

const DB_NAME = "voltflow_offline_v1";
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

/**
 * IndexedDB bağlantısını açar veya mevcut bağlantıyı döner.
 */
export async function getOfflineDb(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !window.indexedDB) {
    throw new Error("IndexedDB bu çalışma ortamında desteklenmiyor (SSR).");
  }

  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Outbox (Giden Kutusu) Store
      if (!db.objectStoreNames.contains("outbox")) {
        const outboxStore = db.createObjectStore("outbox", { keyPath: "id" });
        outboxStore.createIndex("status", "status", { unique: false });
        outboxStore.createIndex("createdAt", "createdAt", { unique: false });
        outboxStore.createIndex("station", "station", { unique: false });
      }

      // 2. Katalog / Referans Veri Önbelleği (Kablolar, Müşteriler, Şantiyeler)
      if (!db.objectStoreNames.contains("catalog_cache")) {
        db.createObjectStore("catalog_cache", { keyPath: "key" });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(
        new Error(
          `IndexedDB açılamadı: ${(event.target as IDBOpenDBRequest).error?.message}`,
        ),
      );
    };
  });
}

/**
 * Outbox tablosuna yeni bir işlem mühürler.
 */
export async function addOutboxRecord(record: OutboxRecord): Promise<string> {
  const db = await getOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("outbox", "readwrite");
    const store = tx.objectStore("outbox");
    const req = store.put(record);

    req.onsuccess = () => resolve(record.id);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Bekleyen (PENDING veya FAILED) outbox kayıtlarını döner.
 */
export async function getPendingOutboxRecords(): Promise<OutboxRecord[]> {
  const db = await getOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("outbox", "readonly");
    const store = tx.objectStore("outbox");
    const req = store.getAll();

    req.onsuccess = () => {
      const all: OutboxRecord[] = req.result || [];
      const pending = all
        .filter((r) => r.status === "PENDING" || r.status === "FAILED")
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      resolve(pending);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Belirli bir outbox kaydının durumunu günceller.
 */
export async function updateOutboxStatus(
  id: string,
  status: OutboxRecord["status"],
  lastError?: string,
): Promise<void> {
  const db = await getOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("outbox", "readwrite");
    const store = tx.objectStore("outbox");
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const record = getReq.result as OutboxRecord | undefined;
      if (!record) {
        resolve();
        return;
      }
      record.status = status;
      if (lastError !== undefined) {
        record.lastError = lastError;
      }
      if (status === "FAILED") {
        record.retryCount = (record.retryCount || 0) + 1;
      }
      const putReq = store.put(record);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Başarıyla senkronize edilmiş veya silinmek istenen kaydı temizler.
 */
export async function deleteOutboxRecord(id: string): Promise<void> {
  const db = await getOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("outbox", "readwrite");
    const store = tx.objectStore("outbox");
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Tüm outbox kuyruğunu temizler.
 */
export async function clearOutboxStore(): Promise<void> {
  const db = await getOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("outbox", "readwrite");
    const store = tx.objectStore("outbox");
    const req = store.clear();

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Katalog verisini (malzemeler, şantiyeler, vb.) çevrimdışı önbelleğe yazar.
 */
export async function setCatalogCache(
  key: string,
  data: unknown,
): Promise<void> {
  const db = await getOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("catalog_cache", "readwrite");
    const store = tx.objectStore("catalog_cache");
    const record: CatalogCacheRecord = {
      key,
      data,
      updatedAt: new Date().toISOString(),
    };
    const req = store.put(record);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Katalog verisini çevrimdışı önbellekten okur.
 */
export async function getCatalogCache<T>(key: string): Promise<T | null> {
  const db = await getOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("catalog_cache", "readonly");
    const store = tx.objectStore("catalog_cache");
    const req = store.get(key);

    req.onsuccess = () => {
      const record = req.result as CatalogCacheRecord | undefined;
      resolve(record ? (record.data as T) : null);
    };
    req.onerror = () => reject(req.error);
  });
}
