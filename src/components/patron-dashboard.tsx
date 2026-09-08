"use client";

import { useEffect, useState } from "react";

interface DashboardMetrics {
  totalMaterials: number;
  lowStockCount: number;
  pendingLogsCount: number;
  activeProjectsCount: number;
  totalReceivables: number;
  totalSalesRevenue: number;
  netCashbox: number;
}

interface PendingLog {
  id: string;
  userId: string;
  hoursWorked: number;
  workSummary: string;
  logDate: string;
}

export function PatronDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalMaterials: 0,
    lowStockCount: 0,
    pendingLogsCount: 0,
    activeProjectsCount: 0,
    totalReceivables: 0,
    totalSalesRevenue: 0,
    netCashbox: 0,
  });

  const [pendingLogs, setPendingLogs] = useState<PendingLog[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setMetrics(json.data);
        }
      })
      .catch(() => {});

    fetch("/api/field-logs")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setPendingLogs(json.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleApprove = async (logId: string) => {
    setApprovingId(logId);

    try {
      const response = await fetch(`/api/field-logs/${logId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Saha günlüğü onaylanamadı.");
    } catch (_error) {
      setApprovingId(null);
      return;
    }

    setPendingLogs((prev) => prev.filter((l) => l.id !== logId));
    setMetrics((prev) => ({
      ...prev,
      pendingLogsCount: Math.max(0, prev.pendingLogsCount - 1),
    }));
    setApprovingId(null);
  };

  return (
    <div
      className="today-dashboard"
      style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
    >
      {/* 4 Ana Metrik Kartı */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        <div className="stat-item" style={{ borderLeft: "4px solid #10b981" }}>
          <div className="stat-label">Net Kasa Durumu (Nakit)</div>
          <div className="stat-value" style={{ color: "#10b981" }}>
            {metrics.netCashbox.toLocaleString("tr-TR")} ₺
          </div>
        </div>

        <div className="stat-item" style={{ borderLeft: "4px solid #f59e0b" }}>
          <div className="stat-label">Açık Hesap Alacakları (Veresiye)</div>
          <div className="stat-value" style={{ color: "#f59e0b" }}>
            {metrics.totalReceivables.toLocaleString("tr-TR")} ₺
          </div>
        </div>

        <div className="stat-item" style={{ borderLeft: "4px solid #ef4444" }}>
          <div className="stat-label">Kritik Stok Uyarısı</div>
          <div className="stat-value" style={{ color: "#ef4444" }}>
            {metrics.lowStockCount} Malzeme Azaldı
          </div>
        </div>

        <div className="stat-item" style={{ borderLeft: "4px solid #3b82f6" }}>
          <div className="stat-label">Onay Bekleyen Saha Raporu</div>
          <div className="stat-value" style={{ color: "#3b82f6" }}>
            {metrics.pendingLogsCount} Rapor
          </div>
        </div>
      </div>

      {/* Onay Bekleyen Saha Günlükleri Masası */}
      <div className="pos-catalog">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
              Onay Bekleyen Saha Günlükleri (Patron Masası)
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Onayladığınız anda rapordaki malzemeler merkez depodan şantiye
              sarfiyatına aktarılır.
            </p>
          </div>
          <span className="badge" style={{ margin: 0 }}>
            {pendingLogs.length} Bekleyen
          </span>
        </div>

        {pendingLogs.length === 0 ? (
          <div
            style={{
              padding: "2rem 0",
              textAlign: "center",
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
            }}
          >
            ✓ Bekleyen saha günlüğü bulunmuyor. Tüm raporlar onaylandı.
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            {pendingLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "10px",
                  padding: "1rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.8rem",
                }}
              >
                <div style={{ flex: 1, minWidth: "240px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      marginBottom: "0.25rem",
                    }}
                  >
                    <span style={{ fontWeight: 700, color: "#fff" }}>
                      {log.userId}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--accent-cyan)",
                        background: "rgba(6, 182, 212, 0.12)",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "4px",
                      }}
                    >
                      {log.hoursWorked} Saat Mesai
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {log.workSummary}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{
                      padding: "0.5rem 1rem",
                      fontSize: "0.85rem",
                      background: "linear-gradient(135deg, #10b981, #06b6d4)",
                    }}
                    disabled={approvingId === log.id}
                    onClick={() => handleApprove(log.id)}
                  >
                    {approvingId === log.id ? "Onaylanıyor..." : "✓ Onayla"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kritik Stok Alarmları */}
      <div className="pos-catalog">
        <h3
          style={{
            fontSize: "1.1rem",
            fontWeight: 700,
            color: "#fff",
            marginBottom: "0.8rem",
          }}
        >
          ⚠️ Kritik Stok Uyarısı (Toptancıdan Sipariş Gerekenler)
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "0.8rem",
          }}
        >
          <div
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              padding: "0.8rem 1rem",
              borderRadius: "10px",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                color: "#fca5a5",
                fontWeight: 700,
              }}
            >
              SGT-16A
            </div>
            <div style={{ fontWeight: 600, color: "#fff", margin: "0.2rem 0" }}>
              Schneider 16A Sigorta
            </div>
            <div style={{ fontSize: "0.8rem", color: "#f87171" }}>
              Kalan: <strong>2 adet</strong> (Kritik Eşik: 5 adet)
            </div>
          </div>

          <div
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              padding: "0.8rem 1rem",
              borderRadius: "10px",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                color: "#fca5a5",
                fontWeight: 700,
              }}
            >
              KAR-40A
            </div>
            <div style={{ fontWeight: 600, color: "#fff", margin: "0.2rem 0" }}>
              Siemens 40A Kaçak Akım Rölesi
            </div>
            <div style={{ fontSize: "0.8rem", color: "#f87171" }}>
              Kalan: <strong>1 adet</strong> (Kritik Eşik: 3 adet)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
