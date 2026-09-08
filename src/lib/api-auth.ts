import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { assertProductionConfiguration } from "@/lib/env";

export async function requireAuthenticatedUser(request: NextRequest) {
  assertProductionConfiguration();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    throw new Error("UNAUTHENTICATED");
  }
  return session.user;
}

export function isAuthenticationError(error: unknown): boolean {
  return error instanceof Error && error.message === "UNAUTHENTICATED";
}
