"use client";

import { useEffect, useState } from "react";
import { AuthCard } from "@/components/auth-card";
import { OfflineStatusBadge } from "@/components/offline-status-badge";
import { OperationsHub } from "@/components/operations-hub";
import { PatronDashboard } from "@/components/patron-dashboard";
import { PosTerminal } from "@/components/pos-terminal";
import { PrintDocumentsModal } from "@/components/print-documents-modal";
import { ProcurementStation } from "@/components/procurement-station";
import { PwaInstaller } from "@/components/pwa-installer";
import { useSession } from "@/lib/auth-client";

export default function HomePage() {
  const { data: session, isPending: isSessionPending } = useSession();
  const [activeStation, setActiveStation] = useState<
    "TODAY" | "POS" | "PROCUREMENT" | "OPERATIONS"
  >("TODAY");
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [kasaTotal, setKasaTotal] = useState<number>(0);
  const [alacakTotal, setAlacakTotal] = useState<number>(0);

  useEffect(() => {
    if (!session?.user) return;
    const params = new URLSearchParams(window.location.search);
    const station = params.get("station");
    if (
      station === "TODAY" ||
      station === "POS" ||
      station === "PROCUREMENT" ||
      station === "OPERATIONS"
    ) {
      setActiveStation(station);
    }
  }, [session?.user]);

  useEffect(() => {
    if (!session?.user) return;
    // İstasyon her değiştiğinde finans icmalini güncelle
    if (!activeStation) return;
    fetch("/api/finance")
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          if (res.data.cashboxSummary?.netCashbox !== undefined) {
            setKasaTotal(res.data.cashboxSummary.netCashbox);
          }
          if (Array.isArray(res.data.customers)) {
            const totalReceivables = res.data.customers.reduce(
              (sum: number, c: { currentBalance?: number }) =>
                sum + (c.currentBalance || 0),
              0,
            );
            setAlacakTotal(totalReceivables);
          }
        }
      })
      .catch(() => {});
  }, [activeStation, session?.user]);

  useEffect(() => {
    const getDialog = () =>
      document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');
    const focusFirstControl = (dialog: HTMLElement) => {
      const firstControl = dialog.querySelector<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      firstControl?.focus();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      const dialog = getDialog();
      if (!dialog) return;
      if (event.key === "Escape") {
        dialog.querySelector<HTMLButtonElement>(".close-btn")?.click();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const observer = new MutationObserver(() => {
      const dialog = getDialog();
      if (dialog && document.activeElement === document.body)
        focusFirstControl(dialog);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (isSessionPending || !session?.user) {
    return (
      <main className="app-wrapper">
        <AuthCard />
      </main>
    );
  }

  return (
    <main className="app-wrapper">
      {/* ÜST NAVİGASYON & İSTASYON BAR */}
      <header className="top-nav no-print">
        {/* Marka & Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #f59e0b, #e11d48)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: "1.1rem",
              color: "#fff",
              boxShadow: "0 0 15px rgba(245, 158, 11, 0.4)",
            }}
          >
            ⚡
          </div>
          <div>
            <h1 className="brand-title" style={{ margin: 0, lineHeight: 1 }}>
              VOLTFLOW ERP
            </h1>
            <span
              style={{
                fontSize: "0.7rem",
                color: "var(--text-secondary)",
                letterSpacing: "0.05em",
              }}
            >
              ELEKTRİK TİCARET &amp; ŞANTİYE KOMUTA MERKEZİ
            </span>
          </div>
        </div>

        {/* 3 BÜYÜK OPERASYONEL İSTASYON */}
        <nav className="nav-tabs" aria-label="Mobil istasyonlar">
          <button
            type="button"
            className={`nav-tab-btn ${activeStation === "TODAY" ? "active" : ""}`}
            onClick={() => setActiveStation("TODAY")}
          >
            <span aria-hidden="true">☀️</span>
            <span>Bugün</span>
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeStation === "POS" ? "active" : ""}`}
            onClick={() => setActiveStation("POS")}
          >
            <span aria-hidden="true">🛒</span>
            <span>Satış</span>
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeStation === "PROCUREMENT" ? "active" : ""}`}
            onClick={() => setActiveStation("PROCUREMENT")}
          >
            <span aria-hidden="true">📥</span>
            <span>Mal Kabul</span>
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeStation === "OPERATIONS" ? "active" : ""}`}
            onClick={() => setActiveStation("OPERATIONS")}
          >
            <span aria-hidden="true">⚡</span>
            <span>Operasyon</span>
          </button>
        </nav>

        {/* SAĞ HUD: KASA, CARİ & MATBU EVRAK */}
        <div
          className="header-summary"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.8rem",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "0.6rem",
              background: "rgba(0,0,0,0.3)",
              padding: "0.35rem 0.7rem",
              borderRadius: "8px",
              fontSize: "0.8rem",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div>
              <span style={{ color: "var(--text-secondary)" }}>Kasa: </span>
              <strong style={{ color: "#10b981" }}>
                {kasaTotal.toLocaleString("tr-TR")} ₺
              </strong>
            </div>
            <div style={{ color: "rgba(255,255,255,0.2)" }}>|</div>
            <div>
              <span style={{ color: "var(--text-secondary)" }}>Alacak: </span>
              <strong style={{ color: "#f59e0b" }}>
                {alacakTotal.toLocaleString("tr-TR")} ₺
              </strong>
            </div>
          </div>

          <OfflineStatusBadge />
          <PwaInstaller />

          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
            onClick={() => setIsPrintModalOpen(true)}
          >
            🖨️ Matbu Evraklar
          </button>
        </div>
      </header>

      <div className="workspace-shell">
        <aside
          className="workspace-sidebar no-print"
          aria-label="Çalışma alanı"
        >
          <span className="workspace-sidebar-label">ÇALIŞMA ALANI</span>
          {[
            ["TODAY", "☀️", "Bugün", "Öncelikler ve durum"],
            ["POS", "🛒", "Satış", "Tezgâh ve fiş"],
            ["PROCUREMENT", "📥", "Mal Kabul", "Stok girişi"],
            ["OPERATIONS", "⚡", "Operasyon", "Şantiye ve kasa"],
          ].map(([station, icon, label, description]) => (
            <button
              key={station}
              type="button"
              className={`workspace-nav-item ${activeStation === station ? "active" : ""}`}
              onClick={() =>
                setActiveStation(
                  station as "TODAY" | "POS" | "PROCUREMENT" | "OPERATIONS",
                )
              }
            >
              <span aria-hidden="true">{icon}</span>
              <span>
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
            </button>
          ))}
        </aside>

        <section className="workspace-content">
          {activeStation === "TODAY" && (
            <div className="today-workspace">
              <div className="station-heading">
                <div>
                  <span className="eyebrow">GÜNLÜK KOMUTA MERKEZİ</span>
                  <h2>Bugünün öncelikleri</h2>
                  <p>
                    Kasa, bekleyen saha kayıtları ve kritik stok tek bakışta.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setActiveStation("POS")}
                >
                  🛒 Hızlı satış
                </button>
              </div>
              <PatronDashboard />
            </div>
          )}
          {activeStation === "POS" && <PosTerminal />}
          {activeStation === "PROCUREMENT" && <ProcurementStation />}
          {activeStation === "OPERATIONS" && <OperationsHub />}
        </section>
      </div>

      {/* MATBU EVRAK MODALI */}
      {isPrintModalOpen && (
        <div className="modal-overlay">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Matbu evraklar"
            className="modal-container"
            style={{ maxWidth: "900px" }}
          >
            <div className="modal-header">
              <h2
                style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}
              >
                🖨️ Resmi Olmayan Matbu Evraklar &amp; Çıktı Merkezi
              </h2>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsPrintModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <PrintDocumentsModal />
          </div>
        </div>
      )}

      {/* ALT BİLGİ */}
      <footer
        className="no-print"
        style={{
          marginTop: "2rem",
          paddingTop: "1rem",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.75rem",
          color: "var(--text-secondary)",
        }}
      >
        <div>
          VOLTFLOW ERP v1.0.0 &bull; 100% Sıfır-NULL &bull; Çift Taraflı Defter
          Koruması &bull; GAG Mimarisi
        </div>
        <div>Rol: OFİS &bull; Durum: Çevrimiçi</div>
      </footer>
    </main>
  );
}
