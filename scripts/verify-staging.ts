import pg from "pg";
import { env } from "@/lib/env";

const requiredTables = [
  "user",
  "session",
  "materials",
  "customers",
  "cashbox_transactions",
  "sales_invoices",
  "execution_guards",
];

if (process.env.NODE_ENV === "production") {
  if (env.BETTER_AUTH_SECRET === "supersecretdevelopmentkey12345678") {
    throw new Error("Production verification rejected the development auth secret.");
  }
  if (!env.BETTER_AUTH_URL.startsWith("https://")) {
    throw new Error("Production BETTER_AUTH_URL must use HTTPS.");
  }
}

const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 1 });
try {
  const client = await pool.connect();
  try {
    await client.query("select 1");
    const tables = await client.query<{ table_name: string }>(
      `select table_name from information_schema.tables
       where table_schema = 'public' and table_name = any($1::text[])`,
      [requiredTables],
    );
    const presentTables = new Set(tables.rows.map((row) => row.table_name));
    const missingTables = requiredTables.filter((table) => !presentTables.has(table));
    if (missingTables.length > 0) {
      throw new Error(`Missing required tables: ${missingTables.join(", ")}`);
    }

    const numeric = await client.query<{ data_type: string }>(
      `select data_type from information_schema.columns
       where table_name = 'cashbox_transactions' and column_name = 'amount'`,
    );
    if (numeric.rows[0]?.data_type !== "numeric") {
      throw new Error("cashbox_transactions.amount is not numeric; apply migrations first.");
    }
    process.stdout.write(`${JSON.stringify({ level: "INFO", message: "Staging verification passed." })}\n`);
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
