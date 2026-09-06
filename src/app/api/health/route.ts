import { sql } from "drizzle-orm";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-response";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET() {
  const traceId = `health_${Date.now()}`;
  const startTime = Date.now();

  try {
    await db.execute(sql`SELECT 1 as live;`);
    const durationMs = Date.now() - startTime;

    logger.info("Health check passed", {
      traceId,
      context: { durationMs },
    });

    return createSuccessResponse(
      {
        status: "healthy",
        uptimeSeconds: process.uptime(),
        database: {
          connected: true,
          pingMs: durationMs,
          engine: "PostgreSQL 18.6",
        },
      },
      200,
      traceId,
    );
  } catch (error) {
    logger.error("Health check database error", {
      traceId,
      err: error,
    });

    return createErrorResponse(
      "DATABASE_UNAVAILABLE",
      "Unable to connect to the database",
      503,
      undefined,
      traceId,
    );
  }
}
