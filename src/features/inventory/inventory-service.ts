import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { materials, stockMovements } from "@/db/schema";
import type { InsertMaterial, SelectMaterial } from "@/db/validation";
import { db } from "@/lib/db";

/**
 * ============================================================================
 * STOK VE MALZEME SERVİSİ
 * (Merkezi Depo, Hareket Tarihçesi ve Kritik Stok Koruması)
 * ============================================================================
 */

export interface StockAdjustmentInput {
  materialId: string;
  quantityChange: number; // Pozitif: Giriş/İade, Negatif: Çıkış/Sarfiyat
  movementType:
    | "PURCHASE_IN"
    | "RETAIL_SALE_OUT"
    | "FIELD_CONSUMPTION_OUT"
    | "RETURN_IN"
    | "ADJUSTMENT";
  referenceType?: string; // "SALES_INVOICE", "PURCHASE_INVOICE", "DAILY_LOG", "WORK_ORDER"
  referenceId?: string;
  notes?: string;
  createdById?: string;
}

export async function createMaterial(
  input: InsertMaterial,
): Promise<SelectMaterial> {
  const id = input.id || randomUUID();

  const [created] = await db
    .insert(materials)
    .values({
      ...input,
      id,
      barcode: input.barcode ?? "",
      shelfLocation: input.shelfLocation ?? "",
      isActive: input.isActive ?? true,
    })
    .returning();

  return created;
}

export async function adjustStock(
  input: StockAdjustmentInput,
): Promise<{ material: SelectMaterial; movementId: string }> {
  return await db.transaction(async (tx) => {
    // 1. Mevcut malzemeyi bul
    const [current] = await tx
      .select()
      .from(materials)
      .where(eq(materials.id, input.materialId));

    if (!current) {
      throw new Error(`Malzeme bulunamadı: ${input.materialId}`);
    }

    const previousQuantity = current.quantity;
    const newQuantity = previousQuantity + input.quantityChange;

    // Negatif stok koruması
    if (newQuantity < 0) {
      throw new Error(
        `Yetersiz stok! Mevcut: ${previousQuantity} ${current.unit}, Talep Edilen Düşüş: ${Math.abs(input.quantityChange)}`,
      );
    }

    // 2. Malzeme stoğunu güncelle
    const [updated] = await tx
      .update(materials)
      .set({
        quantity: newQuantity,
        updatedAt: new Date(),
      })
      .where(eq(materials.id, input.materialId))
      .returning();

    // 3. Stok hareketini kaydet
    const movementId = randomUUID();
    await tx.insert(stockMovements).values({
      id: movementId,
      materialId: input.materialId,
      movementType: input.movementType,
      quantity: input.quantityChange,
      previousQuantity,
      newQuantity,
      referenceType: input.referenceType ?? "",
      referenceId: input.referenceId ?? "",
      notes: input.notes ?? "",
      createdById: input.createdById ?? "SYSTEM",
      createdAt: new Date(),
    });

    return { material: updated, movementId };
  });
}

export async function checkStockAvailability(
  items: Array<{ materialId: string; requiredQuantity: number }>,
): Promise<{
  available: boolean;
  missing: Array<{ materialId: string; needed: number; inStock: number }>;
}> {
  const missing: Array<{
    materialId: string;
    needed: number;
    inStock: number;
  }> = [];

  for (const item of items) {
    const [mat] = await db
      .select()
      .from(materials)
      .where(eq(materials.id, item.materialId));

    if (!mat || mat.quantity < item.requiredQuantity) {
      missing.push({
        materialId: item.materialId,
        needed: item.requiredQuantity,
        inStock: mat?.quantity ?? 0,
      });
    }
  }

  return {
    available: missing.length === 0,
    missing,
  };
}

export async function getLowStockAlerts(): Promise<SelectMaterial[]> {
  return await db
    .select()
    .from(materials)
    .where(
      sql`${materials.quantity} <= ${materials.minStockAlert} AND ${materials.isActive} = true`,
    );
}

export async function findMaterialByCode(
  code: string,
): Promise<SelectMaterial | null> {
  const [result] = await db
    .select()
    .from(materials)
    .where(eq(materials.code, code));
  return result ?? null;
}

export async function listMaterials(
  category?: string,
): Promise<SelectMaterial[]> {
  if (category) {
    return await db
      .select()
      .from(materials)
      .where(eq(materials.category, category));
  }
  return await db.select().from(materials);
}
