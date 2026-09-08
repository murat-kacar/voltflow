import type { NextRequest } from "next/server";
import { z } from "zod";
import { suppliers } from "@/db/schema";
import {
  type AcceptSupplierInvoiceInput,
  acceptSupplierInvoice,
} from "@/features/procurement/procurement-service";
import { withExecutionGuard } from "@/features/telemetry/telemetry-service";
import {
  isAuthenticationError,
  requireAuthenticatedUser,
} from "@/lib/api-auth";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-response";
import { db } from "@/lib/db";

const procurementSchema = z.object({
  invoiceNumber: z.string().trim().min(1).max(100),
  supplierId: z.string().min(1),
  expectedGrandTotal: z.number().finite().nonnegative(),
  isDraft: z.boolean().default(false),
  notes: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        materialId: z.string().min(1),
        quantity: z.number().finite().positive(),
        unitCostWithoutVat: z.number().finite().nonnegative(),
        vatRate: z.number().finite().min(0).max(100).optional(),
        newRetailSalePriceWithVat: z.number().finite().nonnegative().optional(),
        shelfLocation: z.string().max(100).optional(),
      }),
    )
    .min(1)
    .max(200),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedUser(request);
    const allSuppliers = await db.select().from(suppliers);
    return createSuccessResponse(allSuppliers);
  } catch (error) {
    if (isAuthenticationError(error))
      return createErrorResponse(
        "UNAUTHENTICATED",
        "Oturum açmanız gerekiyor.",
        401,
      );
    return createErrorResponse(
      "SUPPLIERS_FETCH_ERROR",
      error instanceof Error ? error.message : "Toptancılar alınamadı",
      500,
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAuthenticatedUser(request);
    const body = {
      ...procurementSchema.parse(await request.json()),
      createdById: actor.id,
    } as AcceptSupplierInvoiceInput;
    const key = request.headers.get("x-idempotency-key");
    const result = key
      ? await withExecutionGuard(key, "procurement.accept_invoice", 300, () =>
          acceptSupplierInvoice(body),
        )
      : { success: true, data: await acceptSupplierInvoice(body) };
    if (!result.success)
      return createErrorResponse(
        "PROCUREMENT_REPLAY_BLOCKED",
        result.error?.message || "İşlem askıda.",
        409,
      );
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
        "Mal kabul girdileri geçersiz.",
        400,
      );
    return createErrorResponse(
      "PROCUREMENT_ERROR",
      "Mal kabul işlemi başarısız",
      400,
    );
  }
}
