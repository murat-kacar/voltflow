"use client";

import { useState } from "react";

interface MaterialConsumption {
  materialId: string;
  name: string;
  quantity: number;
  unit: string;
}

const COMMON_FIELD_MATERIALS = [
  { id: "m_1", name: "Hes Kablo 3x2.5mm²", unit: "metre" },
  { id: "m_2", name: "Schneider 16A Sigorta", unit: "adet" },
  { id: "m_3", name: "Viko Karre Priz", unit: "adet" },
  { id: "m_6", name: "İzolasyon Bandı", unit: "adet" },
];

export function FieldLogMobile() {
  const [hoursWorked, setHoursWorked] = useState<number>(8);
  const [projectTitle, setProjectTitle] = useState<string>(
    "Güneş Konutları B Blok Tesisatı",
  );
  const [workSummary, setWorkSummary] = useState<string>("");
  const [consumedMaterials, setConsumedMaterials] = useState<
    MaterialConsumption[]
  >([]);
  const [selectedMatId, setSelectedMatId] = useState<string>("m_1");
  const [matQuantity, setMatQuantity] = useState<number>(10);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const addMaterial = () => {
    const mat = COMMON_FIELD_MATERIALS.find((m) => m.id === selectedMatId);
    if (!mat || matQuantity <= 0) return;

    setConsumedMaterials((prev) => {
      const existing = prev.find((item) => item.materialId === mat.id);
      if (existing) {
        return prev.map((item) =>
          item.materialId === mat.id
            ? { ...item, quantity: item.quantity + matQuantity }
            : item,
        );
      }
      return [
        ...prev,
        {
          materialId: mat.id,
          name: mat.name,
          quantity: matQuantity,
          unit: mat.unit,
        },
      ];
    });
  };

  const removeMaterial = (id: string) => {
    setConsumedMaterials((prev) => prev.filter((m) => m.materialId !== id));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/field-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hoursWorked,
          workSummary:
            workSummary.trim() || `${projectTitle} normal mesai tamamlandı.`,
          materials: consumedMaterials.map((m) => ({
            materialId: m.materialId,
            quantity: m.quantity,
          })),
        }),
      });
      if (!response.ok) {
        throw new Error("Saha günlüğü sunucu tarafından kabul edilmedi.");
      }
    } catch (_error) {
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div
        className="pos-catalog field-log-workspace"
        style={{
          maxWidth: "500px",
          margin: "0 auto",
          textAlign: "center",
          padding: "2.5rem 1.5rem",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff" }}>
          Saha Günlüğü Gönderildi!
        </h2>
        <p
          style={{
            color: "var(--text-secondary)",
            margin: "0.8rem 0 1.5rem 0",
            fontSize: "0.95rem",
          }}
        >
          Raporunuz kaydedildi ve patronun onay masasına iletildi. Onaylandığı
          an malzemeler şantiye sarfiyatına işlenecektir.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: "100%" }}
          onClick={() => {
            setIsSubmitted(false);
            setWorkSummary("");
            setConsumedMaterials([]);
          }}
        >
          + Yeni Rapor Aç
        </button>
      </div>
    );
  }

  return (
    <div
      className="pos-catalog field-log-workspace"
      style={{ maxWidth: "520px", margin: "0 auto", padding: "1.5rem" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.2rem",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fff" }}>
            Mobil Saha Günlüğü
          </h2>
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            Usta &amp; Çırak Hızlı Giriş Ekranı
          </span>
        </div>
        <span className="session-badge">📱 Çevrimdışı Korumalı</span>
      </div>

      {/* Şantiye Seçimi */}
      <div className="form-group" style={{ marginBottom: "1rem" }}>
        <label className="form-label" htmlFor="field-project-input">
          Çalışılan Şantiye / Proje
        </label>
        <input
          id="field-project-input"
          type="text"
          className="form-input"
          value={projectTitle}
          onChange={(e) => setProjectTitle(e.target.value)}
        />
      </div>

      {/* Çalışma Süresi (Büyük Dokunmatik Kontrol) */}
      <div
        style={{
          background: "rgba(0,0,0,0.3)",
          padding: "1rem",
          borderRadius: "12px",
          marginBottom: "1.2rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "0.9rem",
              color: "var(--text-secondary)",
              fontWeight: 600,
            }}
          >
            Çalışılan Mesai
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <button
              type="button"
              className="btn"
              style={{
                padding: "0.4rem 0.9rem",
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                fontSize: "1.2rem",
              }}
              onClick={() => setHoursWorked((prev) => Math.max(1, prev - 1))}
            >
              -
            </button>
            <span
              style={{
                fontSize: "1.3rem",
                fontWeight: 800,
                minWidth: "70px",
                textAlign: "center",
                color: "var(--accent-emerald)",
              }}
            >
              {hoursWorked} Saat
            </span>
            <button
              type="button"
              className="btn"
              style={{
                padding: "0.4rem 0.9rem",
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                fontSize: "1.2rem",
              }}
              onClick={() => setHoursWorked((prev) => Math.min(24, prev + 1))}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Opsiyonel Sarfiyat Ekleme */}
      <div
        style={{
          background: "rgba(0,0,0,0.2)",
          padding: "1rem",
          borderRadius: "12px",
          marginBottom: "1.2rem",
        }}
      >
        <label
          htmlFor="field-mat-select"
          className="form-label"
          style={{ display: "block", marginBottom: "0.5rem" }}
        >
          Kullanılan Malzeme Sarfiyatı (İsteğe Bağlı)
        </label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <select
            id="field-mat-select"
            className="form-input"
            style={{ flex: 2 }}
            value={selectedMatId}
            onChange={(e) => setSelectedMatId(e.target.value)}
          >
            {COMMON_FIELD_MATERIALS.map((m) => (
              <option key={m.id} value={m.id} style={{ background: "#0f172a" }}>
                {m.name} ({m.unit})
              </option>
            ))}
          </select>
          <input
            type="number"
            className="form-input"
            style={{ flex: 1 }}
            value={matQuantity}
            onChange={(e) => setMatQuantity(Number(e.target.value))}
            min="1"
          />
          <button
            type="button"
            className="btn"
            style={{
              background: "var(--accent-blue)",
              color: "#fff",
              padding: "0 1rem",
            }}
            onClick={addMaterial}
          >
            Ekle
          </button>
        </div>

        {/* Eklenen Malzemeler */}
        {consumedMaterials.length > 0 && (
          <div
            style={{
              marginTop: "0.8rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem",
            }}
          >
            {consumedMaterials.map((item) => (
              <div
                key={item.materialId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "rgba(255,255,255,0.05)",
                  padding: "0.4rem 0.8rem",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                }}
              >
                <span>
                  {item.name}:{" "}
                  <strong>
                    {item.quantity} {item.unit}
                  </strong>
                </span>
                <button
                  type="button"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#f87171",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                  }}
                  onClick={() => removeMaterial(item.materialId)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Yapılan İş Notu (Opsiyonel) */}
      <div className="form-group" style={{ marginBottom: "1.5rem" }}>
        <label className="form-label" htmlFor="field-work-summary">
          Yapılan İş Açıklaması (İsteğe Bağlı)
        </label>
        <textarea
          id="field-work-summary"
          className="form-input"
          style={{ width: "100%", minHeight: "70px", resize: "none" }}
          placeholder="Örn: 2. katın priz kabloları çekildi, pano sigortaları takıldı..."
          value={workSummary}
          onChange={(e) => setWorkSummary(e.target.value)}
        />
      </div>

      {/* Büyük Gönder Butonu */}
      <button
        type="button"
        className="btn btn-primary"
        style={{
          width: "100%",
          padding: "1.1rem",
          fontSize: "1.1rem",
          fontWeight: 800,
          background: "linear-gradient(135deg, #10b981, #06b6d4)",
        }}
        disabled={isSubmitting}
        onClick={handleSubmit}
      >
        {isSubmitting ? "Gönderiliyor..." : "✓ Bugünü Tamamla ve Gönder"}
      </button>
    </div>
  );
}
