"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearOutboxStore,
  getPendingOutboxRecords,
  type OutboxRecord,
} from "@/lib/offline-storage";
import {
  type SyncResult,
  subscribeOutboxUpdates,
  syncOutboxQueue,
} from "@/lib/offline-sync";

export function OfflineStatusBadge() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingItems, setPendingItems] = useState<OutboxRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  const refreshPending = useCallback(async () => {
    try {
      const list = await getPendingOutboxRecords();
      setPendingItems(list);
    } catch {
      // IndexedDB henüz hazır değilse
    }
  }, []);

  const handleSync = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await syncOutboxQueue();
      setLastSyncResult(result);
      await refreshPending();
    } catch (err) {
      console.error("Senkronizasyon hatası:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshPending]);

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    const handleOnline = () => {
      setIsOnline(true);
      // Çevrimiçi olunca bekleyen kuyruğu otomatik eşitle
      handleSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      refreshPending();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const unsubscribe = subscribeOutboxUpdates(() => {
      refreshPending();
    });

    refreshPending();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      unsubscribe();
    };
  }, [handleSync, refreshPending]);

  const handleClear = async () => {
    if (
      window.confirm(
        "Kuyruktaki tüm bekleyen çevrimdışı kayıtlar silinecek. Onaylıyor musunuz?",
      )
    ) {
      await clearOutboxStore();
      await refreshPending();
      setLastSyncResult(null);
    }
  };

  return (
    <>
      {/* HUD BUTONU / ROZETİ */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.45rem",
          background: !isOnline
            ? "rgba(245, 158, 11, 0.15)"
            : pendingItems.length > 0
              ? "rgba(59, 130, 246, 0.15)"
              : "rgba(16, 185, 129, 0.12)",
          color: !isOnline
            ? "#f59e0b"
            : pendingItems.length > 0
              ? "#60a5fa"
              : "#34d399",
          border: `1px solid ${
            !isOnline
              ? "rgba(245, 158, 11, 0.4)"
              : pendingItems.length > 0
                ? "rgba(59, 130, 246, 0.4)"
                : "rgba(16, 185, 129, 0.3)"
          }`,
          borderRadius: "8px",
          padding: "0.4rem 0.75rem",
          fontSize: "0.8rem",
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        title="Çevrimdışı Durum ve Giden Kutusu (IndexedDB)"
      >
        <span
          style={{
            display: "inline-block",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: !isOnline
              ? "#f59e0b"
              : pendingItems.length > 0
                ? "#60a5fa"
                : "#10b981",
            boxShadow: `0 0 8px ${!isOnline ? "#f59e0b" : "#10b981"}`,
          }}
        />
        {isSyncing ? (
          <span>🔄 Eşitleniyor...</span>
        ) : !isOnline ? (
          <span>⚡ Çevrimdışı ({pendingItems.length})</span>
        ) : pendingItems.length > 0 ? (
          <span>📤 {pendingItems.length} Bekleyen Kayıt</span>
        ) : (
          <span>🟢 Çevrimiçi</span>
        )}
      </button>

      {/* DETAY VE YÖNETİM MODALI */}
      {isModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Çevrimdışı işlem yönetimi"
            className="modal-container"
            style={{ maxWidth: "650px", width: "95%" }}
          >
            <div className="modal-header">
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    background: !isOnline ? "#f59e0b" : "#10b981",
                    color: "#000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                  }}
                >
                  {!isOnline ? "⚡" : "💾"}
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      margin: 0,
                      color: "#fff",
                    }}
                  >
                    IndexedDB Çevrimdışı Outbox (Giden Kutusu)
                  </h2>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Ağ Durumu:{" "}
                    <strong style={{ color: isOnline ? "#34d399" : "#f59e0b" }}>
                      {isOnline
                        ? "Çevrimiçi (İnternet Bağlı)"
                        : "Çevrimdışı (İnternet Yok)"}
                    </strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "1.2rem" }}>
              {/* BİLGİ KUTUSU */}
              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "8px",
                  padding: "0.8rem",
                  marginBottom: "1.2rem",
                  fontSize: "0.8rem",
                  lineHeight: 1.5,
                  color: "var(--text-secondary)",
                }}
              >
                💡 İnternet kesildiğinde veya şantiye bodrumunda yapılan satış
                ve puantajlar yerel diskteki{" "}
                <strong style={{ color: "#fff" }}>IndexedDB / LevelDB</strong>{" "}
                motoruna ikili olarak mühürlenir. Bağlantı sağlandığında tüm
                kayıtlar sırayla canlı veritabanına otomatik basılır.
              </div>

              {/* SON EŞİTLEME BİLGİSİ */}
              {lastSyncResult && (
                <div
                  style={{
                    background:
                      lastSyncResult.failed === 0
                        ? "rgba(16, 185, 129, 0.1)"
                        : "rgba(239, 68, 68, 0.1)",
                    border: `1px solid ${
                      lastSyncResult.failed === 0
                        ? "rgba(16, 185, 129, 0.3)"
                        : "rgba(239, 68, 68, 0.3)"
                    }`,
                    borderRadius: "6px",
                    padding: "0.6rem 0.8rem",
                    marginBottom: "1rem",
                    fontSize: "0.8rem",
                    color: lastSyncResult.failed === 0 ? "#34d399" : "#f87171",
                  }}
                >
                  Son Eşitleme: {lastSyncResult.synced} başarılı,{" "}
                  {lastSyncResult.failed} başarısız işlem.
                </div>
              )}

              {/* BEKLEYEN KAYITLAR LİSTESİ */}
              <div style={{ marginBottom: "1.5rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.6rem",
                  }}
                >
                  <h4
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      margin: 0,
                      color: "#fff",
                    }}
                  >
                    Bekleyen Çevrimdışı İşlemler ({pendingItems.length})
                  </h4>
                </div>

                {pendingItems.length === 0 ? (
                  <div
                    style={{
                      padding: "2rem",
                      textAlign: "center",
                      background: "rgba(0,0,0,0.2)",
                      borderRadius: "8px",
                      border: "1px dashed rgba(255,255,255,0.1)",
                      color: "var(--text-secondary)",
                      fontSize: "0.85rem",
                    }}
                  >
                    ✨ Bekleyen çevrimdışı işlem yok. Tüm kayıtlar canlı
                    veritabanıyla eşitlendi.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                      maxHeight: "260px",
                      overflowY: "auto",
                    }}
                  >
                    {pendingItems.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "6px",
                          padding: "0.65rem 0.8rem",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.8rem",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: "#fff" }}>
                            {item.label}
                          </div>
                          <div
                            style={{
                              fontSize: "0.7rem",
                              color: "var(--text-secondary)",
                              marginTop: "0.2rem",
                            }}
                          >
                            İstasyon:{" "}
                            <span style={{ color: "#60a5fa" }}>
                              {item.station}
                            </span>{" "}
                            &bull; Zaman:{" "}
                            {new Date(item.createdAt).toLocaleTimeString(
                              "tr-TR",
                            )}
                          </div>
                          {item.lastError && (
                            <div
                              style={{
                                color: "#f87171",
                                fontSize: "0.7rem",
                                marginTop: "0.2rem",
                              }}
                            >
                              Hata: {item.lastError}
                            </div>
                          )}
                        </div>
                        <span
                          style={{
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            background:
                              item.status === "FAILED"
                                ? "rgba(239, 68, 68, 0.2)"
                                : item.status === "SYNCING"
                                  ? "rgba(59, 130, 246, 0.2)"
                                  : "rgba(245, 158, 11, 0.2)",
                            color:
                              item.status === "FAILED"
                                ? "#f87171"
                                : item.status === "SYNCING"
                                  ? "#60a5fa"
                                  : "#f59e0b",
                          }}
                        >
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AKSİYON BUTONLARI */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "0.8rem",
                }}
              >
                {pendingItems.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{
                      fontSize: "0.8rem",
                      color: "#f87171",
                      borderColor: "rgba(239, 68, 68, 0.3)",
                    }}
                    onClick={handleClear}
                  >
                    🗑️ Kuyruğu Boşalt
                  </button>
                )}
                <div
                  style={{
                    display: "flex",
                    gap: "0.6rem",
                    marginLeft: "auto",
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: "0.8rem" }}
                    onClick={() => setIsModalOpen(false)}
                  >
                    Kapat
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: "0.8rem" }}
                    disabled={
                      !isOnline || isSyncing || pendingItems.length === 0
                    }
                    onClick={handleSync}
                  >
                    {isSyncing ? "🔄 Eşitleniyor..." : "⚡ Şimdi Eşitle"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
