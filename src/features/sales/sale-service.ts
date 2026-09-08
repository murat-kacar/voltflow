import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import {
  cashboxTransactions,
  customers,
  customerTransactions,
  materials,
  salesInvoiceItems,
  salesInvoices,
  stockMovements,
} from "@/db/schema";
import type { SelectSalesInvoice } from "@/db/validation";
import { db } from "@/lib/db";

/**
 * ============================================================================
 * TEZGAH SATIŞI VE FATURA SERVİSİ
 * (Atomik Stok Düşümü, Kasa Kaydı ve Açık Hesap Borçlandırma)
 * ============================================================================
 */

export interface SaleItemInput {
  materialId: string;
  quantity: number;
  unitPrice: number;
  vatRate?: number;
}

export interface CompleteSaleInput {
  invoiceNumber: string;
  customerId?: string; // Boşsa sentinel "CUST-WALKIN" kullanılır
  saleType?: "RETAIL" | "SERVICE_CALL" | "PROJECT";
  paymentMethod: "CASH" | "CREDIT_CARD" | "BANK_TRANSFER" | "OPEN_ACCOUNT";
  items: SaleItemInput[];
  laborTotal?: number;
  discountTotal?: number;
  notes?: string;
  createdById?: string;
}

export async function completeCounterSale(
  input: CompleteSaleInput,
): Promise<{ invoice: SelectSalesInvoice; totalItemsCount: number }> {
  if (!input.items || input.items.length === 0) {
    throw new Error("Satış için en az bir malzeme kalemi gereklidir.");
  }

  const customerId = input.customerId || "CUST-WALKIN";

  return await db.transaction(async (tx) => {
    // 1. Stok kontrolü ve toplam hesaplama
    let materialTotal = 0;
    let vatTotal = 0;

    for (const item of input.items) {
      const [mat] = await tx
        .select()
        .from(materials)
        .where(eq(materials.id, item.materialId));

      if (!mat) {
        throw new Error(`Malzeme bulunamadı: ${item.materialId}`);
      }

      if (mat.quantity < item.quantity) {
        throw new Error(
          `Yetersiz stok: ${mat.name}. Mevcut: ${mat.quantity} ${mat.unit}, İstenen: ${item.quantity}`,
        );
      }

      const itemVatRate = item.vatRate ?? mat.vatRate;
      const lineTotal = item.quantity * item.unitPrice;
      const lineVat = lineTotal * (itemVatRate / 100);

      materialTotal += lineTotal;
      vatTotal += lineVat;
    }

    const laborTotal = input.laborTotal ?? 0;
    const discountTotal = input.discountTotal ?? 0;
    const grandTotal = materialTotal + laborTotal + vatTotal - discountTotal;

    const invoiceId = randomUUID();
    const isPaid = input.paymentMethod !== "OPEN_ACCOUNT";

    // 2. Satış faturası oluştur
    const [invoice] = await tx
      .insert(salesInvoices)
      .values({
        id: invoiceId,
        invoiceNumber: input.invoiceNumber,
        customerId,
        saleType: input.saleType ?? "RETAIL",
        paymentMethod: input.paymentMethod,
        paymentStatus: isPaid ? "PAID" : "UNPAID",
        status: "COMPLETED",
        materialTotal,
        laborTotal,
        discountTotal,
        vatTotal,
        grandTotal,
        notes: input.notes ?? "",
        createdById: input.createdById ?? "SYSTEM",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // 3. Kalemleri ekle ve stoktan düş
    for (const item of input.items) {
      const [mat] = await tx
        .select()
        .from(materials)
        .where(eq(materials.id, item.materialId));

      const previousQty = mat.quantity;
      const newQty = previousQty - item.quantity;
      const itemVat = item.vatRate ?? mat.vatRate;
      const linePrice = item.quantity * item.unitPrice;

      await tx.insert(salesInvoiceItems).values({
        id: randomUUID(),
        salesInvoiceId: invoiceId,
        materialId: item.materialId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: itemVat,
        totalPrice: linePrice,
        createdAt: new Date(),
      });

      await tx
        .update(materials)
        .set({
          quantity: newQty,
          updatedAt: new Date(),
        })
        .where(eq(materials.id, item.materialId));

      await tx.insert(stockMovements).values({
        id: randomUUID(),
        materialId: item.materialId,
        movementType: "RETAIL_SALE_OUT",
        quantity: -item.quantity,
        previousQuantity: previousQty,
        newQuantity: newQty,
        referenceType: "SALES_INVOICE",
        referenceId: invoiceId,
        notes: `Tezgâh Satışı: ${input.invoiceNumber}`,
        createdById: input.createdById ?? "SYSTEM",
        createdAt: new Date(),
      });
    }

    // 4. Kasa veya Açık Hesap güncellemesi
    if (isPaid) {
      await tx.insert(cashboxTransactions).values({
        id: randomUUID(),
        direction: "INFLOW",
        amount: grandTotal,
        paymentMethod: input.paymentMethod,
        category: "SALES",
        description: `Satış Tahsilatı: ${input.invoiceNumber}`,
        referenceId: invoiceId,
        createdById: input.createdById ?? "SYSTEM",
        createdAt: new Date(),
      });
    } else {
      // Açık Hesap (Veresiye) -> Müşteri bakiyesini artır
      const [cust] = await tx
        .select()
        .from(customers)
        .where(eq(customers.id, customerId));

      if (cust) {
        const newBalance = cust.currentBalance + grandTotal;

        await tx
          .update(customers)
          .set({
            currentBalance: newBalance,
            updatedAt: new Date(),
          })
          .where(eq(customers.id, customerId));

        await tx.insert(customerTransactions).values({
          id: randomUUID(),
          customerId,
          transactionType: "DEBIT_SALE",
          amount: grandTotal,
          balanceAfter: newBalance,
          referenceType: "SALES_INVOICE",
          referenceId: invoiceId,
          description: `Açık Hesap Satışı: ${input.invoiceNumber}`,
          createdById: input.createdById ?? "SYSTEM",
          createdAt: new Date(),
        });
      }
    }

    return { invoice, totalItemsCount: input.items.length };
  });
}

export async function refundSale(
  invoiceId: string,
  refundReason: string,
  userId?: string,
): Promise<SelectSalesInvoice> {
  return await db.transaction(async (tx) => {
    const [invoice] = await tx
      .select()
      .from(salesInvoices)
      .where(eq(salesInvoices.id, invoiceId));

    if (!invoice) {
      throw new Error(`Satış faturası bulunamadı: ${invoiceId}`);
    }

    if (invoice.status === "REFUNDED" || invoice.status === "CANCELLED") {
      throw new Error(
        "Bu satış faturası zaten iade edilmiş veya iptal edilmiş.",
      );
    }

    // 1. Fatura durumunu REFUNDED yap
    const [updatedInvoice] = await tx
      .update(salesInvoices)
      .set({
        status: "REFUNDED",
        notes: `${invoice.notes} | İade Sebebi: ${refundReason}`,
        updatedAt: new Date(),
      })
      .where(eq(salesInvoices.id, invoiceId))
      .returning();

    // 2. Fatura kalemlerini alıp stoğa iade et
    const items = await tx
      .select()
      .from(salesInvoiceItems)
      .where(eq(salesInvoiceItems.salesInvoiceId, invoiceId));

    for (const item of items) {
      const [mat] = await tx
        .select()
        .from(materials)
        .where(eq(materials.id, item.materialId));

      if (mat) {
        const previousQty = mat.quantity;
        const newQty = previousQty + item.quantity;

        await tx
          .update(materials)
          .set({
            quantity: newQty,
            updatedAt: new Date(),
          })
          .where(eq(materials.id, item.materialId));

        await tx.insert(stockMovements).values({
          id: randomUUID(),
          materialId: item.materialId,
          movementType: "RETURN_IN",
          quantity: item.quantity,
          previousQuantity: previousQty,
          newQuantity: newQty,
          referenceType: "SALES_INVOICE",
          referenceId: invoiceId,
          notes: `Satış İadesi: ${invoice.invoiceNumber}`,
          createdById: userId ?? "SYSTEM",
          createdAt: new Date(),
        });
      }
    }

    // 3. Kasa veya Açık Hesap düzeltmesi
    if (invoice.paymentStatus === "PAID") {
      await tx.insert(cashboxTransactions).values({
        id: randomUUID(),
        direction: "OUTFLOW",
        amount: invoice.grandTotal,
        paymentMethod: invoice.paymentMethod,
        category: "REFUND",
        description: `Satış İade Geri Ödemesi: ${invoice.invoiceNumber}`,
        referenceId: invoiceId,
        createdById: userId ?? "SYSTEM",
        createdAt: new Date(),
      });
    } else {
      // Açık hesap düzeltmesi
      const [cust] = await tx
        .select()
        .from(customers)
        .where(eq(customers.id, invoice.customerId));

      if (cust) {
        const newBalance = cust.currentBalance - invoice.grandTotal;

        await tx
          .update(customers)
          .set({
            currentBalance: newBalance,
            updatedAt: new Date(),
          })
          .where(eq(customers.id, invoice.customerId));

        await tx.insert(customerTransactions).values({
          id: randomUUID(),
          customerId: invoice.customerId,
          transactionType: "CREDIT_CASH_PAYMENT",
          amount: -invoice.grandTotal,
          balanceAfter: newBalance,
          referenceType: "SALES_INVOICE",
          referenceId: invoiceId,
          description: `Satış İadesi Bakiye Düzeltmesi: ${invoice.invoiceNumber}`,
          createdById: userId ?? "SYSTEM",
          createdAt: new Date(),
        });
      }
    }

    return updatedInvoice;
  });
}

export async function listSalesInvoices(limit = 20) {
  const invoices = await db
    .select({
      id: salesInvoices.id,
      invoiceNumber: salesInvoices.invoiceNumber,
      customerId: salesInvoices.customerId,
      customerName: customers.name,
      grandTotal: salesInvoices.grandTotal,
      discountTotal: salesInvoices.discountTotal,
      paymentMethod: salesInvoices.paymentMethod,
      paymentStatus: salesInvoices.paymentStatus,
      status: salesInvoices.status,
      notes: salesInvoices.notes,
      createdAt: salesInvoices.createdAt,
    })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .orderBy(desc(salesInvoices.createdAt))
    .limit(limit);

  return invoices;
}
