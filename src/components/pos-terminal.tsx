"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { getCatalogCache, setCatalogCache } from "@/lib/offline-storage";
import { apiCallWithOfflineFallback } from "@/lib/offline-sync";

interface MaterialItem {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  salePriceWithVat: number;
}

interface CartItem {
  material: MaterialItem;
  quantity: number;
}

interface CustomerAccount {
  id: string;
  name: string;
  currentBalance: number;
}

interface ServerInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName?: string;
  grandTotal: number;
  discountTotal: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  notes?: string;
  createdAt: string;
}

interface CompletedReceipt {
  invoiceNumber: string;
  date: string;
  items: CartItem[];
  grandTotal: number;
  discountTotal: number;
  paymentMethod: string;
  customerName: string;
  isReturn: boolean;
  isOffline?: boolean;
}

const SAMPLE_MATERIALS: MaterialItem[] = [
  {
    id: "m_1",
    code: "KBL-3X2.5",
    name: "Hes Kablo 3x2.5mm² Antigron",
    category: "KABLO",
    unit: "metre",
    quantity: 450,
    salePriceWithVat: 34.5,
  },
  {
    id: "m_2",
    code: "SGT-16A",
    name: "Schneider 16A B Tipi Otomat Sigorta",
    category: "SALT_SIGORTA",
    unit: "adet",
    quantity: 85,
    salePriceWithVat: 145.0,
  },
  {
    id: "m_3",
    code: "KAR-40A",
    name: "Siemens 40A 30mA Kaçak Akım Rölesi",
    category: "SALT_SIGORTA",
    unit: "adet",
    quantity: 18,
    salePriceWithVat: 890.0,
  },
  {
    id: "m_4",
    code: "PRZ-VIKO",
    name: "Viko Karre Topraklı Priz (Beyaz)",
    category: "PRIZ_ANAHTAR",
    unit: "adet",
    quantity: 120,
    salePriceWithVat: 68.0,
  },
  {
    id: "m_5",
    code: "ANH-VIKO",
    name: "Viko Karre Tekli Anahtar",
    category: "PRIZ_ANAHTAR",
    unit: "adet",
    quantity: 90,
    salePriceWithVat: 62.0,
  },
  {
    id: "m_6",
    code: "LED-SPOT",
    name: "Philips 7W Sıva Altı LED Spot",
    category: "AYDINLATMA",
    unit: "adet",
    quantity: 60,
    salePriceWithVat: 110.0,
  },
  {
    id: "m_7",
    code: "KLM-WAGO",
    name: "Wago 221-413 3'lü Buat Klemensi",
    category: "SARF",
    unit: "adet",
    quantity: 500,
    salePriceWithVat: 14.0,
  },
  {
    id: "m_8",
    code: "BND-IZOLE",
    name: "Globe PVC Elektrik İzolasyon Bandı",
    category: "SARF",
    unit: "adet",
    quantity: 200,
    salePriceWithVat: 25.0,
  },
];

