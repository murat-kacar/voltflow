ALTER TABLE "cashbox_transactions" ALTER COLUMN "amount" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "company_settings" ALTER COLUMN "default_vat_rate" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "company_settings" ALTER COLUMN "default_vat_rate" SET DEFAULT 20;--> statement-breakpoint
ALTER TABLE "company_settings" ALTER COLUMN "critical_stock_threshold" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "company_settings" ALTER COLUMN "critical_stock_threshold" SET DEFAULT 5;--> statement-breakpoint
ALTER TABLE "customer_transactions" ALTER COLUMN "amount" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "customer_transactions" ALTER COLUMN "balance_after" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "current_balance" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "daily_field_log_materials" ALTER COLUMN "quantity" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "daily_field_logs" ALTER COLUMN "hours_worked" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "daily_field_logs" ALTER COLUMN "hours_worked" SET DEFAULT 8;--> statement-breakpoint
ALTER TABLE "employee_profiles" ALTER COLUMN "daily_wage" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "materials" ALTER COLUMN "quantity" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "materials" ALTER COLUMN "min_stock_alert" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "materials" ALTER COLUMN "min_stock_alert" SET DEFAULT 5;--> statement-breakpoint
ALTER TABLE "materials" ALTER COLUMN "purchase_price_without_vat" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "materials" ALTER COLUMN "sale_price_with_vat" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "materials" ALTER COLUMN "vat_rate" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "materials" ALTER COLUMN "vat_rate" SET DEFAULT 20;--> statement-breakpoint
ALTER TABLE "progress_billings" ALTER COLUMN "requested_amount" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "progress_billings" ALTER COLUMN "approved_amount" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "progress_billings" ALTER COLUMN "deduction_amount" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "progress_billings" ALTER COLUMN "net_payable_amount" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "project_phases" ALTER COLUMN "progress_percentage" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "contract_amount" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "purchase_invoice_items" ALTER COLUMN "quantity" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "purchase_invoice_items" ALTER COLUMN "unit_cost_without_vat" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "purchase_invoice_items" ALTER COLUMN "vat_rate" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "purchase_invoice_items" ALTER COLUMN "vat_rate" SET DEFAULT 20;--> statement-breakpoint
ALTER TABLE "purchase_invoice_items" ALTER COLUMN "total_cost" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "purchase_invoices" ALTER COLUMN "subtotal" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "purchase_invoices" ALTER COLUMN "total_vat" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "purchase_invoices" ALTER COLUMN "grand_total" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "sales_invoice_items" ALTER COLUMN "quantity" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "sales_invoice_items" ALTER COLUMN "unit_price" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "sales_invoice_items" ALTER COLUMN "vat_rate" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "sales_invoice_items" ALTER COLUMN "vat_rate" SET DEFAULT 20;--> statement-breakpoint
ALTER TABLE "sales_invoice_items" ALTER COLUMN "total_price" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "sales_invoices" ALTER COLUMN "material_total" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "sales_invoices" ALTER COLUMN "labor_total" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "sales_invoices" ALTER COLUMN "discount_total" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "sales_invoices" ALTER COLUMN "vat_total" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "sales_invoices" ALTER COLUMN "grand_total" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "stock_movements" ALTER COLUMN "quantity" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "stock_movements" ALTER COLUMN "previous_quantity" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "stock_movements" ALTER COLUMN "new_quantity" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "suppliers" ALTER COLUMN "current_balance" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "work_order_materials" ALTER COLUMN "quantity_used" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "work_order_materials" ALTER COLUMN "unit_price" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "work_order_materials" ALTER COLUMN "total_price" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "work_orders" ALTER COLUMN "labor_cost" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "work_orders" ALTER COLUMN "total_material_cost" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "work_orders" ALTER COLUMN "grand_total" SET DATA TYPE numeric(14, 2);