import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { executionGuards, incidentTraces } from "@/db/schema";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * ============================================================================
 * TELEMETRI, OLAY GÜNLÜĞÜ & İDEMPOTENS SERVISI
 * (Arıza Teşhisi, Kesinti Koruması ve Graphify AST Köprüsü)
 * ============================================================================
 */

export interface RecordIncidentInput {
  traceId: string;
  userId?: string;
  pageUrl?: string;
  activatorId?: string;
  apiEndpoint?: string;
  functionName: string;
  failingSymbol?: string; // Graphify AST Symbol (örn: "saleService.completeSale")
  sourceFile?: string; // Dosya yolu (örn: "src/features/sales/sale-service.ts")
  failureCategory:
    | "NETWORK_CUT"
    | "SECURITY_GUARD"
    | "DEVELOPMENT_BUG"
    | "BUSINESS_RULE";
  failCode: string;
  failReason: string;
  blockedAtStep?: string;
  durationMs?: number;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

/**
 * Yalnızca Hata, Bloklanma veya Kesinti durumlarında DB'ye kayıt atar (DB Şişmesini Önler)
 */
export async function recordIncident(
  input: RecordIncidentInput,
): Promise<string> {
  const incidentId = randomUUID();

  await db.insert(incidentTraces).values({
    id: incidentId,
    traceId: input.traceId,
    userId: input.userId ?? "ANONYMOUS",
    pageUrl: input.pageUrl ?? "",
    activatorId: input.activatorId ?? "",
    apiEndpoint: input.apiEndpoint ?? "",
    functionName: input.functionName,
    failingSymbol: input.failingSymbol ?? input.functionName,
    sourceFile: input.sourceFile ?? "",
    failureCategory: input.failureCategory,
    failCode: input.failCode,
    failReason: input.failReason,
    blockedAtStep: input.blockedAtStep ?? "",
    durationMs: input.durationMs ?? 0,
    ipAddress: input.ipAddress ?? "127.0.0.1",
    userAgent: input.userAgent ?? "",
    details: input.details ?? {},
    timestamp: new Date(),
  });

  logger.warn(`Incident logged: [${input.failureCategory}] ${input.failCode}`, {
    context: {
      incidentId,
      traceId: input.traceId,
      functionName: input.functionName,
      failReason: input.failReason,
    },
  });

  return incidentId;
}

export interface ExecutionGuardResult<T> {
  success: boolean;
  data?: T;
  isIdempotentReplay?: boolean;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Elektrik/İnternet kesintisi veya mükerrer tıklamaya karşı İdempotens Koruması (DEFERRED-002)
 */
export async function withExecutionGuard<T>(
  idempotencyKey: string,
  scope: string,
  ttlSeconds: number,
  operation: () => Promise<T>,
): Promise<ExecutionGuardResult<T>> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

  // 1. Mevcut kilit kontrolü
  const existing = await db.query.executionGuards.findFirst({
    where: (guards, { eq }) =>
      and(eq(guards.idempotencyKey, idempotencyKey), eq(guards.scope, scope)),
  });

  if (existing) {
    const isExpired = existing.expiresAt <= now;
    if (!isExpired && existing.status === "RESOLVED" && existing.responseBody) {
      // Daha önce başarıyla tamamlanmış işlem -> Tekrar çalıştırma, önceki sonucu dön
      return {
        success: true,
        data: JSON.parse(existing.responseBody) as T,
        isIdempotentReplay: true,
      };
    }

    if (!isExpired && existing.status === "PENDING") {
      // Kesintiye uğramış veya hâlen işlemde olan kilit
      return {
        success: false,
        error: {
          code: "OPERATION_IN_PROGRESS_OR_INTERRUPTED",
          message:
            "Bu işlem daha önce başlatılmış ancak elektrik/bağlantı kesintisi nedeniyle askıda kalmış olabilir.",
        },
      };
    }
  }

  // 2. Yeni veya süresi dolmuş kilit kaydı aç (PENDING)
  const guardId = randomUUID();
  if (existing) {
    await db
      .update(executionGuards)
      .set({
        status: "PENDING",
        responseStatusCode: 0,
        responseBody: "",
        expiresAt,
        createdAt: now,
      })
      .where(eq(executionGuards.id, existing.id));
  } else {
    await db.insert(executionGuards).values({
      id: guardId,
      idempotencyKey,
      scope,
      status: "PENDING",
      requestHash: "",
      responseStatusCode: 0,
      responseBody: "",
      expiresAt,
      createdAt: now,
    });
  }
  const activeGuardId = existing?.id ?? guardId;

  try {
    // 3. Asıl iş mantığını yürüt
    const result = await operation();

    // 4. Başarıyla bitti -> RESOLVED olarak güncelle
    await db
      .update(executionGuards)
      .set({
        status: "RESOLVED",
        responseStatusCode: 200,
        responseBody: JSON.stringify(result),
      })
      .where(eq(executionGuards.id, activeGuardId));

    return { success: true, data: result };
  } catch (error) {
    // 5. Hata oldu -> Kilit durumunu ORPHANED / FAILED yap
    await db
      .update(executionGuards)
      .set({
        status: "ORPHANED",
        responseStatusCode: 500,
        responseBody: error instanceof Error ? error.message : "Unknown error",
      })
      .where(eq(executionGuards.id, activeGuardId));

    throw error;
  }
}
