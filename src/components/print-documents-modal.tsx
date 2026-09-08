"use client";

import { useState } from "react";

export function PrintDocumentsModal() {
  const [activeDoc, setActiveDoc] = useState<
    "RECEIPT" | "SERVICE_DELIVERY" | "WORK_ORDER" | "HAKEDIS"
  >("SERVICE_DELIVERY");

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      {/* Belge Seçim Sekmeleri */}
      <div
        className="no-print"
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          overflowX: "auto",
          paddingBottom: "0.5rem",
        }}
      >
        <button
          type="button"
          className={`pill-btn ${activeDoc === "SERVICE_DELIVERY" ? "active" : ""}`}
          onClick={() => setActiveDoc("SERVICE_DELIVERY")}
        >
          ✍️ Hizmet Teslim Tutanağı
        </button>
        <button
          type="button"
          className={`pill-btn ${activeDoc === "RECEIPT" ? "active" : ""}`}
          onClick={() => setActiveDoc("RECEIPT")}
        >
          🧾 Perakende Satış Fişi
        </button>
        <button
          type="button"
          className={`pill-btn ${activeDoc === "WORK_ORDER" ? "active" : ""}`}
          onClick={() => setActiveDoc("WORK_ORDER")}
        >
          📋 İş Emri Pusulası
        </button>
        <button
          type="button"
          className={`pill-btn ${activeDoc === "HAKEDIS" ? "active" : ""}`}
          onClick={() => setActiveDoc("HAKEDIS")}
        >
          🏗️ Hakediş İcmal Cetveli
        </button>

        <button
          type="button"
          className="btn btn-primary"
          style={{
            marginLeft: "auto",
            padding: "0.4rem 1.2rem",
            fontSize: "0.85rem",
          }}
          onClick={() => window.print()}
        >
          🖨️ Yazdır (A4 / Fiş)
        </button>
      </div>

      {/* Belge Kağıdı (Print-Friendly A4 / Termal) */}
      <div
        className="receipt-paper"
        style={{
          maxWidth: "750px",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
          padding: "2.5rem",
        }}
      >
        {/* Antet */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "2px solid #0f172a",
            paddingBottom: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "1.3rem",
                fontWeight: 900,
                color: "#0f172a",
                margin: 0,
              }}
            >
              YILDIZ ELEKTRİK &amp; MÜHENDİSLİK
            </h2>
            <p
              style={{
                fontSize: "0.8rem",
                color: "#475569",
                margin: "0.2rem 0",
              }}
            >
              Elektrik Taahhüt, Pano &amp; Teknik Servis Hizmetleri
            </p>
            <p style={{ fontSize: "0.75rem", color: "#64748b" }}>
              Tel: 0216 555 00 00 | Kadıköy / İSTANBUL
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                background: "#f1f5f9",
                padding: "0.3rem 0.6rem",
                borderRadius: "4px",
                display: "inline-block",
              }}
            >
              {activeDoc === "SERVICE_DELIVERY"
                ? "HİZMET TESLİM TUTANAĞI"
                : activeDoc === "RECEIPT"
                  ? "SATIŞ BİLGİ FİŞİ"
                  : activeDoc === "WORK_ORDER"
                    ? "İŞ EMRİ PUSULASI"
                    : "HAKEDİŞ İCMAL CETVELİ"}
            </span>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#64748b",
                marginTop: "0.4rem",
              }}
            >
              Tarih: {new Date().toLocaleDateString("tr-TR")}
            </div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700 }}>
              Evrak No: #2026-0042
            </div>
          </div>
        </div>

        {/* 1. Belge: Hizmet ve Malzeme Teslim Tutanağı */}
        {activeDoc === "SERVICE_DELIVERY" && (
          <div>
            <div
              style={{
                background: "#f8fafc",
                padding: "0.8rem",
                borderRadius: "6px",
                marginBottom: "1.2rem",
                fontSize: "0.85rem",
              }}
            >
              <div>
                <strong>Müşteri:</strong> Ahmet Yılmaz (Güneş Sitesi Daire: 12)
              </div>
              <div>
                <strong>Telefon:</strong> 0532 000 00 00
              </div>
              <div>
                <strong>Yapılan İş:</strong> Daire ana pano kaçak akım arıza
                onarımı ve linye yenileme.
              </div>
            </div>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.85rem",
                marginBottom: "1.5rem",
              }}
            >
              <thead>
                <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                  <th
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #cbd5e1",
                    }}
                  >
                    İmalat / Malzeme
                  </th>
                  <th
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #cbd5e1",
                    }}
                  >
                    Miktar
                  </th>
                  <th
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #cbd5e1",
                    }}
                  >
                    Birim Fiyat
                  </th>
                  <th
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #cbd5e1",
                      textAlign: "right",
                    }}
                  >
                    Tutar
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    Siemens 40A Kaçak Akım Rölesi
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    1 Adet
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    890,00 ₺
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #f1f5f9",
                      textAlign: "right",
                    }}
                  >
                    890,00 ₺
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    Hes Kablo 3x2.5mm² Linye Hattı
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    12 Metre
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    35,00 ₺
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #f1f5f9",
                      textAlign: "right",
                    }}
                  >
                    420,00 ₺
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    Teknik Servis &amp; Pano İşçiliği
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    1 Servis
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    450,00 ₺
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #f1f5f9",
                      textAlign: "right",
                    }}
                  >
                    450,00 ₺
                  </td>
                </tr>
              </tbody>
            </table>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: "2rem",
              }}
            >
              <div style={{ width: "240px", fontSize: "0.9rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.3rem 0",
                  }}
                >
                  <span>Ara Toplam:</span>
                  <span>1.760,00 ₺</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.3rem 0",
                    fontWeight: 900,
                    borderTop: "2px solid #0f172a",
                    fontSize: "1.1rem",
                  }}
                >
                  <span>Ödenecek Tutar:</span>
                  <span>1.760,00 ₺</span>
                </div>
              </div>
            </div>

            {/* İki Taraflı İmza Kutusu */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px solid #e2e8f0",
                paddingTop: "1.5rem",
                marginTop: "1rem",
              }}
            >
              <div style={{ width: "220px", textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "#0f172a",
                  }}
                >
                  TESLİM EDEN (USTA)
                </div>
                <div style={{ height: "60px" }}></div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    borderTop: "1px dashed #cbd5e1",
                    paddingTop: "0.3rem",
                  }}
                >
                  İmza / Kaşe
                </div>
              </div>

              <div style={{ width: "220px", textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "#0f172a",
                  }}
                >
                  TESLİM ALAN (MÜŞTERİ)
                </div>
                <div style={{ height: "60px" }}></div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    borderTop: "1px dashed #cbd5e1",
                    paddingTop: "0.3rem",
                  }}
                >
                  İşbu montajı eksiksiz teslim aldım.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Belge: Şantiye Hakediş İcmal Cetveli */}
        {activeDoc === "HAKEDIS" && (
          <div>
            <div
              style={{
                background: "#f8fafc",
                padding: "0.8rem",
                borderRadius: "6px",
                marginBottom: "1.2rem",
                fontSize: "0.85rem",
              }}
            >
              <div>
                <strong>Proje:</strong> Güneş Konutları 120 Daire Elektrik
                Taahhüdü
              </div>
              <div>
                <strong>Müteahhit / İşveren:</strong> Yıldız İnşaat Taahhüt A.Ş.
              </div>
              <div>
                <strong>Hakediş No:</strong> 2. Hakediş (Nisan 2026 Dönemi)
              </div>
            </div>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.85rem",
                marginBottom: "1.5rem",
              }}
            >
              <thead>
                <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                  <th style={{ padding: "0.5rem" }}>İmalat Aşaması</th>
                  <th style={{ padding: "0.5rem" }}>Aşama Tutarı</th>
                  <th style={{ padding: "0.5rem" }}>Önceki İlerleme</th>
                  <th style={{ padding: "0.5rem" }}>Bu Dönem İlerleme</th>
                  <th style={{ padding: "0.5rem", textAlign: "right" }}>
                    Bu Dönem Hakediş
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    1. Temel Topraklama
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    80.000 ₺
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    %100
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    %100
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #f1f5f9",
                      textAlign: "right",
                    }}
                  >
                    0 ₺
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    2. Kaba Borulama &amp; Kasa
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    160.000 ₺
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    %40
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    %100
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #f1f5f9",
                      textAlign: "right",
                    }}
                  >
                    96.000 ₺
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    3. Kablo Çekimi &amp; Tava
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    240.000 ₺
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    %0
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    %40
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #f1f5f9",
                      textAlign: "right",
                    }}
                  >
                    96.000 ₺
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{ width: "280px", fontSize: "0.95rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.3rem 0",
                    fontWeight: 900,
                    borderTop: "2px solid #0f172a",
                    fontSize: "1.1rem",
                  }}
                >
                  <span>Talep Edilen Hakediş:</span>
                  <span>192.000,00 ₺</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Belge: Perakende Satış Fişi */}
        {activeDoc === "RECEIPT" && (
          <div
            style={{ maxWidth: "360px", margin: "0 auto", textAlign: "center" }}
          >
            <div
              style={{
                fontSize: "0.8rem",
                color: "#64748b",
                marginBottom: "0.5rem",
              }}
            >
              Perakende Satış Bilgi Fişi
            </div>
            <div
              style={{
                borderTop: "1px dashed #94a3b8",
                borderBottom: "1px dashed #94a3b8",
                padding: "0.8rem 0",
                margin: "0.8rem 0",
                textAlign: "left",
                fontSize: "0.85rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.3rem",
                }}
              >
                <span>Viko Topraklı Priz (x5)</span>
                <span>325,00 ₺</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.3rem",
                }}
              >
                <span>Globus İzolasyon Bandı (x2)</span>
                <span>36,00 ₺</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Hes 3x2.5mm² Kablo (x10m)</span>
                <span>345,00 ₺</span>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "1.1rem",
                fontWeight: 900,
              }}
            >
              <span>TOPLAM:</span>
              <span>706,00 ₺</span>
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#64748b",
                marginTop: "0.4rem",
              }}
            >
              Ödeme: Nakit Tahsilat
            </div>
          </div>
        )}

        {/* 4. Belge: İş Emri Pusulası */}
        {activeDoc === "WORK_ORDER" && (
          <div>
            <div
              style={{
                background: "#f8fafc",
                padding: "0.8rem",
                borderRadius: "6px",
                marginBottom: "1.2rem",
                fontSize: "0.85rem",
              }}
            >
              <div>
                <strong>Görevlendirilen Usta:</strong> Ahmet Usta &amp; Mehmet
                Çırak
              </div>
              <div>
                <strong>Müşteri:</strong> Yıldız Eczanesi
              </div>
              <div>
                <strong>Adres:</strong> Bağdat Cad. No: 142 Kadıköy / İstanbul
              </div>
              <div>
                <strong>Arıza / Talep:</strong> Gece nöbetinde aydınlatma panosu
                sigortası atmış, prizler çalışmıyor.
              </div>
            </div>

            <div
              style={{
                border: "1px solid #e2e8f0",
                padding: "1rem",
                borderRadius: "6px",
                marginBottom: "1.5rem",
                minHeight: "120px",
              }}
            >
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "#64748b",
                  marginBottom: "0.5rem",
                }}
              >
                SAHA TESPİTİ &amp; KULLANILAN MALZEME NOTLARI (Usta Tarafından
                Doldurulacak):
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.8rem",
              }}
            >
              <div>Çıkış Saati: _______ : _______</div>
              <div>İş Bitiş Saati: _______ : _______</div>
              <div>Usta İmzası: ___________________</div>
            </div>
          </div>
        )}

        {/* Fiş Alt Notu */}
        <div
          style={{
            textAlign: "center",
            fontSize: "0.7rem",
            color: "#94a3b8",
            borderTop: "1px solid #f1f5f9",
            paddingTop: "1rem",
            marginTop: "2rem",
          }}
        >
          İşbu belge sistem tarafından otomatik üretilmiştir. Malzemeler montaj
          garantilidir.
        </div>
      </div>
    </div>
  );
}
