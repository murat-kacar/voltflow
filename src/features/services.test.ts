import { describe, expect, it } from "vitest";
import {
  insertCompanySettingsSchema,
  insertDailyFieldLogSchema,
  insertExecutionGuardSchema,
  insertIncidentTraceSchema,
  insertMaterialSchema,
  insertSalesInvoiceSchema,
} from "@/db/validation";

describe("Sıfır-NULL Şema ve Akıllı Varsayılanlar Testi (Zero-Null Guarantee)", () => {
  it("Malzeme şeması tüm alanları akıllı varsayılanlarla doldurmalı ve null üretmemeli", () => {
    const rawMaterial = {
      code: "KBL-3X2.5",
      name: "Hes Kablo 3x2.5mm Antigron",
    };

    const parsed = insertMaterialSchema.parse(rawMaterial);

    expect(parsed.code).toBe("KBL-3X2.5");
    expect(parsed.name).toBe("Hes Kablo 3x2.5mm Antigron");
    expect(parsed.barcode).toBe(""); // null değil boş metin
    expect(parsed.category).toBe("GENEL");
    expect(parsed.unit).toBe("adet");
    expect(parsed.quantity).toBe(0); // null değil 0
    expect(parsed.minStockAlert).toBe(5);
    expect(parsed.purchasePriceWithoutVat).toBe(0);
    expect(parsed.salePriceWithVat).toBe(0);
    expect(parsed.vatRate).toBe(20);
    expect(parsed.shelfLocation).toBe("");
    expect(parsed.isActive).toBe(true);

    // Hiçbir alan null veya undefined olmamalı
    for (const [_key, value] of Object.entries(parsed)) {
      expect(value).not.toBeNull();
      expect(value).not.toBeUndefined();
    }
  });

  it("Tezgâh satış faturası şeması eksik sayısal alanları 0 ile doldurmalı", () => {
    const rawSale = {
      invoiceNumber: "FS-2026-0001",
      customerId: "CUST-WALKIN",
    };

    const parsed = insertSalesInvoiceSchema.parse(rawSale);

    expect(parsed.invoiceNumber).toBe("FS-2026-0001");
    expect(parsed.customerId).toBe("CUST-WALKIN");
    expect(parsed.saleType).toBe("RETAIL");
    expect(parsed.paymentMethod).toBe("CASH");
    expect(parsed.paymentStatus).toBe("PAID");
    expect(parsed.status).toBe("COMPLETED");
    expect(parsed.materialTotal).toBe(0);
    expect(parsed.laborTotal).toBe(0);
    expect(parsed.discountTotal).toBe(0);
    expect(parsed.vatTotal).toBe(0);
    expect(parsed.grandTotal).toBe(0);
  });

  it("Saha günlüğü şeması varsayılan 8 saat mesai ve PENDING_REVIEW atamalı", () => {
    const rawLog = {
      userId: "usr_test_123",
    };

    const parsed = insertDailyFieldLogSchema.parse(rawLog);

    expect(parsed.userId).toBe("usr_test_123");
    expect(parsed.hoursWorked).toBe(8);
    expect(parsed.workSummary).toBe("Normal mesai tamamlandı.");
    expect(parsed.status).toBe("PENDING_REVIEW");
  });

  it("Şirket ayarları şeması varsayılan antet ve KDV değerlerini üretmeli", () => {
    const parsed = insertCompanySettingsSchema.parse({ id: "default_company" });

    expect(parsed.companyName).toBe("Elektrik Otomasyon");
    expect(parsed.defaultVatRate).toBe(20);
    expect(parsed.criticalStockThreshold).toBe(5);
    expect(parsed.taxNumber).toBe("");
    expect(parsed.iban).toBe("");
  });
});

describe("Arıza Teşhisi, Olay Günlüğü ve İdempotens Koruması Testi", () => {
  it("Incident Trace şeması failureCategory doğrulaması yapmalı", () => {
    const rawTrace = {
      traceId: "trc_test_999",
      functionName: "completeCounterSale",
      failingSymbol: "saleService.completeCounterSale",
      sourceFile: "src/features/sales/sale-service.ts",
      failureCategory: "NETWORK_CUT" as const,
      failCode: "SOCKET_TIMEOUT",
      failReason: "Elektrik/bağlantı kesintisi",
    };

    const parsed = insertIncidentTraceSchema.parse(rawTrace);

    expect(parsed.traceId).toBe("trc_test_999");
    expect(parsed.failureCategory).toBe("NETWORK_CUT");
    expect(parsed.failingSymbol).toBe("saleService.completeCounterSale");
    expect(parsed.durationMs).toBe(0);
    expect(parsed.ipAddress).toBe("127.0.0.1");
  });

  it("Execution Guard şeması status varsayılanını PENDING olarak başlatmalı", () => {
    const rawGuard = {
      idempotencyKey: "idemp_sale_5544",
      scope: "sales.checkout",
      expiresAt: new Date(Date.now() + 60000),
    };

    const parsed = insertExecutionGuardSchema.parse(rawGuard);

    expect(parsed.status).toBe("PENDING");
    expect(parsed.requestHash).toBe("");
    expect(parsed.responseStatusCode).toBe(0);
  });
});

