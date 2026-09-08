import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  listPendingLogs,
  type SubmitDailyLogInput,
  submitDailyLog,
} from "@/features/field-logs/field-log-service";
import { withExecutionGuard } from "@/features/telemetry/telemetry-service";
import {
  isAuthenticationError,
  requireAuthenticatedUser,
} from "@/lib/api-auth";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-response";

const dailyLogSchema = z.object({
  projectId: z.string().optional(),
  hoursWorked: z.number().finite().min(0).max(24),
  workSummary: z.string().trim().min(1).max(2000),
  materials: z
    .array(
      z.object({
        materialId: z.string().min(1),
        quantity: z.number().finite().positive(),
      }),
    )
    .max(100)
    .default([]),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedUser(request);
    const pendingLogs = await listPendingLogs();
    return createSuccessResponse(pendingLogs);
  } catch (error) {
    if (isAuthenticationError(error))
      return createErrorResponse(
        "UNAUTHENTICATED",
        "Oturum açmanız gerekiyor.",
        401,
      );
    return createErrorResponse(
      "FIELD_LOG_FETCH_ERROR",
      error instanceof Error ? error.message : "Saha günlükleri getirilemedi",
      500,
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAuthenticatedUser(request);
    const body = {
      ...dailyLogSchema.parse(await request.json()),
      userId: actor.id,
    } as SubmitDailyLogInput;
    const idempotencyKey = request.headers.get("x-idempotency-key");
    const result = idempotencyKey
      ? await withExecutionGuard(idempotencyKey, "field_logs.submit", 300, () =>
          submitDailyLog(body),
        )
      : { success: true, data: await submitDailyLog(body) };
    if (!result.success) {
      return createErrorResponse(
        "FIELD_LOG_REPLAY_BLOCKED",
        result.error?.message || "İşlem askıda.",
        409,
      );
    }
    return createSuccessResponse(result.data, 201);
  } catch (error) {
    if (isAuthenticationError(error))
      return createErrorResponse(
        "UNAUTHENTICATED",
        "Oturum açmanız gerekiyor.",
        401,
      );
    if (error instanceof z.ZodError)
      return createErrorResponse(
        "INVALID_INPUT",
        "Saha günlüğü girdileri geçersiz.",
        400,
      );
    return createErrorResponse(
      "FIELD_LOG_SUBMIT_ERROR",
      "Saha günlüğü gönderilemedi",
      400,
    );
  }
}
