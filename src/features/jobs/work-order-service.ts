import { randomUUID } from "node:crypto";
import { desc, eq, inArray } from "drizzle-orm";
import {
  customers,
  materials,
  stockMovements,
  workOrderCompletions,
  workOrderMaterials,
  workOrders,
} from "@/db/schema";
import type { SelectWorkOrder } from "@/db/validation";
import { db } from "@/lib/db";

/**
 * ============================================================================
 * İŞ EMİRLERİ VE SERVİS SERVİSİ
 * (Görev Atama, Malzeme Tüketimi ve Müşteri Teslim Tutanağı)
 * ============================================================================
 */

export interface CreateWorkOrderInput {
  orderNumber: string;
  orderType?: "SERVICE_CALL" | "PROJECT_TASK";
  customerId: string;
  projectId?: string;
  projectPhaseId?: string;
  title: string;
  description?: string;
  address?: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  assignedUserId?: string;
  laborCost?: number;
  createdById?: string;
}

export async function createWorkOrder(
  input: CreateWorkOrderInput,
): Promise<SelectWorkOrder> {
  const [created] = await db
    .insert(workOrders)
    .values({
      id: randomUUID(),
      orderNumber: input.orderNumber,
      orderType: input.orderType ?? "SERVICE_CALL",
      customerId: input.customerId,
      projectId: input.projectId ?? "",
      projectPhaseId: input.projectPhaseId ?? "",
      title: input.title,
      description: input.description ?? "",
      address: input.address ?? "",
      priority: input.priority ?? "NORMAL",
      status: input.assignedUserId ? "ASSIGNED" : "OPEN",
      assignedUserId: input.assignedUserId ?? "",
      laborCost: input.laborCost ?? 0,
      totalMaterialCost: 0,
      grandTotal: input.laborCost ?? 0,
      createdById: input.createdById ?? "SYSTEM",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return created;
}

export async function addMaterialToWorkOrder(
  workOrderId: string,
  materialId: string,
  quantityUsed: number,
  unitPrice?: number,
): Promise<SelectWorkOrder> {
  if (!Number.isFinite(quantityUsed) || quantityUsed <= 0) {
    throw new Error("İş emri malzeme miktarı sıfırdan büyük olmalıdır.");
  }
  return await db.transaction(async (tx) => {
    const [mat] = await tx
      .select()
      .from(materials)
      .where(eq(materials.id, materialId));

    if (!mat) {
      throw new Error(`Malzeme bulunamadı: ${materialId}`);
    }

    const price = unitPrice ?? mat.salePriceWithVat;
    const totalPrice = quantityUsed * price;
    const newQuantity = mat.quantity - quantityUsed;
    if (newQuantity < 0) {
      throw new Error(
        `Yetersiz stok: ${mat.name}. Mevcut: ${mat.quantity}, Talep: ${quantityUsed}`,
      );
    }

    // 1. Kalem ekle
    await tx.insert(workOrderMaterials).values({
      id: randomUUID(),
      workOrderId,
      materialId,
      quantityUsed,
      unitPrice: price,
      totalPrice,
      createdAt: new Date(),
    });

    await tx
      .update(materials)
      .set({ quantity: newQuantity, updatedAt: new Date() })
      .where(eq(materials.id, materialId));
    await tx.insert(stockMovements).values({
      id: randomUUID(),
      materialId,
      movementType: "FIELD_CONSUMPTION_OUT",
      quantity: -quantityUsed,
      previousQuantity: mat.quantity,
      newQuantity,
      referenceType: "WORK_ORDER",
      referenceId: workOrderId,
      notes: "İş emri malzeme sarfiyatı",
      createdById: "SYSTEM",
      createdAt: new Date(),
    });

    // 2. İş emri toplamını güncelle
    const [wo] = await tx
      .select()
      .from(workOrders)
      .where(eq(workOrders.id, workOrderId));

    const newMaterialCost = wo.totalMaterialCost + totalPrice;
    const newGrandTotal = wo.laborCost + newMaterialCost;

    const [updatedWo] = await tx
      .update(workOrders)
      .set({
        totalMaterialCost: newMaterialCost,
        grandTotal: newGrandTotal,
        updatedAt: new Date(),
      })
      .where(eq(workOrders.id, workOrderId))
      .returning();

    return updatedWo;
  });
}

export async function completeWorkOrder(
  workOrderId: string,
  completedByUserId: string,
  customerSignatureName?: string,
  technicianNotes?: string,
): Promise<SelectWorkOrder> {
  return await db.transaction(async (tx) => {
    // 1. İş emrini COMPLETED yap
    const [updatedWo] = await tx
      .update(workOrders)
      .set({
        status: "COMPLETED",
        updatedAt: new Date(),
      })
      .where(eq(workOrders.id, workOrderId))
      .returning();

    if (!updatedWo) {
      throw new Error(`İş emri bulunamadı: ${workOrderId}`);
    }

    // 2. Tamamlama ve teslim tutanağı kaydı aç
    await tx.insert(workOrderCompletions).values({
      id: randomUUID(),
      workOrderId,
      completedByUserId,
      completedAt: new Date(),
      customerSignatureName: customerSignatureName ?? "",
      technicianNotes: technicianNotes ?? "",
      createdAt: new Date(),
    });

    return updatedWo;
  });
}

export interface WorkOrderWithDetails extends SelectWorkOrder {
  customerName: string;
  customerPhone: string;
  materialsUsed: string[];
}

export async function listWorkOrders(): Promise<WorkOrderWithDetails[]> {
  const allOrders = await db
    .select({
      order: workOrders,
      customerName: customers.name,
      customerPhone: customers.phone,
    })
    .from(workOrders)
    .leftJoin(customers, eq(workOrders.customerId, customers.id))
    .orderBy(desc(workOrders.createdAt));

  const workOrderIds = allOrders.map((row) => row.order.id);
  const allMaterials = workOrderIds.length
    ? await db
        .select({
          workOrderId: workOrderMaterials.workOrderId,
          name: materials.name,
          quantity: workOrderMaterials.quantityUsed,
          unit: materials.unit,
        })
        .from(workOrderMaterials)
        .innerJoin(materials, eq(workOrderMaterials.materialId, materials.id))
        .where(inArray(workOrderMaterials.workOrderId, workOrderIds))
    : [];
  const materialsByWorkOrder = new Map<string, typeof allMaterials>();
  for (const material of allMaterials) {
    const materialsForOrder =
      materialsByWorkOrder.get(material.workOrderId) ?? [];
    materialsForOrder.push(material);
    materialsByWorkOrder.set(material.workOrderId, materialsForOrder);
  }

  const itemsWithMaterials: WorkOrderWithDetails[] = [];
  for (const row of allOrders) {
    const mats = materialsByWorkOrder.get(row.order.id) ?? [];

    itemsWithMaterials.push({
      ...row.order,
      customerName: row.customerName ?? "Bilinmeyen Müşteri",
      customerPhone: row.customerPhone ?? "",
      materialsUsed:
        mats.length > 0
          ? mats.map((m) => `${m.quantity} ${m.unit} ${m.name}`)
          : ["Sarf malzemesi sahada belirlenecek"],
    });
  }

  return itemsWithMaterials;
}
