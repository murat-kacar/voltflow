import type { NextRequest } from "next/server";
import { reviewAndApproveDailyLog } from "@/features/field-logs/field-log-service";
import {
  isAuthenticationError,
  requireAuthenticatedUser,
} from "@/lib/api-auth";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const actor = await requireAuthenticatedUser(request);
    const reviewerUserId = actor.id;

    const approved = await reviewAndApproveDailyLog(id, reviewerUserId);
    return createSuccessResponse(approved);
  } catch (error) {
    if (isAuthenticationError(error))
      return createErrorResponse(
        "UNAUTHENTICATED",
        "Oturum açmanız gerekiyor.",
        401,
      );
    return createErrorResponse(
      "FIELD_LOG_APPROVE_ERROR",
      "Saha günlüğü onaylanamadı",
      400,
    );
  }
}