export function PosTerminal() {
  void SAMPLE_MATERIALS;
  const customerInputId = useId();
  const discountInputId = useId();
  const quickCodeId = useId();
  const quickNameId = useId();
  const quickPriceId = useId();
  const quickUnitId = useId();
  const quickQtyId = useId();

  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("TÜMÜ");
  const [customerName, setCustomerName] = useState("");
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] =
    useState<string>("CUST-WALKIN");
  const [paymentMethod, setPaymentMethod] = useState<
    "CASH" | "CREDIT_CARD" | "OPEN_ACCOUNT"
  >("CASH");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [returnType, setReturnType] = useState<"CASH" | "CREDIT_ACCOUNT">(
    "CASH",
  );
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Modallar
  const [lastReceipt, setLastReceipt] = useState<CompletedReceipt | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isRecentReceiptsOpen, setIsRecentReceiptsOpen] = useState(false);
  const [serverInvoices, setServerInvoices] = useState<ServerInvoice[]>([]);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isCartInspectorOpen, setIsCartInspectorOpen] = useState(false);
  const [customTargetTotal, setCustomTargetTotal] = useState<string>("");
  const [isCancelingInvoice, setIsCancelingInvoice] = useState(false);

  // Hızlı Ürün Ekleme State
  const [quickCode, setQuickCode] = useState("");
  const [quickName, setQuickName] = useState("");
  const [quickPrice, setQuickPrice] = useState<number>(50);
  const [quickUnit, setQuickUnit] = useState("adet");
  const [quickQty, setQuickQty] = useState<number>(10);

  const fetchRecentSales = useCallback(async () => {
    try {
      const res = await fetch("/api/sales");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setServerInvoices(json.data);
      }
    } catch (_e) {}
  }, []);

  useEffect(() => {
    // 1. Önce IndexedDB önbelleğini dene (varsa anında yükle, sıfır bekleme)
    getCatalogCache<MaterialItem[]>("materials").then((cached) => {
      if (cached && cached.length > 0) {
        setMaterials(cached);
      }
    });

    // 2. Canlı API'yi çağır ve önbelleği güncelle
    fetch("/api/materials")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data && json.data.length > 0) {
          setMaterials(json.data);
          setCatalogCache("materials", json.data);
        }
      })
      .catch(() => {});

    // 3. Müşterileri çek (HP-1.3 Açık Hesap)
    fetch("/api/finance")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.customers) {
          setCustomers(
            json.data.customers.map(
              (c: { id: string; name: string; currentBalance?: number }) => ({
                id: c.id,
                name: c.name,
                currentBalance: c.currentBalance || 0,
              }),
            ),
          );
        }
      })
      .catch(() => {});

    // 4. Son kesilen fişleri çek (HP-1.8 & HP-1.9)
    fetchRecentSales();
  }, [fetchRecentSales]);

  const filteredMaterials = materials.filter((m) => {
    const matchesCategory =
      selectedCategory === "TÜMÜ" || m.category === selectedCategory;
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (material: MaterialItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.material.id === material.id);
      if (existing) {
        return prev.map((item) =>
          item.material.id === material.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { material, quantity: 1 }];
    });
  };

  const updateQuantity = (materialId: string, delta: number) => {
    setCart(
      (prev) =>
        prev
          .map((item) => {
            if (item.material.id === materialId) {
              const newQty = item.quantity + delta;
              return newQty > 0 ? { ...item, quantity: newQty } : null;
            }
            return item;
          })
          .filter(Boolean) as CartItem[],
    );
  };

  const subtotalBeforeDiscount = cart.reduce(
    (sum, item) => sum + item.quantity * item.material.salePriceWithVat,
    0,
  );
  const finalGrandTotal = Math.max(0, subtotalBeforeDiscount - discountAmount);

  const handleCancelInvoice = async (invoiceId: string) => {
    if (
      !window.confirm(
        "Bu fiş tamamen iptal edilecek, malzemeler depoya geri dönecek ve kasa/cari hareketi ters kayıtla sıfırlanacaktır. Onaylıyor musunuz?",
      )
    ) {
      return;
    }
    setIsCancelingInvoice(true);
    try {
      const res = await fetch(
        `/api/sales?invoiceId=${invoiceId}&reason=Tezgâh+hatalı+fiş+iptali`,
        {
          method: "DELETE",
        },
      );
      const data = await res.json();
      if (data.success) {
        alert(
          "✅ Fiş başarıyla iptal edildi! Stoklar depoya geri alındı, kasa/cari ters kayıtla düzeltildi.",
        );
        await fetchRecentSales();
        fetch("/api/materials")
          .then((r) => r.json())
          .then((j) => j.success && setMaterials(j.data));
      } else {
        alert(`İptal başarısız: ${data.error?.message || "Hata"}`);
      }
    } catch {
      alert("İptal işlemi sırasında hata oluştu.");
    } finally {
      setIsCancelingInvoice(false);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);

    const invoiceNumber = `FS-${Date.now().toString().slice(-6)}`;
    const effectivePayment = isReturnMode
      ? returnType === "CASH"
        ? "CASH"
        : "OPEN_ACCOUNT"
      : paymentMethod;

    const salePayload = {
      invoiceNumber,
      customerId: selectedCustomerId,
      paymentMethod: effectivePayment,
      discountTotal: discountAmount,
      items: cart.map((c) => ({
        materialId: c.material.id,
        quantity: c.quantity,
        unitPrice: c.material.salePriceWithVat,
      })),
      notes: isReturnMode
        ? `İADE FİŞİ (${returnType === "CASH" ? "Peşin İade" : "Cari Borçtan Düşme"}): ${customerName || "Perakende"}`
        : customerName || "Perakende Tezgâh Satışı",
    };

    const res = await apiCallWithOfflineFallback(
      "/api/sales",
      {
        method: "POST",
        body: salePayload,
      },
      {
        label: `${isReturnMode ? "İade Fişi" : "Tezgâh Satışı"}: ${customerName || "Perakende"} (${finalGrandTotal.toFixed(2)} ₺)`,
        station: "POS",
      },
    );

    if (!res.success) {
      alert(res.message);
      setIsCheckingOut(false);
      return;
    }

    const completed: CompletedReceipt = {
      invoiceNumber,
      date: new Date().toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      items: [...cart],
      grandTotal: finalGrandTotal,
      discountTotal: discountAmount,
      paymentMethod: isReturnMode
        ? `İADE (${returnType === "CASH" ? "Nakit Çıkış" : "Cari Borçtan Düşme"})`
        : paymentMethod === "CASH"
          ? "Nakit"
          : paymentMethod === "CREDIT_CARD"
            ? "Kredi Kartı"
            : "Açık Hesap (Veresiye)",
      customerName: customerName || "Perakende Müşteri",
      isReturn: isReturnMode,
      isOffline: res.offline,
    };

    setLastReceipt(completed);
    setCart([]);
    setDiscountAmount(0);
    setIsReturnMode(false);
    setIsCheckingOut(false);
    fetchRecentSales();
  };

  const handleQuickAddMaterial = async () => {
    if (!quickName) {
      alert("Malzeme adı zorunludur.");
      return;
    }

    const code = quickCode || `KOD-${Date.now().toString().slice(-4)}`;
    const newMat: MaterialItem = {
      id: `mat_${Date.now()}`,
      code,
      name: quickName,
      category: "SARF",
      unit: quickUnit,
      quantity: quickQty,
      salePriceWithVat: quickPrice,
    };

    await apiCallWithOfflineFallback(
      "/api/materials",
      {
        method: "POST",
        body: {
          id: newMat.id,
          code: newMat.code,
          name: newMat.name,
          category: newMat.category,
          unit: newMat.unit,
          quantity: newMat.quantity,
          salePriceWithVat: newMat.salePriceWithVat,
          purchasePriceWithoutVat: Math.round(newMat.salePriceWithVat * 0.7),
          minStockAlert: 5,
        },
      },
      {
        label: `Yeni Malzeme: ${newMat.name}`,
        station: "POS",
      },
    );

    setMaterials((prev) => [newMat, ...prev]);
    addToCart(newMat);
    setIsQuickAddOpen(false);
    setQuickCode("");
    setQuickName("");
  };

  return (
    <div className="pos-container">
      {/* Sol Panel: Hızlı Ürün Kataloğu */}
      <div className="pos-catalog workspace-main">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}>
              Hızlı Ürün Kataloğu
            </h2>
            <span
              style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}
            >
              {isReturnMode
                ? "↩️ İADE ALMA MODU: Tıklanan ürünler iade sepetine eklenir."
                : "● Barkod & Dokunmatik Tezgâh Satışı"}
            </span>
          </div>

          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button
              type="button"
              className="btn btn-secondary mobile-inspector-trigger"
              style={{ fontSize: "0.8rem", padding: "0.35rem 0.7rem" }}
              onClick={() => setIsCartInspectorOpen(true)}
            >
              🧾 Sepet {cart.length > 0 ? `(${cart.length})` : ""}
            </button>
            <button
              type="button"
              className={`btn ${isReturnMode ? "btn-primary" : "btn-secondary"}`}
              style={{
                fontSize: "0.8rem",
                padding: "0.35rem 0.7rem",
                background: isReturnMode ? "#ef4444" : undefined,
              }}
              onClick={() => setIsReturnMode(!isReturnMode)}
            >
              {isReturnMode ? "✕ İadeyi Kapat" : "↩️ İade Modu"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: "0.8rem", padding: "0.35rem 0.7rem" }}
              onClick={() => setIsRecentReceiptsOpen(true)}
            >
              📜 Son Fişler
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: "0.8rem", padding: "0.35rem 0.7rem" }}
              onClick={() => setIsQuickAddOpen(true)}
            >
              + Hızlı Malzeme Aç
            </button>
          </div>
        </div>

        {/* Arama */}
        <input
          type="text"
          className="form-input"
          style={{ width: "100%", marginTop: "0.75rem" }}
          placeholder="Malzeme adı veya kod ile ara (örn: 3x2.5, sigorta, priz)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {/* Kategori Hapları */}
        <div className="category-pills">
          {[
            "TÜMÜ",
            "KABLO",
            "SALT_SIGORTA",
            "PRIZ_ANAHTAR",
            "AYDINLATMA",
            "SARF",
          ].map((cat) => (
            <button
              key={cat}
              type="button"
              className={`pill-btn ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Malzeme Grid */}
        <div className="materials-grid">
          {filteredMaterials.map((mat) => (
            <button
              key={mat.id}
              type="button"
              className="material-card"
              style={{
                border: isReturnMode
                  ? "1px solid rgba(239, 68, 68, 0.4)"
                  : undefined,
              }}
              onClick={() => addToCart(mat)}
            >
              <div className="mat-code">{mat.code}</div>
              <div className="mat-name">{mat.name}</div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "0.5rem",
                }}
              >
                <span className="mat-price">
                  {mat.salePriceWithVat.toFixed(2)} ₺
                </span>
                <span className="mat-stock">
                  Stok: {mat.quantity} {mat.unit}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sağ Panel: Sepet ve Kasa */}
      <aside
        className={`pos-cart inspector-panel ${isCartInspectorOpen ? "is-open" : ""}`}
        aria-label="Sepet ve ödeme detayı"
      >
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}>
              {isReturnMode ? "↩️ İade Fişi" : "Sepet / Tezgâh Fişi"}
            </h2>
            <button
              type="button"
              className="inspector-close"
              aria-label="Sepeti kapat"
              onClick={() => setIsCartInspectorOpen(false)}
            >
              ✕
            </button>
            {cart.length > 0 && (
              <button
                type="button"
                style={{
                  background: "none",
                  border: "none",
                  color: "#ef4444",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
                onClick={() => setCart([])}
              >
                Temizle
              </button>
            )}
          </div>

          {/* HP-1.3 MÜŞTERİ / CARİ SEÇİMİ VE KIRMIZI BORÇ UYARISI */}
          <div style={{ marginTop: "0.75rem" }}>
            <label
              className="form-label"
              htmlFor={customerInputId}
              style={{ display: "block", marginBottom: "0.3rem" }}
            >
              Müşteri / Cari Seçimi (HP-1.3)
            </label>
            <select
              id={customerInputId}
              className="form-input"
              style={{ width: "100%" }}
              value={selectedCustomerId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedCustomerId(val);
                const found = customers.find((c) => c.id === val);
                if (found) {
                  setCustomerName(found.name);
                } else {
                  setCustomerName("");
                }
              }}
            >
              <option value="CUST-WALKIN">
                👤 Perakende Müşteri (CUST-WALKIN)
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  🏢 {c.name} (Borç: {c.currentBalance.toLocaleString("tr-TR")}{" "}
                  ₺)
                </option>
              ))}
            </select>

            {/* Kırmızı Borç Kalkanı Uyarısı */}
            {selectedCustomerId !== "CUST-WALKIN" && (
              <div
                style={{
                  marginTop: "0.4rem",
                  padding: "0.4rem 0.6rem",
                  borderRadius: "6px",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#f87171",
                  fontSize: "0.75rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>⚠️ Müteahhit Güncel Açık Hesap Borcu:</span>
                <strong>
                  {(
                    customers.find((c) => c.id === selectedCustomerId)
                      ?.currentBalance || 0
                  ).toLocaleString("tr-TR")}{" "}
                  ₺
                </strong>
              </div>
            )}
          </div>

          {/* İADE MODU SEÇENEKLERİ (HP-1.6 & HP-1.7) */}
          {isReturnMode && (
            <div
              style={{
                marginTop: "0.6rem",
                padding: "0.6rem",
                borderRadius: "6px",
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px dashed #ef4444",
              }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#f87171",
                  marginBottom: "0.4rem",
                }}
              >
                ↩️ İade Karşılığı Ödeme Yöntemi:
              </span>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <button
                  type="button"
                  className={`btn ${returnType === "CASH" ? "btn-primary" : "btn-secondary"}`}
                  style={{
                    flex: 1,
                    fontSize: "0.75rem",
                    padding: "0.3rem",
                    background: returnType === "CASH" ? "#ef4444" : undefined,
                  }}
                  onClick={() => setReturnType("CASH")}
                >
                  💵 Peşin / Nakit İade (HP-1.6)
                </button>
                <button
                  type="button"
                  className={`btn ${returnType === "CREDIT_ACCOUNT" ? "btn-primary" : "btn-secondary"}`}
                  style={{
                    flex: 1,
                    fontSize: "0.75rem",
                    padding: "0.3rem",
                    background:
                      returnType === "CREDIT_ACCOUNT" ? "#ef4444" : undefined,
                  }}
                  onClick={() => setReturnType("CREDIT_ACCOUNT")}
                >
                  📝 Cari Borçtan Düş (HP-1.7)
                </button>
              </div>
            </div>
          )}

          {/* Sepet Listesi */}
          <div className="cart-items-list">
            {cart.length === 0 ? (
              <div
                style={{
                  color: "var(--text-secondary)",
                  textAlign: "center",
                  padding: "2rem 0",
                  fontSize: "0.9rem",
                }}
              >
                {isReturnMode
                  ? "İade edilecek ürünleri soldan seçiniz..."
                  : "Sepetiniz boş. Satış için soldan malzeme seçiniz."}
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.material.id} className="cart-item-row">
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        color: "#fff",
                      }}
                    >
                      {item.material.name}
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Birim: {item.material.salePriceWithVat.toFixed(2)} ₺
                      &bull; Toplam:{" "}
                      <strong style={{ color: "var(--accent-emerald)" }}>
                        {(
                          item.quantity * item.material.salePriceWithVat
                        ).toFixed(2)}{" "}
                        ₺
                      </strong>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <button
                      type="button"
                      className="btn"
                      style={{
                        padding: "0.2rem 0.6rem",
                        background: "rgba(255,255,255,0.1)",
                        color: "#fff",
                      }}
                      onClick={() => updateQuantity(item.material.id, -1)}
                    >
                      -
                    </button>
                    <span
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        minWidth: "20px",
                        textAlign: "center",
                      }}
                    >
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        padding: "0.2rem 0.6rem",
                        background: "rgba(255,255,255,0.1)",
                        color: "#fff",
                      }}
                      onClick={() => updateQuantity(item.material.id, 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Özet ve Ödeme */}
        <div>
          <div style={{ margin: "0.8rem 0" }}>
            <span className="form-label" style={{ display: "block" }}>
              Ödeme Yöntemi
            </span>
            <div
              style={{ display: "flex", gap: "0.4rem", marginTop: "0.3rem" }}
            >
              <button
                type="button"
                className={`tab-btn ${paymentMethod === "CASH" ? "active" : ""}`}
                onClick={() => setPaymentMethod("CASH")}
              >
                💵 Nakit
              </button>
              <button
                type="button"
                className={`tab-btn ${paymentMethod === "CREDIT_CARD" ? "active" : ""}`}
                onClick={() => setPaymentMethod("CREDIT_CARD")}
              >
                💳 Kart
              </button>
              <button
                type="button"
                className={`tab-btn ${paymentMethod === "OPEN_ACCOUNT" ? "active" : ""}`}
                onClick={() => setPaymentMethod("OPEN_ACCOUNT")}
              >
                📝 Açık Hesap
              </button>
            </div>
          </div>

          <div className="cart-summary-box">
            <div className="summary-row">
              <span>Ara Toplam (KDV Dahil):</span>
              <span>{subtotalBeforeDiscount.toFixed(2)} ₺</span>
            </div>

            {/* İskonto / Yuvarlama Alanı (HP-1.4) */}
            <div
              className="summary-row"
              style={{ alignItems: "center", padding: "0.2rem 0" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <label
                  htmlFor={discountInputId}
                  style={{ fontSize: "0.8rem", color: "#f59e0b" }}
                >
                  ✂️ İskonto:
                </label>
                <button
                  type="button"
                  style={{
                    background: "rgba(245, 158, 11, 0.2)",
                    border: "1px solid rgba(245, 158, 11, 0.4)",
                    color: "#f59e0b",
                    borderRadius: "4px",
                    padding: "0.15rem 0.4rem",
                    fontSize: "0.7rem",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                  onClick={() => setIsDiscountModalOpen(true)}
                >
                  ✂️ Düz Hesap Yap (HP-1.4)
                </button>
              </div>
              <input
                id={discountInputId}
                type="number"
                step="1"
                min="0"
                className="form-input"
                style={{
                  width: "80px",
                  padding: "0.2rem 0.4rem",
                  fontSize: "0.85rem",
                  textAlign: "right",
                  color: "#f59e0b",
                }}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Number(e.target.value))}
              />
            </div>

            <div className="summary-row">
              <span>Tahmini KDV (%20):</span>
              <span>{(finalGrandTotal * (20 / 120)).toFixed(2)} ₺</span>
            </div>

            <div className="summary-total summary-row">
              <span>GENEL TOPLAM:</span>
              <span
                style={{
                  color: isReturnMode ? "#ef4444" : "var(--accent-emerald)",
                }}
              >
                {finalGrandTotal.toFixed(2)} ₺
              </span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{
              width: "100%",
              marginTop: "1rem",
              padding: "0.9rem",
              background: isReturnMode ? "#ef4444" : undefined,
            }}
            disabled={cart.length === 0 || isCheckingOut}
            onClick={handleCheckout}
          >
            {isCheckingOut
              ? "İşleniyor..."
              : isReturnMode
                ? "↩️ İadeyi Tamamla & Stoğa Geri Al"
                : "✓ Satışı Tamamla ve Fiş Kes"}
          </button>
        </div>
      </aside>

      <button
        type="button"
        className="cart-status-capsule no-print"
        onClick={() => setIsCartInspectorOpen(true)}
      >
        <span>🧾 {cart.length} kalem</span>
        <strong>{finalGrandTotal.toFixed(2)} ₺</strong>
      </button>

      {/* MODAL 1: HIZLI MALZEME TANIMLAMA (HP-1.5) */}
      {isQuickAddOpen && (
        <div className="modal-overlay">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="İşlem penceresi"
            className="modal-container"
            style={{ maxWidth: "420px" }}
          >
            <div className="modal-header">
              <h2
                style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}
              >
                + Hızlı Malzeme Kartı Aç
              </h2>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsQuickAddOpen(false)}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: "1rem 0" }}>
              <div style={{ marginBottom: "0.8rem" }}>
                <label
                  htmlFor={quickNameId}
                  className="form-label"
                  style={{ display: "block", marginBottom: "0.2rem" }}
                >
                  Malzeme Adı
                </label>
                <input
                  id={quickNameId}
                  type="text"
                  className="form-input"
                  style={{ width: "100%" }}
                  placeholder="Örn: 25A B Tipi Sigorta"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                />
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
                    htmlFor={quickCodeId}
                    className="form-label"
                    style={{ display: "block", marginBottom: "0.2rem" }}
                  >
                    Kod / Barkod
                  </label>
                  <input
                    id={quickCodeId}
                    type="text"
                    className="form-input"
                    style={{ width: "100%" }}
                    placeholder="SGT-25A"
                    value={quickCode}
                    onChange={(e) => setQuickCode(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    htmlFor={quickUnitId}
                    className="form-label"
                    style={{ display: "block", marginBottom: "0.2rem" }}
                  >
                    Birim
                  </label>
                  <select
                    id={quickUnitId}
                    className="form-input"
                    style={{ width: "100%" }}
                    value={quickUnit}
                    onChange={(e) => setQuickUnit(e.target.value)}
                  >
                    <option value="adet">adet</option>
                    <option value="metre">metre</option>
                    <option value="paket">paket</option>
                    <option value="koli">koli</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "0.8rem",
                  marginBottom: "1.2rem",
                }}
              >
                <div style={{ flex: 1 }}>
                  <label
                    htmlFor={quickPriceId}
                    className="form-label"
                    style={{ display: "block", marginBottom: "0.2rem" }}
                  >
                    Satış Fiyatı (KDV Dahil ₺)
                  </label>
                  <input
                    id={quickPriceId}
                    type="number"
                    step="0.5"
                    className="form-input"
                    style={{ width: "100%" }}
                    value={quickPrice}
                    onChange={(e) => setQuickPrice(Number(e.target.value))}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    htmlFor={quickQtyId}
                    className="form-label"
                    style={{ display: "block", marginBottom: "0.2rem" }}
                  >
                    Açılış Stoğu
                  </label>
                  <input
                    id={quickQtyId}
                    type="number"
                    className="form-input"
                    style={{ width: "100%" }}
                    value={quickQty}
                    onChange={(e) => setQuickQty(Number(e.target.value))}
                  />
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                style={{ width: "100%", padding: "0.8rem" }}
                onClick={handleQuickAddMaterial}
              >
                ✓ Stoğa Aç ve Sepete Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: GEÇMİŞ FİŞLER LİSTESİ (HP-1.8 & HP-1.9) */}
      {isRecentReceiptsOpen && (
        <div className="modal-overlay">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="İşlem penceresi"
            className="modal-container"
            style={{ maxWidth: "640px" }}
          >
            <div className="modal-header">
              <h2
                style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}
              >
                📜 Son Fişler ve İptal Yönetimi (HP-1.8 &amp; HP-1.9)
              </h2>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsRecentReceiptsOpen(false)}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: "1rem 0" }}>
              {serverInvoices.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    color: "var(--text-secondary)",
                    padding: "2rem 0",
                  }}
                >
                  Henüz veritabanında kayıtlı satış fişi bulunmuyor.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.8rem",
                    maxHeight: "380px",
                    overflowY: "auto",
                  }}
                >
                  {serverInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      style={{
                        background:
                          inv.status === "REFUNDED"
                            ? "rgba(239, 68, 68, 0.08)"
                            : "rgba(255,255,255,0.04)",
                        border: `1px solid ${
                          inv.status === "REFUNDED"
                            ? "rgba(239, 68, 68, 0.4)"
                            : "var(--border)"
                        }`,
                        borderRadius: "8px",
                        padding: "0.8rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            color:
                              inv.status === "REFUNDED" ? "#f87171" : "#fff",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                          }}
                        >
                          <span>{inv.invoiceNumber}</span>
                          &bull;
                          <span>{inv.customerName || "Perakende Müşteri"}</span>
                          {inv.status === "REFUNDED" && (
                            <span
                              style={{
                                background: "#ef4444",
                                color: "#fff",
                                fontSize: "0.65rem",
                                padding: "0.1rem 0.4rem",
                                borderRadius: "4px",
                                fontWeight: 800,
                              }}
                            >
                              İPTAL / İADE EDİLDİ
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-secondary)",
                            marginTop: "0.2rem",
                          }}
                        >
                          {new Date(inv.createdAt).toLocaleString("tr-TR")}{" "}
                          &bull; Ödeme: {inv.paymentMethod}
                          {inv.notes && ` &bull; ${inv.notes}`}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.6rem",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 800,
                            color:
                              inv.status === "REFUNDED"
                                ? "#9ca3af"
                                : "var(--accent-emerald)",
                            textDecoration:
                              inv.status === "REFUNDED"
                                ? "line-through"
                                : "none",
                          }}
                        >
                          {Number(inv.grandTotal).toFixed(2)} ₺
                        </span>

                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.3rem 0.6rem",
                          }}
                          onClick={() => {
                            setLastReceipt({
                              invoiceNumber: inv.invoiceNumber,
                              date: new Date(inv.createdAt).toLocaleString(
                                "tr-TR",
                              ),
                              items: [],
                              grandTotal: Number(inv.grandTotal),
                              discountTotal: Number(inv.discountTotal) || 0,
                              paymentMethod: inv.paymentMethod,
                              customerName:
                                inv.customerName || "Perakende Müşteri",
                              isReturn: inv.status === "REFUNDED",
                            });
                            setIsRecentReceiptsOpen(false);
                          }}
                        >
                          🖨️ Yazdır (HP-1.8)
                        </button>

                        {inv.status !== "REFUNDED" && (
                          <button
                            type="button"
                            className="btn"
                            disabled={isCancelingInvoice}
                            style={{
                              fontSize: "0.75rem",
                              padding: "0.3rem 0.6rem",
                              background: "rgba(239, 68, 68, 0.2)",
                              border: "1px solid rgba(239, 68, 68, 0.4)",
                              color: "#f87171",
                              cursor: "pointer",
                              fontWeight: 600,
                            }}
                            onClick={() => handleCancelInvoice(inv.id)}
                          >
                            ⚠️ İptal Et (HP-1.9)
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PATRON İNDİRİMİ / DÜZ HESAP YAP (HP-1.4) */}
      {isDiscountModalOpen && (
        <div className="modal-overlay">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="İşlem penceresi"
            className="modal-container"
            style={{ maxWidth: "420px" }}
          >
            <div className="modal-header">
              <h2
                style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}
              >
                ✂️ Patron İndirimi / Düz Hesap Yap (HP-1.4)
              </h2>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsDiscountModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: "1.2rem 0" }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  padding: "0.8rem",
                  borderRadius: "8px",
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Sepet Tutarı:{" "}
                  <strong>{subtotalBeforeDiscount.toFixed(2)} ₺</strong>
                </div>
                <div
                  style={{
                    fontSize: "1rem",
                    fontWeight: 800,
                    color: "#f59e0b",
                    marginTop: "0.2rem",
                  }}
                >
                  Mevcut İskonto: {discountAmount.toFixed(2)} ₺ &rarr; Ödenecek:{" "}
                  {finalGrandTotal.toFixed(2)} ₺
                </div>
              </div>

              {/* Hızlı Yuvarlama Butonları */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  marginBottom: "1.2rem",
                }}
              >
                {subtotalBeforeDiscount > 50 && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{
                      justifyContent: "space-between",
                      display: "flex",
                      fontSize: "0.85rem",
                    }}
                    onClick={() => {
                      const roundTarget =
                        Math.floor(subtotalBeforeDiscount / 50) * 50;
                      const diff = Math.max(
                        0,
                        subtotalBeforeDiscount - roundTarget,
                      );
                      setDiscountAmount(diff);
                      setIsDiscountModalOpen(false);
                    }}
                  >
                    <span>
                      Düz {Math.floor(subtotalBeforeDiscount / 50) * 50} ₺ Yap
                    </span>
                    <strong style={{ color: "#f59e0b" }}>
                      -
                      {Math.max(
                        0,
                        subtotalBeforeDiscount -
                          Math.floor(subtotalBeforeDiscount / 50) * 50,
                      ).toFixed(2)}{" "}
                      ₺
                    </strong>
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    justifyContent: "space-between",
                    display: "flex",
                    fontSize: "0.85rem",
                  }}
                  onClick={() => {
                    const diff = Math.round(subtotalBeforeDiscount * 0.05);
                    setDiscountAmount(diff);
                    setIsDiscountModalOpen(false);
                  }}
                >
                  <span>%5 Usta İndirimi</span>
                  <strong style={{ color: "#f59e0b" }}>
                    -{Math.round(subtotalBeforeDiscount * 0.05)} ₺
                  </strong>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    justifyContent: "space-between",
                    display: "flex",
                    fontSize: "0.85rem",
                  }}
                  onClick={() => {
                    const diff = Math.round(subtotalBeforeDiscount * 0.1);
                    setDiscountAmount(diff);
                    setIsDiscountModalOpen(false);
                  }}
                >
                  <span>%10 Patron Özel İndirimi</span>
                  <strong style={{ color: "#f59e0b" }}>
                    -{Math.round(subtotalBeforeDiscount * 0.1)} ₺
                  </strong>
                </button>
              </div>

              {/* Özel Tutar Girişi */}
              <div style={{ marginBottom: "1rem" }}>
                <label
                  htmlFor={discountInputId}
                  className="form-label"
                  style={{ display: "block", marginBottom: "0.3rem" }}
                >
                  Müşterinin Ödeyeceği Net Tutar (TL):
                </label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="number"
                    className="form-input"
                    style={{ flex: 1 }}
                    placeholder={`Örn: ${Math.floor(subtotalBeforeDiscount - 20)}`}
                    value={customTargetTotal}
                    onChange={(e) => setCustomTargetTotal(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      const target = Number(customTargetTotal);
                      if (target > 0 && target <= subtotalBeforeDiscount) {
                        setDiscountAmount(subtotalBeforeDiscount - target);
                        setIsDiscountModalOpen(false);
                        setCustomTargetTotal("");
                      } else {
                        alert("Geçersiz net tutar girildi.");
                      }
                    }}
                  >
                    Uygula
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SATIŞ FİŞİ YAZDIRMA (Termal 80mm Önizleme) */}
      {lastReceipt && (
        <div className="modal-overlay">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Satış fişi önizlemesi"
            className="modal-card"
          >
            <div className="receipt-paper">
              <div style={{ textAlign: "center", marginBottom: "1rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800 }}>
                  VOLTFLOW ELEKTRİK &amp; MÜHENDİSLİK
                </h3>
                <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                  {lastReceipt.isReturn
                    ? "GİDER PUSULASI & İADE FİŞİ"
                    : "PERAKENDE SATIŞ BİLGİ FİŞİ"}
                </p>
                <div style={{ fontSize: "0.75rem", marginTop: "0.3rem" }}>
                  Fiş No: <strong>{lastReceipt.invoiceNumber}</strong>
                </div>
                <div style={{ fontSize: "0.75rem" }}>
                  Tarih: {lastReceipt.date}
                </div>
                <div style={{ fontSize: "0.75rem" }}>
                  Müşteri: {lastReceipt.customerName}
                </div>
                {lastReceipt.isOffline && (
                  <div
                    style={{
                      background: "#fef3c7",
                      color: "#92400e",
                      padding: "0.4rem 0.6rem",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      textAlign: "center",
                      margin: "0.5rem 0",
                    }}
                  >
                    ⚡ ÇEVRİMDİŞİ KAYDEDİLDİ (IndexedDB)
                    <div style={{ fontSize: "0.65rem", fontWeight: 400 }}>
                      İnternet bağlantısı geldiğinde otomatik eşitlenecektir.
                    </div>
                  </div>
                )}
              </div>

              <div
                style={{
                  borderTop: "1px dashed #9ca3af",
                  borderBottom: "1px dashed #9ca3af",
                  padding: "0.5rem 0",
                  margin: "0.5rem 0",
                  fontSize: "0.8rem",
                }}
              >
                {lastReceipt.items.map((it) => (
                  <div
                    key={it.material.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.3rem",
                    }}
                  >
                    <span>
                      {it.material.name} (x{it.quantity})
                    </span>
                    <span>
                      {(it.quantity * it.material.salePriceWithVat).toFixed(2)}{" "}
                      ₺
                    </span>
                  </div>
                ))}
              </div>

              {lastReceipt.discountTotal > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.8rem",
                    color: "#d97706",
                  }}
                >
                  <span>Uygulanan İndirim:</span>
                  <span>-{lastReceipt.discountTotal.toFixed(2)} ₺</span>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "1rem",
                  fontWeight: 800,
                  marginTop: "0.5rem",
                }}
              >
                <span>TOPLAM:</span>
                <span>{lastReceipt.grandTotal.toFixed(2)} ₺</span>
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#6b7280",
                  marginTop: "0.2rem",
                }}
              >
                Ödeme: {lastReceipt.paymentMethod}
              </div>

              <div
                style={{
                  textAlign: "center",
                  fontSize: "0.7rem",
                  color: "#9ca3af",
                  marginTop: "1rem",
                }}
              >
                İşbu belge bilgi amaçlıdır. Mali geçerliliği yoktur.
                <br />
                Teşekkür eder, iyi günler dileriz.
              </div>
            </div>

            <div
              className="no-print"
              style={{ display: "flex", gap: "0.6rem", marginTop: "1rem" }}
            >
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => window.print()}
              >
                🖨️ Yazdır (80mm)
              </button>
              <button
                type="button"
                className="btn"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "#fff",
                }}
                onClick={() => setLastReceipt(null)}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
