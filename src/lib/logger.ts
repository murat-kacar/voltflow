type LogLevel = "INFO" | "WARN" | "ERROR";

interface StructuredLogPayload {
  level: LogLevel;
  message: string;
  timestamp: string;
  traceId?: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

function emitLog(
  level: LogLevel,
  message: string,
  options?: {
    traceId?: string;
    context?: Record<string, unknown>;
    err?: unknown;
  },
) {
  const payload: StructuredLogPayload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    traceId: options?.traceId,
    context: options?.context,
  };

  if (options?.err instanceof Error) {
    payload.error = {
      name: options.err.name,
      message: options.err.message,
      stack:
        process.env.NODE_ENV === "development" ? options.err.stack : undefined,
    };
  }

  const jsonString = JSON.stringify(payload);

  if (level === "ERROR") {
    process.stderr.write(`${jsonString}\n`);
  } else {
    process.stdout.write(`${jsonString}\n`);
  }
}

export const logger = {
  info: (
    message: string,
    options?: { traceId?: string; context?: Record<string, unknown> },
  ) => emitLog("INFO", message, options),

  warn: (
    message: string,
    options?: { traceId?: string; context?: Record<string, unknown> },
  ) => emitLog("WARN", message, options),

  error: (
    message: string,
    options?: {
      traceId?: string;
      context?: Record<string, unknown>;
      err?: unknown;
    },
  ) => emitLog("ERROR", message, options),
};
