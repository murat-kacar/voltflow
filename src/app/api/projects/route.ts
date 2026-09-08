import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  type CreateProgressBillingInput,
  type CreateProjectInput,
  createProgressBilling,
  createProject,
  listProjectsWithPhases,
  updatePhaseProgress,
} from "@/features/projects/project-service";
import {
  isAuthenticationError,
  requireAuthenticatedUser,
} from "@/lib/api-auth";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-response";

const projectRequestSchema = z.object({
  action: z
    .enum(["CREATE_PROJECT", "BILLING", "UPDATE_PHASE"])
    .default("CREATE_PROJECT"),
  data: z.unknown().optional(),
});
const projectSchema = z.object({
  name: z.string().trim().min(2).max(200),
  customerId: z.string().min(1),
  siteAddress: z.string().max(500).optional(),
  contractAmount: z.number().finite().min(0).optional(),
  templateId: z.string().min(1).optional(),
  customPhases: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
});
const billingSchema = z.object({
  projectId: z.string().min(1),
  billingNumber: z.string().trim().min(1).max(50),
  periodTitle: z.string().max(200),
  requestedAmount: z.number().finite().nonnegative(),
  approvedAmount: z.number().finite().nonnegative().optional(),
  deductionAmount: z.number().finite().nonnegative().optional(),
});
const phaseSchema = z.object({
  phaseId: z.string().min(1),
  progressPercentage: z.number().finite().min(0).max(100),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedUser(request);
    const projectsWithDetails = await listProjectsWithPhases();
    return createSuccessResponse(projectsWithDetails);
  } catch (error) {
    if (isAuthenticationError(error))
      return createErrorResponse(
        "UNAUTHENTICATED",
        "Oturum açmanız gerekiyor.",
        401,
      );
    return createErrorResponse(
      "PROJECTS_FETCH_ERROR",
      error instanceof Error ? error.message : "Şantiyeler getirilemedi",
      500,
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAuthenticatedUser(request);
    const body = projectRequestSchema.parse(await request.json());
    const action = body.action;

    if (action === "BILLING") {
      const billingInput = {
        ...billingSchema.parse(body.data),
        createdById: actor.id,
      } as CreateProgressBillingInput;
      const billing = await createProgressBilling(billingInput);
      return createSuccessResponse(billing, 201);
    }

    if (action === "UPDATE_PHASE") {
      const { phaseId, progressPercentage, status } = phaseSchema.parse(
        body.data,
      );
      const updatedPhase = await updatePhaseProgress(
        phaseId,
        progressPercentage,
        status,
      );
      return createSuccessResponse(updatedPhase);
    }

    // Varsayılan: Şantiye Oluşturma
    const projectInput = {
      ...projectSchema.parse(body.data),
      createdById: actor.id,
    } as CreateProjectInput;
    const result = await createProject(projectInput);
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
        "Şantiye girdileri geçersiz.",
        400,
      );
    return createErrorResponse(
      "PROJECT_OPERATION_ERROR",
      "Şantiye işlemi başarısız",
      400,
    );
  }
}
