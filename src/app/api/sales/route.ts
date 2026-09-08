import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  type CompleteSaleInput,
  completeCounterSale,
  listSalesInvoices,
  refundSale,
} from "@/features/sales/sale-service";
import { withExecutionGuard } from "@/features/telemetry/telemetry-service";
import {
  isAuthenticationError,
  requireAuthenticatedUser,
} from "@/lib/api-auth";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-response";

const saleSchema = z.object({
  invoiceNumber: z.string().min(1).max(50),
  customerId: z.string().min(1).optional(),
  saleType: z.enum(["RETAIL", "SERVICE_CALL", "PROJECT"]).optional(),
  paymentMethod: z.enum([
    "CASH",
    "CREDIT_CARD",
    "BANK_TRANSFER",
    "OPEN_ACCOUNT",
  ]),
  laborTotal: z.number().finite().nonnegative().optional(),
  discountTotal: z.number().finite().nonnegative().optional(),
  notes: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        materialId: z.string().min(1),
        quantity: z.number().finite().positive(),
        unitPrice: z.number().finite().nonnegative(),
        vatRate: z.number().finite().min(0).max(100).optional(),
      }),
    )
    .min(1)
    .max(200),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedUser(request);
    const list = await listSalesInvoices(30);
    return createSuccessResponse(list);
  } catch (error) {
    if (isAuthenticationError(error))
      return createErrorResponse(
        "UNAUTHENTICATED",
        "Oturum açmanız gerekiyor.",
        401,
      );
    return createErrorResponse(
      "LIST_SALES_ERROR",
      error instanceof Error ? error.message : "Satışlar listelenemedi",
      500,
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAuthenticatedUser(request);
    const body = {
      ...saleSchema.parse(await request.json()),
      createdById: actor.id,
    } as CompleteSaleInput;
    const idempotencyKey =
      request.headers.get("x-idempotency-key") || body.invoiceNumber;

    if (idempotencyKey) {
      const guardResult = await withExecutionGuard(
        idempotencyKey,
        "sales.checkout",
        120, // 2 dakika kilit penceresi
        async () => {
          return await completeCounterSale(body);
        },
      );

      if (!guardResult.success) {
        return createErrorResponse(
          guardResult.error?.code || "SALE_LOCKED",
          guardResult.error?.message || "İşlem askıda kaldı",
          409,
        );
      }

      return createSuccessResponse(guardResult.data, 201);
    }

    const result = await completeCounterSale(body);
    return createSuccessResponse(result, 201);
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
        "Satış girdileri geçersiz.",
        400,
      );
    return createErrorResponse(
      "SALE_CHECKOUT_ERROR",
      "Satış işlemi başarısız",
      400,
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = await requireAuthenticatedUser(request);
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("invoiceId");
    const reason = searchParams.get("reason") || "Müşteri iadesi";

    if (!invoiceId) {
      return createErrorResponse(
        "MISSING_INVOICE_ID",
        "Fatura ID zorunludur",
        400,
      );
    }

    const result = await refundSale(invoiceId, reason, actor.id);
    return createSuccessResponse(result);
  } catch (error) {
    if (isAuthenticationError(error))
      return createErrorResponse(
        "UNAUTHENTICATED",
        "Oturum açmanız gerekiyor.",
        401,
      );
    return createErrorResponse(
      "SALE_REFUND_ERROR",
      error instanceof Error ? error.message : "Satış iadesi başarısız",
      400,
    );
  }
}
