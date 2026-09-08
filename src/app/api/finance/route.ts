import type { NextRequest } from "next/server";
import { z } from "zod";
import { customers } from "@/db/schema";
import {
  type CollectCustomerDebtInput,
  collectCustomerDebt,
  getDerivedCashboxSummary,
  type RecordExpenseInput,
  recordExpenseOrSupplierPayment,
} from "@/features/finance/finance-service";
import { withExecutionGuard } from "@/features/telemetry/telemetry-service";
import {
  isAuthenticationError,
  requireAuthenticatedUser,
} from "@/lib/api-auth";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-response";
import { db } from "@/lib/db";

const financeRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("COLLECT"),
    data: z.object({
      customerId: z.string().min(1),
      amount: z.number().finite().positive(),
      paymentMethod: z
        .enum(["CASH", "BANK_TRANSFER", "CREDIT_CARD"])
        .optional(),
      notes: z.string().max(500).optional(),
    }),
  }),
  z.object({
    action: z.literal("EXPENSE"),
    data: z.object({
      amount: z.number().finite().positive(),
      paymentMethod: z
        .enum(["CASH", "BANK_TRANSFER", "CREDIT_CARD"])
        .optional(),
      category: z.enum([
        "EXPENSE_FUEL",
        "EXPENSE_FOOD",
        "EXPENSE_SUPPLIER",
        "EXPENSE_GENERAL",
        "EXPENSE_RENT",
      ]),
      supplierId: z.string().min(1).optional(),
      description: z.string().trim().min(1).max(500),
    }),
  }),
]);

export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedUser(request);
    const cashboxSummary = await getDerivedCashboxSummary();
    const allCustomers = await db.select().from(customers);

    return createSuccessResponse({
      cashboxSummary,
      customers: allCustomers,
    });
  } catch (error) {
    if (isAuthenticationError(error))
      return createErrorResponse(
        "UNAUTHENTICATED",
        "Oturum açmanız gerekiyor.",
        401,
      );
    return createErrorResponse(
      "FINANCE_FETCH_ERROR",
      error instanceof Error ? error.message : "Finans verileri alınamadı",
      500,
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAuthenticatedUser(request);
    const parsed = financeRequestSchema.parse(await request.json());
    const body = { ...parsed, data: { ...parsed.data, createdById: actor.id } };
    const action = body.action;

    if (action === "COLLECT") {
      const key = request.headers.get("x-idempotency-key");
      const result = key
        ? await withExecutionGuard(key, "finance.collect", 300, () =>
            collectCustomerDebt(body.data as CollectCustomerDebtInput),
          )
        : {
            success: true,
            data: await collectCustomerDebt(
              body.data as CollectCustomerDebtInput,
            ),
          };
      if (!result.success)
        return createErrorResponse(
          "FINANCE_REPLAY_BLOCKED",
          result.error?.message || "İşlem askıda.",
          409,
        );
      return createSuccessResponse(result.data, 201);
    }

    if (action === "EXPENSE") {
      const key = request.headers.get("x-idempotency-key");
      const result = key
        ? await withExecutionGuard(key, "finance.expense", 300, () =>
            recordExpenseOrSupplierPayment(body.data as RecordExpenseInput),
          )
        : {
            success: true,
            data: await recordExpenseOrSupplierPayment(
              body.data as RecordExpenseInput,
            ),
          };
      if (!result.success)
        return createErrorResponse(
          "FINANCE_REPLAY_BLOCKED",
          result.error?.message || "İşlem askıda.",
          409,
        );
      return createSuccessResponse(result.data, 201);
    }

    return createErrorResponse(
      "INVALID_ACTION",
      "Geçersiz finans işlemi. 'COLLECT' veya 'EXPENSE' olmalıdır.",
      400,
    );
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
        "Finans girdileri geçersiz.",
        400,
      );
    return createErrorResponse("FINANCE_ERROR", "Finans işlemi başarısız", 400);
  }
}
