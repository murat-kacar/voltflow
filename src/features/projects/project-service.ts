import { randomUUID } from "node:crypto";
import { asc, desc, eq, inArray } from "drizzle-orm";
import {
  customers,
  progressBillings,
  projectPhases,
  projects,
  templatePhases,
} from "@/db/schema";
import type {
  SelectProgressBilling,
  SelectProject,
  SelectProjectPhase,
} from "@/db/validation";
import { db } from "@/lib/db";

/**
 * ============================================================================
 * ŞANTİYE VE TAAHHÜT SERVİSİ
 * (Esnek Şablonlar, İmalat Aşamaları ve Hakediş İcmal Yönetimi)
 * ============================================================================
 */

export interface CreateProjectInput {
  name: string;
  customerId: string;
  siteAddress?: string;
  contractAmount?: number;
  templateId?: string; // Varsa şablondan aşamaları otomatik kopyalar
  customPhases?: string[]; // Şablon yoksa özel aşamalar
  createdById?: string;
}

export async function createProject(
  input: CreateProjectInput,
): Promise<{ project: SelectProject; phases: SelectProjectPhase[] }> {
  return await db.transaction(async (tx) => {
    const projectId = randomUUID();

    const [project] = await tx
      .insert(projects)
      .values({
        id: projectId,
        name: input.name,
        customerId: input.customerId,
        siteAddress: input.siteAddress ?? "",
        contractAmount: input.contractAmount ?? 0,
        status: "IN_PROGRESS",
        notes: "",
        createdById: input.createdById ?? "SYSTEM",
        startDate: new Date(),
        targetEndDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const createdPhases: SelectProjectPhase[] = [];

    // 1. Şablondan aşamaları kopyala
    if (input.templateId) {
      const templates = await tx
        .select()
        .from(templatePhases)
        .where(eq(templatePhases.templateId, input.templateId))
        .orderBy(asc(templatePhases.orderIndex));

      for (const tPhase of templates) {
        const [phase] = await tx
          .insert(projectPhases)
          .values({
            id: randomUUID(),
            projectId,
            name: tPhase.name,
            orderIndex: tPhase.orderIndex,
            status: "PENDING",
            progressPercentage: 0,
            notes: "",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        createdPhases.push(phase);
      }
    } else if (input.customPhases && input.customPhases.length > 0) {
      for (let i = 0; i < input.customPhases.length; i++) {
        const [phase] = await tx
          .insert(projectPhases)
          .values({
            id: randomUUID(),
            projectId,
            name: input.customPhases[i],
            orderIndex: i + 1,
            status: "PENDING",
            progressPercentage: 0,
            notes: "",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        createdPhases.push(phase);
      }
    }

    return { project, phases: createdPhases };
  });
}

export async function updatePhaseProgress(
  phaseId: string,
  progressPercentage: number,
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED",
): Promise<SelectProjectPhase> {
  const finalStatus =
    status ??
    (progressPercentage >= 100
      ? "COMPLETED"
      : progressPercentage > 0
        ? "IN_PROGRESS"
        : "PENDING");

  const [updated] = await db
    .update(projectPhases)
    .set({
      progressPercentage,
      status: finalStatus,
      updatedAt: new Date(),
    })
    .where(eq(projectPhases.id, phaseId))
    .returning();

  if (!updated) {
    throw new Error(`Aşama bulunamadı: ${phaseId}`);
  }

  return updated;
}

export interface CreateProgressBillingInput {
  projectId: string;
  billingNumber: string;
  periodTitle: string;
  requestedAmount: number;
  approvedAmount?: number;
  deductionAmount?: number;
  createdById?: string;
}

export async function createProgressBilling(
  input: CreateProgressBillingInput,
): Promise<SelectProgressBilling> {
  const approved = input.approvedAmount ?? input.requestedAmount;
  const deduction = input.deductionAmount ?? 0;
  const netPayable = approved - deduction;

  const [billing] = await db
    .insert(progressBillings)
    .values({
      id: randomUUID(),
      projectId: input.projectId,
      billingNumber: input.billingNumber,
      periodTitle: input.periodTitle,
      requestedAmount: input.requestedAmount,
      approvedAmount: approved,
      deductionAmount: deduction,
      netPayableAmount: netPayable,
      status: "SUBMITTED",
      notes: "",
      createdById: input.createdById ?? "SYSTEM",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return billing;
}

export async function listProjectPhases(
  projectId: string,
): Promise<SelectProjectPhase[]> {
  return await db
    .select()
    .from(projectPhases)
    .where(eq(projectPhases.projectId, projectId))
    .orderBy(asc(projectPhases.orderIndex));
}

export interface ProjectWithDetails extends SelectProject {
  customerName: string;
  phases: SelectProjectPhase[];
  progressPercent: number;
}

export async function listProjectsWithPhases(): Promise<ProjectWithDetails[]> {
  const allProjects = await db
    .select({
      project: projects,
      customerName: customers.name,
    })
    .from(projects)
    .leftJoin(customers, eq(projects.customerId, customers.id))
    .orderBy(desc(projects.createdAt));

  const projectIds = allProjects.map((row) => row.project.id);
  const allPhases = projectIds.length
    ? await db
        .select()
        .from(projectPhases)
        .where(inArray(projectPhases.projectId, projectIds))
        .orderBy(asc(projectPhases.orderIndex))
    : [];
  const phasesByProject = new Map<string, SelectProjectPhase[]>();
  for (const phase of allPhases) {
    const phases = phasesByProject.get(phase.projectId) ?? [];
    phases.push(phase);
    phasesByProject.set(phase.projectId, phases);
  }

  const result: ProjectWithDetails[] = [];
  for (const row of allProjects) {
    const phases = phasesByProject.get(row.project.id) ?? [];
    const totalPhaseCount = phases.length;
    const completedOrPercentSum = phases.reduce(
      (sum, p) => sum + p.progressPercentage,
      0,
    );
    const progressPercent =
      totalPhaseCount > 0
        ? Math.round(completedOrPercentSum / totalPhaseCount)
        : 0;

    result.push({
      ...row.project,
      customerName: row.customerName ?? "Bilinmeyen Müşteri",
      phases,
      progressPercent,
    });
  }

  return result;
}
