// Voltflow ERP - Çevrimdışı Outbox Eşitleme & Koruma Motoru
// Ağ kesintilerini tolere eden dayanıklı (resilient) API sarmalayıcısı.

import {
  addOutboxRecord,
  deleteOutboxRecord,
  getPendingOutboxRecords,
  type OutboxRecord,
  updateOutboxStatus,
} from "./offline-storage";

export interface EnqueueOptions {
  url: string;
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  payload: unknown;
  label: string;
  station: "POS" | "PROCUREMENT" | "OPERATIONS";
}

export interface SyncResult {
  total: number;
  synced: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

export interface OfflineFallbackResult<T = unknown> {
  success: boolean;
  offline: boolean;
  message: string;
  data?: T;
}

const OUTBOX_EVENT = "voltflow:outbox-updated";

/**
 * Kuyrukta değişiklik olduğunda dinleyicileri uyarır.
 */
export function notifyOutboxChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OUTBOX_EVENT));
  }
}

/**
 * Outbox güncellemelerini dinlemek için event listener aboneliği.
 */
export function subscribeOutboxUpdates(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(OUTBOX_EVENT, callback);
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener(OUTBOX_EVENT, callback);
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

/**
 * Bir işlemi çevrimdışı outbox tablosuna mühürler.
 */
export async function enqueueOutboxItem(
  options: EnqueueOptions,
): Promise<string> {
  const id = `outbox_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const record: OutboxRecord = {
    id,
    url: options.url,
    method: options.method || "POST",
    payload: options.payload,
    label: options.label,
    station: options.station,
    createdAt: new Date().toISOString(),
    status: "PENDING",
    retryCount: 0,
  };

  await addOutboxRecord(record);
  notifyOutboxChanged();
  return id;
}

/**
 * Kuyrukta bekleyen tüm işlemleri sırayla sunucuya basar.
 */
export async function syncOutboxQueue(
  onProgress?: (record: OutboxRecord, index: number, total: number) => void,
): Promise<SyncResult> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { total: 0, synced: 0, failed: 0, errors: [] };
  }

  let pending: OutboxRecord[] = [];
  try {
    pending = await getPendingOutboxRecords();
  } catch (err) {
    console.error("Outbox kayıtları okunamadı:", err);
    return { total: 0, synced: 0, failed: 0, errors: [] };
  }

  if (pending.length === 0) {
    return { total: 0, synced: 0, failed: 0, errors: [] };
  }

  let synced = 0;
  let failed = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (let i = 0; i < pending.length; i++) {
    const item = pending[i];
    if (onProgress) {
      onProgress(item, i + 1, pending.length);
    }

    await updateOutboxStatus(item.id, "SYNCING");

    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: {
          "Content-Type": "application/json",
          "x-offline-synced": "true",
          "x-offline-id": item.id,
          "x-idempotency-key": item.id,
        },
        body: JSON.stringify(item.payload),
      });

      if (response.ok) {
        // Başarıyla sunucuya ulaştı, yerel kuyruktan silebiliriz
        await deleteOutboxRecord(item.id);
        synced++;
      } else {
        const errorText = await response.text();
        await updateOutboxStatus(
          item.id,
          "FAILED",
          `HTTP ${response.status}: ${errorText}`,
        );
        failed++;
        errors.push({
          id: item.id,
          error: `HTTP ${response.status}: ${errorText}`,
        });
      }
    } catch (networkError) {
      const errMsg =
        networkError instanceof Error ? networkError.message : "Ağ hatası";
      await updateOutboxStatus(item.id, "FAILED", errMsg);
      failed++;
      errors.push({ id: item.id, error: errMsg });
      // Ağ tamamen kesildiyse kalanları zorlamadan döngüyü kes
      break;
    }
  }

  notifyOutboxChanged();
  return {
    total: pending.length,
    synced,
    failed,
    errors,
  };
}

/**
 * Bileşenlerin güvenle kullanabileceği ağ korumalı API çağrısı.
 * Eğer internet yoksa veya ağ hatası alınırsa isteği otomatik IndexedDB outbox'a atar.
 */
export async function apiCallWithOfflineFallback<T = unknown>(
  url: string,
  options: {
    method?: "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    headers?: Record<string, string>;
  },
  meta: {
    label: string;
    station: "POS" | "PROCUREMENT" | "OPERATIONS";
    optimisticData?: T;
  },
): Promise<OfflineFallbackResult<T>> {
  const method = options.method || "POST";
  const payload = options.body;

  // 1. Durum: Cihaz zaten çevrimdışı
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await enqueueOutboxItem({
      url,
      method,
      payload,
      label: meta.label,
      station: meta.station,
    });
    return {
      success: true,
      offline: true,
      message:
        "⚡ Cihaz çevrimdışı. İşlem yerel hafızaya (IndexedDB) mühürlendi; internet geldiğinde eşitlenecektir.",
      data: meta.optimisticData,
    };
  }

  // 2. Durum: Çevrimiçi görünüyor, istek yapmayı dene
  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });

    const data = await res.json().catch(() => null);

    if (res.ok) {
      return {
        success: true,
        offline: false,
        message: "İşlem canlı veritabanına başarıyla kaydedildi.",
        data: (data?.data ? data.data : data) as T,
      };
    }

    // Sunucu 4xx/5xx döndü (iş kuralı hatası vb.)
    return {
      success: false,
      offline: false,
      message:
        data?.error?.message ||
        data?.error ||
        `İşlem başarısız: HTTP ${res.status}`,
    };
  } catch (_fetchError) {
    // Ağ bağlantısı o an koptu (ERR_CONNECTION_REFUSED / offline)
    await enqueueOutboxItem({
      url,
      method,
      payload,
      label: meta.label,
      station: meta.station,
    });

    return {
      success: true,
      offline: true,
      message:
        "⚡ Ağ bağlantısı koptu. İşlem yerel hafızaya (IndexedDB) mühürlendi; bağlantı sağlandığında eşitlenecektir.",
      data: meta.optimisticData,
    };
  }
}
