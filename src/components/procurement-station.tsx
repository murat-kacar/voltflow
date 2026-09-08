"use client";

import { useId, useState } from "react";

interface LineItem {
  id: string;
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  unitCostWithoutVat: number;
  vatRate: number;
  newRetailSalePriceWithVat: number;
  shelfLocation: string;
}

interface DraftInvoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  paperExpectedTotal: number;
  items: LineItem[];
  notes: string;
  savedAt: string;
}

const COMMON_SUPPLIERS = [
  { id: "sup_oznur", companyName: "Öznur Kablo San. ve Tic. A.Ş." },
  { id: "sup_siemens", companyName: "Siemens Elektrik Distribütörü" },
  { id: "sup_viko", companyName: "Viko by Panasonic Toptancısı" },
  { id: "sup_mutlusan", companyName: "Mutlusan Plastik & Pano Ltd." },
];

const PRESET_MATERIALS = [
  {
    id: "mat-kbl-3x25",
    name: "Öznur NYM Antigron Kablo 3x2.5mm²",
    unit: "metre",
    defaultCost: 32.5,
    defaultSale: 48.0,
  },
  {
    id: "mat-kbl-3x15",
    name: "Öznur NYA Tek Damar Kablo 1.5mm²",
    unit: "metre",
    defaultCost: 14.2,
    defaultSale: 22.0,
  },
  {
    id: "mat-sig-40a",
    name: "Siemens 40A 30mA Kaçak Akım Rölesi",
    unit: "adet",
    defaultCost: 650.0,
    defaultSale: 890.0,
  },
  {
    id: "mat-sig-16a",
    name: "Siemens 16A B Tipi W-Otomat Sigorta",
    unit: "adet",
    defaultCost: 110.0,
    defaultSale: 165.0,
  },
  {
    id: "mat-prz-top",
    name: "Viko Karre Topraklı Priz (Beyaz)",
    unit: "adet",
    defaultCost: 45.0,
    defaultSale: 75.0,
  },
  {
    id: "mat-anahtar",
    name: "Viko Karre Tekli Anahtar (Beyaz)",
    unit: "adet",
    defaultCost: 42.0,
    defaultSale: 70.0,
  },
];

