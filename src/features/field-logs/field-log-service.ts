import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  dailyFieldLogMaterials,
  dailyFieldLogs,
  materials,
  stockMovements,
} from "@/db/schema";
import type { SelectDailyFieldLog } from "@/db/validation";
import { db } from "@/lib/db";

/**
 * ============================================================================
 * SAHA GÜNLÜĞÜ VE PUANTAJ SERVİSİ
 * (Mobil Öncelikli, Sıfır Baskı ve Patron Onay Kuyruğu)
 * ============================================================================
 */

export interface DailyLogMaterialInput {
  materialId: string;
  quantity: number;
}

export interface SubmitDailyLogInput {
  userId: string;
  projectId?: string;
  hoursWorked?: number; // Varsayılan: 8 saat
  workSummary?: string;
  materials?: DailyLogMaterialInput[];
}

export async function submitDailyLog(
  input: SubmitDailyLogInput,
): Promise<{ log: SelectDailyFieldLog; materialCount: number }> {
  if (
    !Number.isFinite(input.hoursWorked ?? 8) ||
    (input.hoursWorked ?? 8) < 0 ||
    (input.hoursWorked ?? 8) > 24
  ) {
    throw new Error("Çalışma saati 0 ile 24 arasında olmalıdır.");
  }
  const logId = randomUUID();
  const hoursWorked = input.hoursWorked ?? 8;
  const workSummary = input.workSummary || "Normal mesai tamamlandı.";

  return await db.transaction(async (tx) => {
    const [log] = await tx
      .insert(dailyFieldLogs)
      .values({
        id: logId,
        userId: input.userId,
        projectId: input.projectId ?? "",
        logDate: new Date(),
        hoursWorked,
        workSummary,
        status: "PENDING_REVIEW",
        reviewedByUserId: "",
        reviewedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    let materialCount = 0;
    if (input.materials && input.materials.length > 0) {
      for (const item of input.materials) {
        if (item.quantity > 0) {
          await tx.insert(dailyFieldLogMaterials).values({
            id: randomUUID(),
            dailyFieldLogId: logId,
            materialId: item.materialId,
            quantity: item.quantity,
            createdAt: new Date(),
          });
          materialCount++;
        }
      }
    }

    return { log, materialCount };
  });
}

export async function reviewAndApproveDailyLog(
  logId: string,
  reviewerUserId: string,
): Promise<SelectDailyFieldLog> {
  return await db.transaction(async (tx) => {
    const [log] = await tx
      .select()
      .from(dailyFieldLogs)
      .where(eq(dailyFieldLogs.id, logId));

    if (!log) {
      throw new Error(`Saha günlüğü bulunamadı: ${logId}`);
    }

    if (log.status !== "PENDING_REVIEW") {
      throw new Error(
        "Yalnızca inceleme bekleyen saha günlükleri onaylanabilir.",
      );
    }

    // 1. Günlüğü onaylandı yap
    const [approvedLog] = await tx
      .update(dailyFieldLogs)
      .set({
        status: "APPROVED",
        reviewedByUserId: reviewerUserId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(dailyFieldLogs.id, logId))
      .returning();

    // 2. Varsa malzemeleri merkez depodan şantiye sarfiyatı olarak düş
    const logItems = await tx
      .select()
      .from(dailyFieldLogMaterials)
      .where(eq(dailyFieldLogMaterials.dailyFieldLogId, logId));

    for (const item of logItems) {
      const [mat] = await tx
        .select()
        .from(materials)
        .where(eq(materials.id, item.materialId));

      if (mat) {
        const prevQty = mat.quantity;
        const newQty = prevQty - item.quantity;
        if (newQty < 0) {
          throw new Error(
            `Yetersiz stok: ${mat.name}. Mevcut: ${prevQty}, Talep: ${item.quantity}`,
          );
        }

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
          movementType: "FIELD_CONSUMPTION_OUT",
          quantity: -item.quantity,
          previousQuantity: prevQty,
          newQuantity: newQty,
          referenceType: "DAILY_LOG",
          referenceId: logId,
          notes: `Şantiye Sarfiyatı (Onaylandı): ${log.workSummary}`,
          createdById: reviewerUserId,
          createdAt: new Date(),
        });
      }
    }

    return approvedLog;
  });
}

export async function listPendingLogs(): Promise<SelectDailyFieldLog[]> {
  return await db
    .select()
    .from(dailyFieldLogs)
    .where(eq(dailyFieldLogs.status, "PENDING_REVIEW"));
}
