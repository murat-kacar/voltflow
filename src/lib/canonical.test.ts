import { describe, expect, it } from "vitest";
import { createErrorResponse, createSuccessResponse } from "./api-response";
import { checkRateLimit } from "./rate-limiter";

describe("Rate Limiter & Guards (AGENTS.md Rule 3.I)", () => {
  it("should allow requests under the limit", () => {
    const res = checkRateLimit("test_user_1", 5, 10000);
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(4);
  });

  it("should block requests when rate limit is exceeded", () => {
    const identifier = "test_user_exceed";
    for (let i = 0; i < 3; i++) {
      checkRateLimit(identifier, 3, 10000);
    }
    const blockedRes = checkRateLimit(identifier, 3, 10000);
    expect(blockedRes.allowed).toBe(false);
    expect(blockedRes.remaining).toBe(0);
  });
});

describe("Uniform Error Envelope (AGENTS.md Rule 3.G)", () => {
  it("should create standard success responses", async () => {
    const response = createSuccessResponse({ id: 123 }, 200, "trace_123");
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.id).toBe(123);
    expect(json.meta?.traceId).toBe("trace_123");
  });

  it("should create standard error responses", async () => {
    const response = createErrorResponse(
      "VALIDATION_FAILED",
      "Input is invalid",
      400,
      [{ field: "email", message: "Email is required" }],
      "trace_error_1",
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("VALIDATION_FAILED");
    expect(json.error.details?.[0].field).toBe("email");
  });
});
