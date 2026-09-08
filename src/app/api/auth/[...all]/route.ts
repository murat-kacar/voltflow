import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { assertProductionConfiguration } from "@/lib/env";

const handler = toNextJsHandler(auth);

export async function GET(request: Request) {
  assertProductionConfiguration();
  return handler.GET(request);
}

export async function POST(request: Request) {
  assertProductionConfiguration();
  return handler.POST(request);
}
