import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../db/schema";
import { env } from "./env";

const { Pool } = pg;

declare global {
  var __postgres_pool__: pg.Pool | undefined;
}

const pool =
  globalThis.__postgres_pool__ ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__postgres_pool__ = pool;
}

export const db = drizzle(pool, { schema });