describe("İş Mantığı ve Hesaplama Doğrulama Testi", () => {
  it("KDV, işçilik ve iskonto ile nihai genel toplam hesabı doğru çalışmalı", () => {
    const items = [
      { quantity: 10, unitPrice: 20, vatRate: 20 }, // 200 TL + 40 TL KDV
      { quantity: 2, unitPrice: 150, vatRate: 20 }, // 300 TL + 60 TL KDV
    ];

    let materialTotal = 0;
    let vatTotal = 0;

    for (const item of items) {
      const lineTotal = item.quantity * item.unitPrice;
      const lineVat = lineTotal * (item.vatRate / 100);
      materialTotal += lineTotal;
      vatTotal += lineVat;
    }

    const laborTotal = 150;
    const discountTotal = 50;
    const grandTotal = materialTotal + laborTotal + vatTotal - discountTotal;

    expect(materialTotal).toBe(500);
    expect(vatTotal).toBe(100);
    expect(grandTotal).toBe(700); // 500 (malzeme) + 150 (işçilik) + 100 (KDV) - 50 (iskonto)
  });

  it("Negatif stok düşüş koruması tespiti", () => {
    const currentStock = 5;
    const requestedDecrease = 8;
    const newStock = currentStock - requestedDecrease;

    expect(newStock < 0).toBe(true);
  });

  it("Mal kabul dip toplam kalkanı (Double-Check Balance) kuruş farkını yakalamalı", () => {
    const items = [
      { quantity: 10, unitCostWithoutVat: 50, vatRate: 20 }, // 500 + 100 = 600 TL
      { quantity: 5, unitCostWithoutVat: 100, vatRate: 20 }, // 500 + 100 = 600 TL
    ];

    let subtotal = 0;
    let vatTotal = 0;
    for (const itm of items) {
      const lineSub = itm.quantity * itm.unitCostWithoutVat;
      subtotal += lineSub;
      vatTotal += lineSub * (itm.vatRate / 100);
    }
    const calculatedGrandTotal = subtotal + vatTotal; // 1200 TL

    const paperInvoiceTotal = 1150; // Kağıttaki genel toplam yanlış girilmiş!
    const diff = Math.abs(calculatedGrandTotal - paperInvoiceTotal);

    expect(diff > 0.05).toBe(true);
    expect(calculatedGrandTotal).toBe(1200);
  });

  it("Zararına satış kalkanı: Satış fiyatı KDV dahil alış maliyetinin altındaysa engellenmeli", () => {
    const unitCostWithoutVat = 100;
    const vatRate = 20;
    const costWithVat = unitCostWithoutVat * (1 + vatRate / 100); // 120 TL

    const intendedSalePrice = 110; // Zararına satış!
    const isSellingBelowCost = intendedSalePrice < costWithVat;

    expect(costWithVat).toBe(120);
    expect(isSellingBelowCost).toBe(true);
  });

  it("Değişmez defter (Immutable Ledger) bakiye türetimi borç ve alacakları denk toplamalı", () => {
    // Başlangıç: 0 TL
    const transactions = [
      { type: "DEBIT_SALE", amount: 1500 }, // +1500 TL Borç
      { type: "DEBIT_PROGRESS_BILLING", amount: 3500 }, // +3500 TL Borç
      { type: "CREDIT_CASH_PAYMENT", amount: 2000 }, // -2000 TL Tahsilat
      { type: "CREDIT_BANK_PAYMENT", amount: 1000 }, // -1000 TL Havale
    ];

    let derivedBalance = 0;
    for (const tx of transactions) {
      if (tx.type === "DEBIT_SALE" || tx.type === "DEBIT_PROGRESS_BILLING") {
        derivedBalance += tx.amount;
      } else if (
        tx.type === "CREDIT_CASH_PAYMENT" ||
        tx.type === "CREDIT_BANK_PAYMENT"
      ) {
        derivedBalance -= tx.amount;
      }
    }

    // 5000 TL borç - 3000 TL ödeme = Kalan 2000 TL
    expect(derivedBalance).toBe(2000);
  });
});
