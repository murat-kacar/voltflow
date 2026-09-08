import type { NextRequest } from "next/server";
import { z } from "zod";
import { insertMaterialSchema } from "@/db/validation";
import {
  adjustStock,
  createMaterial,
  getLowStockAlerts,
  listMaterials,
  type StockAdjustmentInput,
} from "@/features/inventory/inventory-service";
import {
  isAuthenticationError,
  requireAuthenticatedUser,
} from "@/lib/api-auth";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-response";

const stockAdjustmentSchema = z.object({
  materialId: z.string().min(1),
  quantityChange: z.number().finite(),
  movementType: z.enum([
    "PURCHASE_IN",
    "RETAIL_SALE_OUT",
    "FIELD_CONSUMPTION_OUT",
    "RETURN_IN",
    "ADJUSTMENT",
  ]),
  referenceType: z.string().max(50).optional(),
  referenceId: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedUser(request);
    const { searchParams } = new URL(request.url);
    const isLowStock = searchParams.get("lowStock") === "true";
    const category = searchParams.get("category") || undefined;

    if (isLowStock) {
      const lowStockItems = await getLowStockAlerts();
      return createSuccessResponse(lowStockItems);
    }

    const items = await listMaterials(category);
    return createSuccessResponse(items);
  } catch (error) {
    if (isAuthenticationError(error))
      return createErrorResponse(
        "UNAUTHENTICATED",
        "Oturum açmanız gerekiyor.",
        401,
      );
    return createErrorResponse(
      "INVENTORY_FETCH_ERROR",
      error instanceof Error ? error.message : "Malzemeler getirilemedi",
      500,
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedUser(request);
    const body = await request.json();
    const validated = insertMaterialSchema.parse(body);
    const material = await createMaterial(validated);
    return createSuccessResponse(material, 201);
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
        "Malzeme girdileri geçersiz.",
        400,
      );
    return createErrorResponse(
      "MATERIAL_CREATE_ERROR",
      error instanceof Error ? error.message : "Malzeme oluşturulamadı",
      400,
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireAuthenticatedUser(request);
    const body = stockAdjustmentSchema.parse(await request.json());
    const result = await adjustStock({
      ...body,
      createdById: actor.id,
    } as StockAdjustmentInput);
    return createSuccessResponse(result);
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
        "Stok girdileri geçersiz.",
        400,
      );
    return createErrorResponse(
      "STOCK_ADJUSTMENT_ERROR",
      error instanceof Error ? error.message : "Stok ayarlaması başarısız",
      400,
    );
  }
}
