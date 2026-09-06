interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * In-memory sliding window rate limiter
 * Implements AGENTS.md Section 3.I
 */
export function checkRateLimit(
  identifier: string,
  limit = 20,
  windowMs = 60000,
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  const record = rateLimitStore.get(identifier) ?? { timestamps: [] };

  // Filter out timestamps outside window
  const validTimestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (validTimestamps.length >= limit) {
    const oldestTimestamp = validTimestamps[0];
    const resetMs = Math.max(0, oldestTimestamp + windowMs - now);
    rateLimitStore.set(identifier, { timestamps: validTimestamps });
    return { allowed: false, remaining: 0, resetMs };
  }

  validTimestamps.push(now);
  rateLimitStore.set(identifier, { timestamps: validTimestamps });

  return {
    allowed: true,
    remaining: limit - validTimestamps.length,
    resetMs: windowMs,
  };
}
