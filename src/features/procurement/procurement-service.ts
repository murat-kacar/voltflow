import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  materials,
  purchaseInvoiceItems,
  purchaseInvoices,
  stockMovements,
  suppliers,
} from "@/db/schema";
import { db } from "@/lib/db";

/**
 * ============================================================================
 * MAL KABUL & TEDARİK SERVİSİ (PROCUREMENT & STOCK INFLOW)
 * (Toptancı Fatura Girişi, Dip Toplam Doğrulaması & Maliyet/Kâr Koruması)
 * ============================================================================
 */

export interface PurchaseInvoiceItemInput {
  materialId: string;
  quantity: number;
  unitCostWithoutVat: number;
  vatRate?: number;
  newRetailSalePriceWithVat?: number;
  shelfLocation?: string;
}

export interface AcceptSupplierInvoiceInput {
  invoiceNumber: string;
  supplierId: string;
  invoiceDate?: Date;
  dueDate?: Date;
  expectedGrandTotal: number; // Kağıt faturadaki genel toplam (Sıfır hata kontrolü)
  isDraft?: boolean;
  notes?: string;
  createdById?: string;
  items: PurchaseInvoiceItemInput[];
}

export async function acceptSupplierInvoice(input: AcceptSupplierInvoiceInput) {
  if (!input.items || input.items.length === 0) {
    throw new Error("Mal kabul faturası en az bir malzeme kalemi içermelidir.");
  }

  // 1. Kalem Hesaplamaları ve KDV Dağılımı
  let calculatedSubtotal = 0;
  let calculatedTotalVat = 0;

  for (const item of input.items) {
    if (item.quantity <= 0) {
      throw new Error(
        `Geçersiz miktar! Malzeme ID: ${item.materialId}, Miktar: ${item.quantity}`,
      );
    }
    if (item.unitCostWithoutVat < 0) {
      throw new Error(
        `Alış maliyeti negatif olamaz! Malzeme ID: ${item.materialId}`,
      );
    }

    const vatRate = item.vatRate ?? 20;
    const lineSubtotal = item.quantity * item.unitCostWithoutVat;
    const lineVat = lineSubtotal * (vatRate / 100);

    calculatedSubtotal += lineSubtotal;
    calculatedTotalVat += lineVat;

    // 2. Kâr Marjı / Zararına Satış Kalkanı
    if (item.newRetailSalePriceWithVat !== undefined) {
      const costWithVat = item.unitCostWithoutVat * (1 + vatRate / 100);
      if (item.newRetailSalePriceWithVat < costWithVat) {
        throw new Error(
          `Zararına satış engellendi! Malzeme ID: ${item.materialId}, KDV Dahil Alış Maliyeti: ${costWithVat.toFixed(2)} ₺, Belirlenen Satış Fiyatı: ${item.newRetailSalePriceWithVat} ₺`,
        );
      }
    }
  }

  const calculatedGrandTotal =
    Math.round((calculatedSubtotal + calculatedTotalVat) * 100) / 100;

  // 3. Çift Kontrol / Dip Toplam Kalkanı (Double-Check Balance Shield)
  // Taslak değilse kağıt faturadaki genel toplam ile birebir uyuşmalıdır.
  if (
    !input.isDraft &&
    Math.abs(calculatedGrandTotal - input.expectedGrandTotal) > 0.05
  ) {
    throw new Error(
      `Fatura dip toplamı uyuşmuyor! Kağıttaki Tutar: ${input.expectedGrandTotal.toFixed(2)} ₺, Kalemlerden Hesaplanan: ${calculatedGrandTotal.toFixed(2)} ₺. Lütfen adet ve fiyatları kontrol edin.`,
    );
  }

  const invoiceId = randomUUID();
  const createdById = input.createdById ?? "SYSTEM";
  const isDraft = input.isDraft ?? false;

  return await db.transaction(async (tx) => {
    // 4. Toptancıyı doğrula
    const [supplier] = await tx
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, input.supplierId));

    if (!supplier) {
      throw new Error(`Toptancı bulunamadı: ${input.supplierId}`);
    }

    // 5. Alış Fatura Başlığını Kaydet
    const [createdInvoice] = await tx
      .insert(purchaseInvoices)
      .values({
        id: invoiceId,
        invoiceNumber: input.invoiceNumber,
        supplierId: input.supplierId,
        invoiceDate: input.invoiceDate ?? new Date(),
        dueDate: input.dueDate ?? new Date(),
        subtotal: calculatedSubtotal,
        totalVat: calculatedTotalVat,
        grandTotal: calculatedGrandTotal,
        paymentStatus: isDraft ? "DRAFT" : "PENDING",
        notes: input.notes ?? "",
        createdById,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // 6. Fatura Kalemlerini Kaydet ve Stokları Güncelle
    const createdItems = [];

    for (const item of input.items) {
      const vatRate = item.vatRate ?? 20;
      const totalCost = item.quantity * item.unitCostWithoutVat;
      const itemId = randomUUID();

      await tx.insert(purchaseInvoiceItems).values({
        id: itemId,
        purchaseInvoiceId: invoiceId,
        materialId: item.materialId,
        quantity: item.quantity,
        unitCostWithoutVat: item.unitCostWithoutVat,
        vatRate,
        totalCost,
        createdAt: new Date(),
      });

      // Taslak değilse fiziksel stokları ve maliyetleri güncelle
      if (!isDraft) {
        const [currentMat] = await tx
          .select()
          .from(materials)
          .where(eq(materials.id, item.materialId));

        if (!currentMat) {
          throw new Error(`Malzeme bulunamadı: ${item.materialId}`);
        }

        const previousQuantity = currentMat.quantity;
        const newQuantity = previousQuantity + item.quantity;

        // Malzeme kartını güncelle
        await tx
          .update(materials)
          .set({
            quantity: newQuantity,
            purchasePriceWithoutVat: item.unitCostWithoutVat,
            ...(item.newRetailSalePriceWithVat !== undefined
              ? { salePriceWithVat: item.newRetailSalePriceWithVat }
              : {}),
            ...(item.shelfLocation
              ? { shelfLocation: item.shelfLocation }
              : {}),
            updatedAt: new Date(),
          })
          .where(eq(materials.id, item.materialId));

        // Stok hareket ekstresi yaz (Giriş / PURCHASE_IN)
        await tx.insert(stockMovements).values({
          id: randomUUID(),
          materialId: item.materialId,
          movementType: "PURCHASE_IN",
          quantity: item.quantity,
          previousQuantity,
          newQuantity,
          referenceType: "PURCHASE_INVOICE",
          referenceId: invoiceId,
          notes: `Mal Kabul: ${input.invoiceNumber} (${supplier.companyName})`,
          createdById,
          createdAt: new Date(),
        });
      }

      createdItems.push({
        materialId: item.materialId,
        quantity: item.quantity,
        unitCostWithoutVat: item.unitCostWithoutVat,
      });
    }

    // 7. Taslak değilse Toptancı Cari Borcunu Artır
    if (!isDraft) {
      const newSupplierBalance = supplier.currentBalance + calculatedGrandTotal;
      await tx
        .update(suppliers)
        .set({
          currentBalance: newSupplierBalance,
          updatedAt: new Date(),
        })
        .where(eq(suppliers.id, input.supplierId));
    }

    return {
      success: true,
      invoice: createdInvoice,
      itemCount: createdItems.length,
      calculatedSubtotal,
      calculatedTotalVat,
      calculatedGrandTotal,
      isDraft,
      supplierName: supplier.companyName,
    };
  });
}
