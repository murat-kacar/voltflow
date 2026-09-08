import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z
    .string()
    .url()
    .default("postgres://postgres:postgres@localhost:5432/voltflow_db"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(16)
    .default("supersecretdevelopmentkey12345678"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
});

export function assertProductionConfiguration(): void {
  if (process.env.NODE_ENV !== "production") return;
  if (
    !process.env.DATABASE_URL ||
    !process.env.BETTER_AUTH_SECRET ||
    !process.env.BETTER_AUTH_URL ||
    process.env.BETTER_AUTH_SECRET === "supersecretdevelopmentkey12345678"
  ) {
    throw new Error(
      "Production yapılandırması eksik veya development secret kullanıyor.",
    );
  }
}
