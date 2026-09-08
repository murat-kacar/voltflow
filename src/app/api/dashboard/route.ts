import { eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import {
  cashboxTransactions,
  customers,
  dailyFieldLogs,
  materials,
  projects,
  salesInvoices,
} from "@/db/schema";
import {
  isAuthenticationError,
  requireAuthenticatedUser,
} from "@/lib/api-auth";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-response";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedUser(request);
    // 1. Malzeme ve kritik stok sayısı
    const [matCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(materials);

    const [lowStock] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(materials)
      .where(sql`${materials.quantity} <= ${materials.minStockAlert}`);

    // 2. Onay bekleyen saha günlüğü
    const [pendingLogs] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(dailyFieldLogs)
      .where(eq(dailyFieldLogs.status, "PENDING_REVIEW"));

    // 3. Aktif şantiyeler
    const [activeProjects] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(projects)
      .where(eq(projects.status, "IN_PROGRESS"));

    // 4. Kasa ve Açık Hesap toplamları
    const [receivables] = await db
      .select({
        total: sql<number>`coalesce(sum(${customers.currentBalance}), 0)::float`,
      })
      .from(customers);

    const [salesSum] = await db
      .select({
        total: sql<number>`coalesce(sum(${salesInvoices.grandTotal}), 0)::float`,
      })
      .from(salesInvoices)
      .where(eq(salesInvoices.status, "COMPLETED"));

    const [cashIn] = await db
      .select({
        total: sql<number>`coalesce(sum(${cashboxTransactions.amount}), 0)::float`,
      })
      .from(cashboxTransactions)
      .where(eq(cashboxTransactions.direction, "INFLOW"));

    const [cashOut] = await db
      .select({
        total: sql<number>`coalesce(sum(${cashboxTransactions.amount}), 0)::float`,
      })
      .from(cashboxTransactions)
      .where(eq(cashboxTransactions.direction, "OUTFLOW"));

    const netCashbox = (cashIn?.total ?? 0) - (cashOut?.total ?? 0);

    return createSuccessResponse({
      totalMaterials: matCount?.count ?? 0,
      lowStockCount: lowStock?.count ?? 0,
      pendingLogsCount: pendingLogs?.count ?? 0,
      activeProjectsCount: activeProjects?.count ?? 0,
      totalReceivables: receivables?.total ?? 0,
      totalSalesRevenue: salesSum?.total ?? 0,
      netCashbox,
    });
  } catch (error) {
    if (isAuthenticationError(error))
      return createErrorResponse(
        "UNAUTHENTICATED",
        "Oturum açmanız gerekiyor.",
        401,
      );
    return createErrorResponse(
      "DASHBOARD_FETCH_ERROR",
      "Gösterge paneli verileri alınamadı.",
      500,
    );
  }
}
