"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstaller() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Service Worker Kaydı
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          // SW registered
        })
        .catch(() => {});
    }

    // 2. Standalone Kontrolü (Masaüstü PWA olarak mı açık?)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone ===
          true;
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // 3. Tarayıcının Kurulum Olayını Yakala (Chrome / Edge / Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert(
        "Masaüstü/Mobil kısayolu için tarayıcınızın adres çubuğundaki (URL yanındaki) 'Yükle / Uygulama Olarak Aç' ⊕ simgesine tıklayabilirsiniz.",
      );
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  // Eğer zaten masaüstü/standalone pencere olarak açıksa
  if (isStandalone) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          background: "rgba(16, 185, 129, 0.15)",
          color: "#10b981",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          borderRadius: "6px",
          padding: "0.3rem 0.6rem",
          fontSize: "0.75rem",
          fontWeight: 600,
        }}
        title="Uygulama bağımsız masaüstü penceresi olarak çalışıyor"
      >
        <span>⚡ Masaüstü Modu</span>
      </div>
    );
  }

  // Yüklendi bildirimi
  if (isInstalled) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          background: "rgba(59, 130, 246, 0.15)",
          color: "#60a5fa",
          border: "1px solid rgba(59, 130, 246, 0.3)",
          borderRadius: "6px",
          padding: "0.3rem 0.6rem",
          fontSize: "0.75rem",
          fontWeight: 600,
        }}
      >
        <span>✓ Kuruldu</span>
      </div>
    );
  }

  // Kurulum Butonu (Masaüstü / Telefon)
  return (
    <button
      type="button"
      className="btn"
      style={{
        fontSize: "0.8rem",
        padding: "0.4rem 0.8rem",
        background: "linear-gradient(135deg, #3b82f6, #6366f1)",
        color: "#fff",
        border: "none",
        fontWeight: 700,
        boxShadow: "0 0 12px rgba(59, 130, 246, 0.3)",
      }}
      onClick={handleInstallClick}
      title="Voltflow ERP'yi masaüstünüze veya telefonunuza uygulama olarak kurun"
    >
      📲 Masaüstüne Kur
    </button>
  );
}
