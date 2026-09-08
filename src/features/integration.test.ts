import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { completeCounterSale } from "@/features/sales/sale-service";
import { env } from "@/lib/env";

const integrationEnabled = process.env.RUN_DB_INTEGRATION_TESTS === "true";
const describeDatabase = integrationEnabled ? describe : describe.skip;

describeDatabase("PostgreSQL database integration lifecycle", () => {
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 1 });
  afterAll(async () => pool.end());

  it("uses exact numeric storage for financial values", async () => {
    const result = await pool.query<{ data_type: string }>(
      `select data_type
       from information_schema.columns
       where table_name = 'cashbox_transactions' and column_name = 'amount'`,
    );

    expect(result.rows[0]?.data_type).toBe("numeric");
  });

  it("rolls back test data instead of mutating the shared database", async () => {
    const client = await pool.connect();
    const customerId = `integration_${randomUUID()}`;
    try {
      await client.query("BEGIN");
      await client.query(
        `insert into customers (id, name, phone, address, tax_office, tax_number, customer_type, current_balance)
         values ($1, 'Integration Test Customer', '', '', '', '', 'INDIVIDUAL', 0)`,
        [customerId],
      );
      const result = await client.query(
        "select id from customers where id = $1",
        [customerId],
      );
      expect(result.rowCount).toBe(1);
      await client.query("ROLLBACK");
      const afterRollback = await client.query(
        "select id from customers where id = $1",
        [customerId],
      );
      expect(afterRollback.rowCount).toBe(0);
    } finally {
      client.release();
    }
  });

  it("completes a sale atomically and rejects insufficient stock", async () => {
    const customerId = `integration_customer_${randomUUID()}`;
    const materialId = `integration_material_${randomUUID()}`;
    const invoiceNumber = `INT-${randomUUID()}`;
    let completedInvoiceId = "";
    try {
      await pool.query("insert into customers (id, name) values ($1, $2)", [
        customerId,
        "Integration Sale Customer",
      ]);
      await pool.query(
        "insert into materials (id, code, name, quantity, sale_price_with_vat) values ($1, $2, $3, $4, $5)",
        [materialId, materialId, "Integration Cable", 2, 10],
      );

      const completed = await completeCounterSale({
        invoiceNumber,
        customerId,
        paymentMethod: "CASH",
        items: [{ materialId, quantity: 1, unitPrice: 10 }],
      });
      completedInvoiceId = completed.invoice.id;
      expect(completed.invoice.invoiceNumber).toBe(invoiceNumber);

      const stockAfterSale = await pool.query<{ quantity: number }>(
        "select quantity from materials where id = $1",
        [materialId],
      );
      expect(Number(stockAfterSale.rows[0]?.quantity)).toBe(1);

      await expect(
        completeCounterSale({
          invoiceNumber: `INT-FAIL-${randomUUID()}`,
          customerId,
          paymentMethod: "CASH",
          items: [{ materialId, quantity: 2, unitPrice: 10 }],
        }),
      ).rejects.toThrow("Yetersiz stok");

      const failedInvoice = await pool.query(
        "select id from sales_invoices where invoice_number like 'INT-FAIL-%'",
      );
      expect(failedInvoice.rowCount).toBe(0);
    } finally {
      await pool
        .query("delete from stock_movements where reference_id = $1", [
          completedInvoiceId,
        ])
        .catch(() => undefined);
      await pool
        .query("delete from cashbox_transactions where description like $1", [
          `Satış Tahsilatı: ${invoiceNumber}`,
        ])
        .catch(() => undefined);
      await pool
        .query("delete from sales_invoices where invoice_number = $1", [
          invoiceNumber,
        ])
        .catch(() => undefined);
      await pool
        .query("delete from materials where id = $1", [materialId])
        .catch(() => undefined);
      await pool
        .query("delete from customers where id = $1", [customerId])
        .catch(() => undefined);
    }
  });
});
