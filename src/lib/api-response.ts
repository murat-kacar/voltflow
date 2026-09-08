import { NextResponse } from "next/server";

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    traceId?: string;
    timestamp: string;
  };
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    traceId?: string;
  };
}

export function createSuccessResponse<T>(
  data: T,
  status = 200,
  traceId?: string,
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        traceId,
        timestamp: new Date().toISOString(),
      },
    },
    { status },
  );
}

export function createErrorResponse(
  code: string,
  message: string,
  status = 400,
  details?: ApiErrorDetail[],
  traceId?: string,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message:
          status >= 500
            ? "İşlem tamamlanamadı. Lütfen tekrar deneyin."
            : message,
        details,
        traceId,
      },
    },
    { status },
  );
}

export function createSafeErrorResponse(
  code: string,
  status: number,
  details?: ApiErrorDetail[],
  traceId?: string,
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    code,
    status >= 500
      ? "İşlem tamamlanamadı. Lütfen tekrar deneyin."
      : "İstek işlenemedi.",
    status,
    details,
    traceId,
  );
}