export function ProcurementStation() {
  const supplierSelectId = useId();
  const invoiceNumberId = useId();
  const paperTotalId = useId();
  const notesId = useId();
  const returnSupplierSelectId = useId();
  const returnMaterialSelectId = useId();
  const returnQtyInputId = useId();
  const returnReasonInputId = useId();
  const adjustMaterialSelectId = useId();
  const adjustQtyInputId = useId();
  const adjustReasonInputId = useId();

  const [supplierId, setSupplierId] = useState(COMMON_SUPPLIERS[0].id);
  const [invoiceNumber, setInvoiceNumber] = useState("FAT-2026-00421");
  const [paperExpectedTotal, setPaperExpectedTotal] = useState<number>(3132);
  const [notes, setNotes] = useState("");
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // HP-2.4 & HP-2.5: Taslak Faturalar
  const [drafts, setDrafts] = useState<DraftInvoice[]>([]);
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState(false);

  // HP-2.6: Toptancıya Malzeme İadesi
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnSupplierId, setReturnSupplierId] = useState(
    COMMON_SUPPLIERS[0].id,
  );
  const [returnMaterialId, setReturnMaterialId] = useState(
    PRESET_MATERIALS[0].id,
  );
  const [returnQty, setReturnQty] = useState<number>(1);
  const [returnReason, setReturnReason] = useState("Kusurlu/Kırık Malzeme");
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // HP-2.7: Depo Sayım Farkı & Fire
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustMaterialId, setAdjustMaterialId] = useState(
    PRESET_MATERIALS[0].id,
  );
  const [adjustQtyDelta, setAdjustQtyDelta] = useState<number>(-5);
  const [adjustReason, setAdjustReason] = useState(
    "Kablo firesi / Hurda düşümü",
  );
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);

  // Başlangıç örnek kalemleri
  const [items, setItems] = useState<LineItem[]>([
    {
      id: "line-1",
      materialId: PRESET_MATERIALS[0].id,
      materialName: PRESET_MATERIALS[0].name,
      quantity: 50,
      unit: "metre",
      unitCostWithoutVat: 32.5,
      vatRate: 20,
      newRetailSalePriceWithVat: 48.0,
      shelfLocation: "Raf A-1 (Kablo Rafı)",
    },
    {
      id: "line-2",
      materialId: PRESET_MATERIALS[2].id,
      materialName: PRESET_MATERIALS[2].name,
      quantity: 2,
      unit: "adet",
      unitCostWithoutVat: 650.0,
      vatRate: 20,
      newRetailSalePriceWithVat: 890.0,
      shelfLocation: "Raf S-3 (Pano Rafı)",
    },
  ]);

  // Canlı Hesaplama
  let calculatedSubtotal = 0;
  let calculatedVatTotal = 0;

  for (const item of items) {
    const lineSub = item.quantity * item.unitCostWithoutVat;
    const lineVat = lineSub * (item.vatRate / 100);
    calculatedSubtotal += lineSub;
    calculatedVatTotal += lineVat;
  }

  const calculatedGrandTotal =
    Math.round((calculatedSubtotal + calculatedVatTotal) * 100) / 100;
  const totalDifference =
    Math.round((calculatedGrandTotal - paperExpectedTotal) * 100) / 100;
  const isMatch = Math.abs(totalDifference) <= 0.05;

  const handleAddItem = () => {
    const defaultMat = PRESET_MATERIALS[1];
    setItems([
      ...items,
      {
        id: `line-${Date.now()}`,
        materialId: defaultMat.id,
        materialName: defaultMat.name,
        quantity: 10,
        unit: defaultMat.unit,
        unitCostWithoutVat: defaultMat.defaultCost,
        vatRate: 20,
        newRetailSalePriceWithVat: defaultMat.defaultSale,
        shelfLocation: "Raf B-1",
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      alert("En az bir fatura kalemi bulunmalıdır.");
      return;
    }
    setItems(items.filter((i) => i.id !== id));
  };

  const handleUpdateItem = (
    id: string,
    field: keyof LineItem,
    value: string | number,
  ) => {
    setItems(
      items.map((item) => {
        if (item.id !== id) return item;

        if (field === "materialId") {
          const matched = PRESET_MATERIALS.find((m) => m.id === value);
          if (matched) {
            return {
              ...item,
              materialId: matched.id,
              materialName: matched.name,
              unit: matched.unit,
              unitCostWithoutVat: matched.defaultCost,
              newRetailSalePriceWithVat: matched.defaultSale,
            };
          }
        }

        return { ...item, [field]: value };
      }),
    );
  };

  const lossLeaderCount = items.filter((i) => {
    const costWithVat = i.unitCostWithoutVat * (1 + i.vatRate / 100);
    return i.newRetailSalePriceWithVat < costWithVat;
  }).length;

  const handleApplyDraft = (draft: DraftInvoice) => {
    setInvoiceNumber(draft.invoiceNumber);
    setSupplierId(draft.supplierId);
    setPaperExpectedTotal(draft.paperExpectedTotal);
    setItems(draft.items);
    setNotes(draft.notes);
    setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
    setIsDraftsModalOpen(false);
    setStatusMessage({
      text: `📂 ${draft.invoiceNumber} numaralı taslak faturanın verileri yüklendi (HP-2.5).`,
      type: "info",
    });
  };

  const handleExecuteSupplierReturn = async () => {
    if (returnQty <= 0) {
      alert("İade miktarı sıfırdan büyük olmalıdır.");
      return;
    }
    setIsSubmittingReturn(true);
    try {
      const res = await fetch("/api/materials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: returnMaterialId,
          quantityChange: -Number(returnQty),
          movementType: "RETURN_IN",
          notes: `Tedarikçiye İade (${COMMON_SUPPLIERS.find((s) => s.id === returnSupplierId)?.companyName}): ${returnReason || "Kusurlu Malzeme"}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          text: `✅ Tedarikçiye ${returnQty} adet malzeme iadesi başarıyla işlendi (HP-2.6)! Stok düşüldü.`,
          type: "success",
        });
        setIsReturnModalOpen(false);
      } else {
        alert(`İade işlemi başarısız: ${data.error?.message || "Hata"}`);
      }
    } catch {
      alert("Ağ hatası oluştu.");
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const handleExecuteStockAdjustment = async () => {
    if (adjustQtyDelta === 0) {
      alert("Fark miktarı sıfırdan farklı olmalıdır.");
      return;
    }
    setIsSubmittingAdjustment(true);
    try {
      const res = await fetch("/api/materials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: adjustMaterialId,
          quantityChange: Number(adjustQtyDelta),
          movementType: "ADJUSTMENT",
          notes: `Sayım / Fire: ${adjustReason || "Depo sayım farkı"}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          text: `✅ Depo stok hareketi işlendi (HP-2.7): ${adjustQtyDelta > 0 ? "+" : ""}${adjustQtyDelta} birim düzeltme kaydedildi.`,
          type: "success",
        });
        setIsAdjustmentModalOpen(false);
      } else {
        alert(`Ayarlama başarısız: ${data.error?.message || "Hata"}`);
      }
    } catch {
      alert("Ağ hatası oluştu.");
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  const handleSubmit = async (isDraft: boolean) => {
    if (!isDraft && !isMatch) {
      setStatusMessage({
        text: `Fatura onaylanamaz! Masadaki kağıt toplamı (${paperExpectedTotal.toFixed(2)} ₺) ile hesaplanan tutar (${calculatedGrandTotal.toFixed(2)} ₺) arasında ${Math.abs(totalDifference).toFixed(2)} ₺ fark var.`,
        type: "error",
      });
      return;
    }

    if (!isDraft && lossLeaderCount > 0) {
      setStatusMessage({
        text: `🛡️ ZARARINA SATIŞ KALKANI: ${lossLeaderCount} kalemde satış fiyatı alış maliyetinin altındadır! Fatura bu şekilde onaylanamaz. Lütfen kırmızı kalemleri düzeltiniz.`,
        type: "error",
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const payload = {
        invoiceNumber,
        supplierId,
        expectedGrandTotal: paperExpectedTotal,
        isDraft,
        notes,
        items: items.map((i) => ({
          materialId: i.materialId,
          quantity: Number(i.quantity),
          unitCostWithoutVat: Number(i.unitCostWithoutVat),
          vatRate: Number(i.vatRate),
          newRetailSalePriceWithVat: Number(i.newRetailSalePriceWithVat),
          shelfLocation: i.shelfLocation,
        })),
      };

      const res = await fetch("/api/procurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Mal kabul işlemi başarısız.");
      }

      setStatusMessage({
        text: isDraft
          ? `💾 Fatura ${invoiceNumber} sunucuya taslak olarak kaydedildi. Stok ve cari değişmedi.`
          : `✅ Fatura ${invoiceNumber} onaylandı! ${items.length} kalem malzeme depoya alındı, toptancı borcu işlendi.`,
        type: "success",
      });
    } catch (err) {
      setStatusMessage({
        text: err instanceof Error ? err.message : "Bir hata oluştu",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="workspace-station procurement-station"
      style={{ maxWidth: "1280px", margin: "0 auto", padding: "1rem" }}
    >
      {/* Başlık ve Kalkan Göstergesi */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span>📥</span> Mal Kabul & Stok Giriş İstasyonu
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.85rem",
              marginTop: "0.2rem",
            }}
          >
            Toptancı fatura girişi, maliyet/kâr denetimi ve kuruşu kuruşuna dip
            toplam kalkanı
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {/* HP-2.4 & HP-2.5 Taslaklar Butonu */}
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: "0.8rem", padding: "0.45rem 0.8rem" }}
            onClick={() => setIsDraftsModalOpen(true)}
          >
            📂 Bekleyen Taslaklar ({drafts.length})
          </button>

          {/* HP-2.6 Tedarikçiye İade Butonu */}
          <button
            type="button"
            className="btn btn-secondary"
            style={{
              fontSize: "0.8rem",
              padding: "0.45rem 0.8rem",
              color: "#f87171",
            }}
            onClick={() => setIsReturnModalOpen(true)}
          >
            ↩️ Tedarikçiye İade (HP-2.6)
          </button>

          {/* HP-2.7 Sayım Farkı / Fire Butonu */}
          <button
            type="button"
            className="btn btn-secondary"
            style={{
              fontSize: "0.8rem",
              padding: "0.45rem 0.8rem",
              color: "#f59e0b",
            }}
            onClick={() => setIsAdjustmentModalOpen(true)}
          >
            ⚖️ Sayım Farkı / Fire (HP-2.7)
          </button>

          <div
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "20px",
              background: isMatch
                ? "rgba(16, 185, 129, 0.15)"
                : "rgba(239, 68, 68, 0.15)",
              border: `1px solid ${isMatch ? "#10b981" : "#ef4444"}`,
              color: isMatch ? "#10b981" : "#ef4444",
              fontSize: "0.85rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <span>{isMatch ? "🛡️" : "⚠️"}</span>
            <span>
              {isMatch
                ? "Dip Toplam Kalkanı: Tam Eşleşti"
                : `Kuruş Farkı: ${totalDifference > 0 ? "+" : ""}${totalDifference.toFixed(2)} ₺`}
            </span>
          </div>
        </div>
      </div>

      {/* HP-2.2 ZARARINA SATIŞ KALKANI UYARISI */}
      {lossLeaderCount > 0 && (
        <div
          style={{
            padding: "0.8rem 1.2rem",
            borderRadius: "8px",
            marginBottom: "1.2rem",
            background: "rgba(239, 68, 68, 0.18)",
            border: "1px solid #ef4444",
            color: "#fca5a5",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <span style={{ fontSize: "1.3rem" }}>🛡️</span>
          <div>
            <strong>ZARARINA SATIŞ KALKANI DEVREDE (HP-2.2):</strong> Faturadaki{" "}
            {lossLeaderCount} kalemin satış fiyatı alış maliyetinin altında
            belirlenmiştir. Zararına satış engellenmiştir; onaylamadan önce
            satış fiyatlarını maliyetin üzerine çekiniz.
          </div>
        </div>
      )}

      {statusMessage && (
        <div
          style={{
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "1.2rem",
            background:
              statusMessage.type === "success"
                ? "rgba(16, 185, 129, 0.2)"
                : "rgba(239, 68, 68, 0.2)",
            border: `1px solid ${statusMessage.type === "success" ? "#10b981" : "#ef4444"}`,
            color: statusMessage.type === "success" ? "#10b981" : "#fca5a5",
            fontSize: "0.9rem",
          }}
        >
          {statusMessage.text}
        </div>
      )}

      {/* 1. ÜST PANEL: Fatura Başlık Bilgileri ve Masadaki Kağıt Toplamı */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "1.25rem",
          marginBottom: "1.5rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1rem",
        }}
      >
        <div>
          <label
            htmlFor={supplierSelectId}
            className="form-label"
            style={{ display: "block", marginBottom: "0.4rem" }}
          >
            Tedarikçi / Toptancı Firma
          </label>
          <select
            id={supplierSelectId}
            className="form-input"
            style={{ width: "100%" }}
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
          >
            {COMMON_SUPPLIERS.map((s) => (
              <option key={s.id} value={s.id} style={{ background: "#0f172a" }}>
                {s.companyName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor={invoiceNumberId}
            className="form-label"
            style={{ display: "block", marginBottom: "0.4rem" }}
          >
            Fatura / İrsaliye Seri-No
          </label>
          <input
            id={invoiceNumberId}
            type="text"
            className="form-input"
            style={{ width: "100%" }}
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="Örn: GIB20260000421"
          />
        </div>

        {/* MASADAKİ KAĞIT FATURA DİP TOPLAMI (Kritik Doğrulama Alanı) */}
        <div
          style={{
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            borderRadius: "8px",
            padding: "0.6rem 0.8rem",
          }}
        >
          <label
            htmlFor={paperTotalId}
            className="form-label"
            style={{
              display: "block",
              marginBottom: "0.2rem",
              color: "#f59e0b",
              fontWeight: 700,
            }}
          >
            📄 Kağıt Fatura Genel Toplamı (KDV Dahil)
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <input
              id={paperTotalId}
              type="number"
              step="0.01"
              className="form-input"
              style={{
                width: "100%",
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "#f59e0b",
              }}
              value={paperExpectedTotal}
              onChange={(e) => setPaperExpectedTotal(Number(e.target.value))}
            />
            <span style={{ color: "#f59e0b", fontWeight: 700 }}>₺</span>
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
            Masadaki kağıdın dip toplamını yazınız.
          </span>
        </div>

        <div>
          <label
            htmlFor={notesId}
            className="form-label"
            style={{ display: "block", marginBottom: "0.4rem" }}
          >
            Teslimat / İrsaliye Notu
          </label>
          <input
            id={notesId}
            type="text"
            className="form-input"
            style={{ width: "100%" }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Örn: 1. parti koli teslim alındı"
          />
        </div>
      </div>

      {/* 2. ORTA PANEL: Kalem Giriş Tablosu (Excel Rahatlığında) */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "1.25rem",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
            Fatura Kalemleri ({items.length} Kalem)
          </h2>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}
            onClick={handleAddItem}
          >
            + Yeni Kalem Ekle
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.85rem",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                  textAlign: "left",
                }}
              >
                <th style={{ padding: "0.6rem" }}>Malzeme</th>
                <th style={{ padding: "0.6rem", width: "110px" }}>Miktar</th>
                <th style={{ padding: "0.6rem", width: "130px" }}>
                  Alış Fiyatı (KDV Hariç)
                </th>
                <th style={{ padding: "0.6rem", width: "80px" }}>KDV %</th>
                <th style={{ padding: "0.6rem", width: "140px" }}>
                  Yeni Satış Fiyatı (KDV Dahil)
                </th>
                <th style={{ padding: "0.6rem", width: "130px" }}>
                  Raf Konumu
                </th>
                <th
                  style={{
                    padding: "0.6rem",
                    width: "110px",
                    textAlign: "right",
                  }}
                >
                  Kalem Tutarı
                </th>
                <th style={{ padding: "0.6rem", width: "50px" }} />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const lineTotal =
                  item.quantity *
                  item.unitCostWithoutVat *
                  (1 + item.vatRate / 100);
                const costWithVat =
                  item.unitCostWithoutVat * (1 + item.vatRate / 100);
                const isUnderCost =
                  item.newRetailSalePriceWithVat < costWithVat;

                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    {/* Malzeme Seçimi */}
                    <td style={{ padding: "0.6rem" }}>
                      <select
                        className="form-input"
                        style={{ width: "100%", fontSize: "0.85rem" }}
                        value={item.materialId}
                        onChange={(e) =>
                          handleUpdateItem(
                            item.id,
                            "materialId",
                            e.target.value,
                          )
                        }
                      >
                        {PRESET_MATERIALS.map((m) => (
                          <option
                            key={m.id}
                            value={m.id}
                            style={{ background: "#0f172a" }}
                          >
                            {m.name} ({m.unit})
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Miktar */}
                    <td style={{ padding: "0.6rem" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.3rem",
                        }}
                      >
                        <input
                          type="number"
                          className="form-input"
                          style={{ width: "70px", padding: "0.35rem" }}
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateItem(
                              item.id,
                              "quantity",
                              Number(e.target.value),
                            )
                          }
                        />
                        <span
                          style={{
                            color: "var(--text-secondary)",
                            fontSize: "0.75rem",
                          }}
                        >
                          {item.unit}
                        </span>
                      </div>
                    </td>

                    {/* Alış Fiyatı */}
                    <td style={{ padding: "0.6rem" }}>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        style={{ width: "100%", padding: "0.35rem" }}
                        value={item.unitCostWithoutVat}
                        onChange={(e) =>
                          handleUpdateItem(
                            item.id,
                            "unitCostWithoutVat",
                            Number(e.target.value),
                          )
                        }
                      />
                    </td>

                    {/* KDV % */}
                    <td style={{ padding: "0.6rem" }}>
                      <select
                        className="form-input"
                        style={{ width: "100%", padding: "0.35rem" }}
                        value={item.vatRate}
                        onChange={(e) =>
                          handleUpdateItem(
                            item.id,
                            "vatRate",
                            Number(e.target.value),
                          )
                        }
                      >
                        <option value={20} style={{ background: "#0f172a" }}>
                          %20
                        </option>
                        <option value={10} style={{ background: "#0f172a" }}>
                          %10
                        </option>
                        <option value={0} style={{ background: "#0f172a" }}>
                          %0
                        </option>
                      </select>
                    </td>

                    {/* Yeni Satış Fiyatı ve Kâr Marjı Uyarısı */}
                    <td style={{ padding: "0.6rem" }}>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        style={{
                          width: "100%",
                          padding: "0.35rem",
                          border: isUnderCost ? "1px solid #ef4444" : undefined,
                        }}
                        value={item.newRetailSalePriceWithVat}
                        onChange={(e) =>
                          handleUpdateItem(
                            item.id,
                            "newRetailSalePriceWithVat",
                            Number(e.target.value),
                          )
                        }
                      />
                      {isUnderCost && (
                        <div
                          style={{
                            color: "#ef4444",
                            fontSize: "0.7rem",
                            marginTop: "0.2rem",
                          }}
                        >
                          ⚠️ Zararına satış! Maliyet: {costWithVat.toFixed(1)} ₺
                        </div>
                      )}
                    </td>

                    {/* Raf Konumu */}
                    <td style={{ padding: "0.6rem" }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ width: "100%", padding: "0.35rem" }}
                        value={item.shelfLocation}
                        onChange={(e) =>
                          handleUpdateItem(
                            item.id,
                            "shelfLocation",
                            e.target.value,
                          )
                        }
                      />
                    </td>

                    {/* Kalem Tutarı */}
                    <td
                      style={{
                        padding: "0.6rem",
                        textAlign: "right",
                        fontWeight: 700,
                        color: "#fff",
                      }}
                    >
                      {lineTotal.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      ₺
                    </td>

                    {/* Sil Butonu */}
                    <td style={{ padding: "0.6rem", textAlign: "center" }}>
                      <button
                        type="button"
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          fontSize: "1rem",
                        }}
                        onClick={() => handleRemoveItem(item.id)}
                        title="Kalemi Sil"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. ALT PANEL: Dip Toplam Sağlaması & Onay Butonları */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.5rem",
        }}
      >
        {/* Sol: Detaylı KDV ve Matrah Dökümü */}
        <div
          style={{
            display: "flex",
            gap: "2rem",
            fontSize: "0.85rem",
            color: "var(--text-secondary)",
          }}
        >
          <div>
            <span>Ara Toplam (KDV Hariç): </span>
            <strong style={{ color: "#fff" }}>
              {calculatedSubtotal.toLocaleString("tr-TR", {
                minimumFractionDigits: 2,
              })}{" "}
              ₺
            </strong>
          </div>
          <div>
            <span>Hesaplanan KDV (%20): </span>
            <strong style={{ color: "#fff" }}>
              {calculatedVatTotal.toLocaleString("tr-TR", {
                minimumFractionDigits: 2,
              })}{" "}
              ₺
            </strong>
          </div>
        </div>

        {/* Sağ: Genel Toplam Karşılaştırması ve Aksiyon Butonları */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ textAlign: "right" }}>
            <div
              style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}
            >
              Kalemlerden Hesaplanan Toplam
            </div>
            <div
              style={{
                fontSize: "1.4rem",
                fontWeight: 800,
                color: isMatch ? "#10b981" : "#ef4444",
              }}
            >
              {calculatedGrandTotal.toLocaleString("tr-TR", {
                minimumFractionDigits: 2,
              })}{" "}
              ₺
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: "0.75rem 1.25rem", fontSize: "0.95rem" }}
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
          >
            💾 Taslak Kaydet
          </button>

          <button
            type="button"
            className="btn btn-primary"
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "0.95rem",
              background: isMatch ? "#10b981" : "#475569",
              cursor: isMatch ? "pointer" : "not-allowed",
            }}
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting || !isMatch}
          >
            {isSubmitting ? "Kaydediliyor..." : "✅ Faturayı Onayla & Stoğa Al"}
          </button>
        </div>
      </div>

      {/* MODAL 1: BEKLEYEN TASLAK FATURALAR (HP-2.4 & HP-2.5) */}
      {isDraftsModalOpen && (
        <div className="modal-overlay">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="İşlem penceresi"
            className="modal-container"
            style={{ maxWidth: "560px" }}
          >
            <div className="modal-header">
              <h2
                style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}
              >
                📂 Bekleyen Taslak Faturalar ({drafts.length})
              </h2>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsDraftsModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: "1rem 0" }}>
              {drafts.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    color: "var(--text-secondary)",
                    padding: "2rem 0",
                  }}
                >
                  Kaydedilmiş taslak fatura bulunmuyor.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.8rem",
                  }}
                >
                  {drafts.map((d) => (
                    <div
                      key={d.id}
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        padding: "0.8rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: "#fff" }}>
                          {d.invoiceNumber} &bull;{" "}
                          {
                            COMMON_SUPPLIERS.find((s) => s.id === d.supplierId)
                              ?.companyName
                          }
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          Kaydedilme: {d.savedAt} &bull; {d.items.length} Kalem
                          &bull; Hedef:{" "}
                          {d.paperExpectedTotal.toLocaleString("tr-TR")} ₺
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.35rem 0.7rem",
                          }}
                          onClick={() => handleApplyDraft(d)}
                        >
                          Devam Et (HP-2.5)
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.35rem 0.5rem",
                            color: "#f87171",
                          }}
                          onClick={() =>
                            setDrafts((prev) =>
                              prev.filter((x) => x.id !== d.id),
                            )
                          }
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: TEDARİKÇİYE MALZEME İADESİ (HP-2.6) */}
      {isReturnModalOpen && (
        <div className="modal-overlay">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="İşlem penceresi"
            className="modal-container"
            style={{ maxWidth: "460px" }}
          >
            <div className="modal-header">
              <h2
                style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}
              >
                ↩️ Tedarikçiye İade Çıkışı (HP-2.6)
              </h2>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsReturnModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: "1rem 0" }}>
              <div style={{ marginBottom: "0.8rem" }}>
                <label
                  htmlFor={returnSupplierSelectId}
                  className="form-label"
                  style={{ display: "block", marginBottom: "0.3rem" }}
                >
                  İade Edilecek Toptancı:
                </label>
                <select
                  id={returnSupplierSelectId}
                  className="form-input"
                  style={{ width: "100%" }}
                  value={returnSupplierId}
                  onChange={(e) => setReturnSupplierId(e.target.value)}
                >
                  {COMMON_SUPPLIERS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "0.8rem" }}>
                <label
                  htmlFor={returnMaterialSelectId}
                  className="form-label"
                  style={{ display: "block", marginBottom: "0.3rem" }}
                >
                  İade Edilecek Malzeme:
                </label>
                <select
                  id={returnMaterialSelectId}
                  className="form-input"
                  style={{ width: "100%" }}
                  value={returnMaterialId}
                  onChange={(e) => setReturnMaterialId(e.target.value)}
                >
                  {PRESET_MATERIALS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "0.8rem",
                  marginBottom: "0.8rem",
                }}
              >
                <div style={{ flex: 1 }}>
                  <label
                    htmlFor={returnQtyInputId}
                    className="form-label"
                    style={{ display: "block", marginBottom: "0.3rem" }}
                  >
                    İade Miktarı:
                  </label>
                  <input
                    id={returnQtyInputId}
                    type="number"
                    min="1"
                    className="form-input"
                    style={{ width: "100%" }}
                    value={returnQty}
                    onChange={(e) => setReturnQty(Number(e.target.value))}
                  />
                </div>
                <div style={{ flex: 2 }}>
                  <label
                    htmlFor={returnReasonInputId}
                    className="form-label"
                    style={{ display: "block", marginBottom: "0.3rem" }}
                  >
                    İade Nedeni:
                  </label>
                  <input
                    id={returnReasonInputId}
                    type="text"
                    className="form-input"
                    style={{ width: "100%" }}
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                style={{
                  width: "100%",
                  padding: "0.8rem",
                  background: "#ef4444",
                }}
                disabled={isSubmittingReturn}
                onClick={handleExecuteSupplierReturn}
              >
                {isSubmittingReturn
                  ? "İşleniyor..."
                  : "✓ Stoktan Düş ve Toptancıya İadeyi Onayla"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SAYIM FARKI / FİRE / HURDA DÜŞÜMÜ (HP-2.7) */}
      {isAdjustmentModalOpen && (
        <div className="modal-overlay">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="İşlem penceresi"
            className="modal-container"
            style={{ maxWidth: "460px" }}
          >
            <div className="modal-header">
              <h2
                style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}
              >
                ⚖️ Depo Sayım Farkı / Fire Düşümü (HP-2.7)
              </h2>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsAdjustmentModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: "1rem 0" }}>
              <div style={{ marginBottom: "0.8rem" }}>
                <label
                  htmlFor={adjustMaterialSelectId}
                  className="form-label"
                  style={{ display: "block", marginBottom: "0.3rem" }}
                >
                  Düzeltilecek Malzeme:
                </label>
                <select
                  id={adjustMaterialSelectId}
                  className="form-input"
                  style={{ width: "100%" }}
                  value={adjustMaterialId}
                  onChange={(e) => setAdjustMaterialId(e.target.value)}
                >
                  {PRESET_MATERIALS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "0.8rem",
                  marginBottom: "0.8rem",
                }}
              >
                <div style={{ flex: 1 }}>
                  <label
                    htmlFor={adjustQtyInputId}
                    className="form-label"
                    style={{ display: "block", marginBottom: "0.3rem" }}
                  >
                    Fark (Delta):
                  </label>
                  <input
                    id={adjustQtyInputId}
                    type="number"
                    className="form-input"
                    style={{ width: "100%" }}
                    value={adjustQtyDelta}
                    onChange={(e) => setAdjustQtyDelta(Number(e.target.value))}
                    placeholder="-5 veya +10"
                  />
                  <span
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Eksi: Fire/Eksik, Artı: Fazla
                  </span>
                </div>
                <div style={{ flex: 2 }}>
                  <label
                    htmlFor={adjustReasonInputId}
                    className="form-label"
                    style={{ display: "block", marginBottom: "0.3rem" }}
                  >
                    Gerekçe / Açıklama:
                  </label>
                  <input
                    id={adjustReasonInputId}
                    type="text"
                    className="form-input"
                    style={{ width: "100%" }}
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                style={{
                  width: "100%",
                  padding: "0.8rem",
                  background: "#f59e0b",
                }}
                disabled={isSubmittingAdjustment}
                onClick={handleExecuteStockAdjustment}
              >
                {isSubmittingAdjustment
                  ? "İşleniyor..."
                  : "✓ Depo Sayım Hareketini Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
