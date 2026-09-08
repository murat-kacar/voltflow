import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as offlineStorage from "./offline-storage";
import {
  apiCallWithOfflineFallback,
  enqueueOutboxItem,
  syncOutboxQueue,
} from "./offline-sync";

describe("Voltflow ERP - Offline Outbox & Sync Logic", () => {
  let mockStore: offlineStorage.OutboxRecord[] = [];

  beforeEach(() => {
    mockStore = [];

    // Storage fonksiyonlarını in-memory simüle et
    vi.spyOn(offlineStorage, "addOutboxRecord").mockImplementation(
      async (record) => {
        mockStore.push({ ...record });
        return record.id;
      },
    );

    vi.spyOn(offlineStorage, "getPendingOutboxRecords").mockImplementation(
      async () => {
        return mockStore.filter(
          (r) => r.status === "PENDING" || r.status === "FAILED",
        );
      },
    );

    vi.spyOn(offlineStorage, "updateOutboxStatus").mockImplementation(
      async (id, status, error) => {
        const item = mockStore.find((r) => r.id === id);
        if (item) {
          item.status = status;
          if (error) item.lastError = error;
        }
      },
    );

    vi.spyOn(offlineStorage, "deleteOutboxRecord").mockImplementation(
      async (id) => {
        mockStore = mockStore.filter((r) => r.id !== id);
      },
    );

    // Global navigator ve window simülasyonu
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal("window", {
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("enqueueOutboxItem bekleyen yeni bir işlem oluşturmalıdır", async () => {
    const id = await enqueueOutboxItem({
      url: "/api/sales",
      method: "POST",
      payload: { invoiceNumber: "FS-1234", amount: 1500 },
      label: "Tezgâh Satışı: 1.500 ₺",
      station: "POS",
    });

    expect(id).toBeDefined();
    expect(id.startsWith("outbox_")).toBe(true);
    expect(mockStore.length).toBe(1);
    expect(mockStore[0].status).toBe("PENDING");
    expect(mockStore[0].label).toBe("Tezgâh Satışı: 1.500 ₺");
  });

  it("apiCallWithOfflineFallback cihaz çevrimdışıyken isteği otomatik IndexedDB outbox'a mühürlemelidir", async () => {
    // Çevrimdışı yap
    vi.stubGlobal("navigator", { onLine: false });

    const result = await apiCallWithOfflineFallback(
      "/api/sales",
      {
        method: "POST",
        body: { invoiceNumber: "FS-OFFLINE", total: 450 },
      },
      {
        label: "Çevrimdışı Satış: 450 ₺",
        station: "POS",
        optimisticData: { id: "opt_1", total: 450 },
      },
    );

    expect(result.success).toBe(true);
    expect(result.offline).toBe(true);
    expect(result.message).toContain("çevrimdışı");
    expect(result.data).toEqual({ id: "opt_1", total: 450 });
    expect(mockStore.length).toBe(1);
    expect(mockStore[0].label).toBe("Çevrimdışı Satış: 450 ₺");
  });

  it("apiCallWithOfflineFallback sunucu bağlantı hatası (Network Error) verdiğinde isteği outbox'a yönlendirmelidir", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    // fetch ağ hatası atsın (Failed to fetch)
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValue(new Error("Failed to fetch / Connection refused")),
    );

    const result = await apiCallWithOfflineFallback(
      "/api/field-logs",
      {
        method: "POST",
        body: { projectId: "proj_1", workerCount: 4 },
      },
      {
        label: "Saha Puantajı: Ataşehir",
        station: "OPERATIONS",
      },
    );

    expect(result.success).toBe(true);
    expect(result.offline).toBe(true);
    expect(result.message).toContain("bağlantısı koptu");
    expect(mockStore.length).toBe(1);
    expect(mockStore[0].label).toBe("Saha Puantajı: Ataşehir");
  });

  it("syncOutboxQueue bağlantı sağlandığında kuyruktaki bekleyen kayıtları sunucuya başarıyla işlemelidir", async () => {
    // 1. Önce 2 adet çevrimdışı işlem ekle
    await enqueueOutboxItem({
      url: "/api/sales",
      method: "POST",
      payload: { invoice: "1" },
      label: "İşlem 1",
      station: "POS",
    });

    await enqueueOutboxItem({
      url: "/api/sales",
      method: "POST",
      payload: { invoice: "2" },
      label: "İşlem 2",
      station: "POS",
    });

    expect(mockStore.length).toBe(2);

    // 2. Fetch mock'la (Başarılı yanıt)
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      }),
    );

    // 3. Eşitle
    const syncRes = await syncOutboxQueue();

    expect(syncRes.total).toBe(2);
    expect(syncRes.synced).toBe(2);
    expect(syncRes.failed).toBe(0);
    // Başarıyla senkronlanan kayıtlar outbox'tan silinmiş olmalı
    expect(mockStore.length).toBe(0);
  });
});
