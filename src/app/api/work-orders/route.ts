import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  type CreateWorkOrderInput,
  completeWorkOrder,
  createWorkOrder,
  listWorkOrders,
} from "@/features/jobs/work-order-service";
import {
  isAuthenticationError,
  requireAuthenticatedUser,
} from "@/lib/api-auth";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-response";

const workOrderSchema = z.object({
  title: z.string().trim().min(2).max(200),
  customerId: z.string().min(1),
  orderNumber: z.string().max(50).optional(),
  description: z.string().max(2000).optional(),
  address: z.string().max(500).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  assignedUserId: z.string().min(1).optional(),
  laborCost: z.number().finite().nonnegative().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedUser(request);
    const orders = await listWorkOrders();
    return createSuccessResponse(orders);
  } catch (error) {
    if (isAuthenticationError(error))
      return createErrorResponse(
        "UNAUTHENTICATED",
        "Oturum açmanız gerekiyor.",
        401,
      );
    return createErrorResponse(
      "WORK_ORDERS_FETCH_ERROR",
      error instanceof Error ? error.message : "İş emirleri getirilemedi",
      500,
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAuthenticatedUser(request);
    const body = await request.json();
    const action = z.enum(["CREATE", "COMPLETE"]).optional().parse(body.action);

    if (action === "COMPLETE") {
      const { workOrderId, customerSignatureName, notes } = body;
      if (!workOrderId) {
        return createErrorResponse(
          "MISSING_WORK_ORDER_ID",
          "İş emri ID zorunludur",
          400,
        );
      }
      const completed = await completeWorkOrder(
        workOrderId,
        actor.id,
        customerSignatureName,
        notes,
      );
      return createSuccessResponse(completed);
    }

    // Varsayılan: Yeni iş emri oluştur
    const input = {
      ...workOrderSchema.parse(body.data || body),
      createdById: actor.id,
    } as CreateWorkOrderInput;

    const created = await createWorkOrder({
      ...input,
      orderNumber: input.orderNumber || `IS-${Date.now().toString().slice(-6)}`,
    });
    return createSuccessResponse(created, 201);
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
        "İş emri girdileri geçersiz.",
        400,
      );
    return createErrorResponse(
      "WORK_ORDER_OPERATION_ERROR",
      "İş emri işlemi başarısız",
      400,
    );
  }
}
