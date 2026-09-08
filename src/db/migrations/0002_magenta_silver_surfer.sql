CREATE TABLE "cashbox_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"direction" text NOT NULL,
	"amount" double precision NOT NULL,
	"payment_method" text DEFAULT 'CASH' NOT NULL,
	"category" text DEFAULT 'SALES' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"reference_id" text DEFAULT '' NOT NULL,
	"created_by_id" text DEFAULT 'SYSTEM' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"company_name" text DEFAULT 'Elektrik Otomasyon' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"tax_office" text DEFAULT '' NOT NULL,
	"tax_number" text DEFAULT '' NOT NULL,
	"iban" text DEFAULT '' NOT NULL,
	"receipt_footer_note" text DEFAULT 'İşbu belge bilgi amaçlıdır. Malzemeler montaj garantilidir.' NOT NULL,
	"default_vat_rate" double precision DEFAULT 20 NOT NULL,
	"critical_stock_threshold" double precision DEFAULT 5 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"transaction_type" text NOT NULL,
	"amount" double precision NOT NULL,
	"balance_after" double precision DEFAULT 0 NOT NULL,
	"reference_type" text DEFAULT '' NOT NULL,
	"reference_id" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_by_id" text DEFAULT 'SYSTEM' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"tax_office" text DEFAULT '' NOT NULL,
	"tax_number" text DEFAULT '' NOT NULL,
	"customer_type" text DEFAULT 'INDIVIDUAL' NOT NULL,
	"current_balance" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_field_log_materials" (
	"id" text PRIMARY KEY NOT NULL,
	"daily_field_log_id" text NOT NULL,
	"material_id" text NOT NULL,
	"quantity" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_field_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text DEFAULT '' NOT NULL,
	"log_date" timestamp DEFAULT now() NOT NULL,
	"hours_worked" double precision DEFAULT 8 NOT NULL,
	"work_summary" text DEFAULT 'Normal mesai tamamlandı.' NOT NULL,
	"status" text DEFAULT 'PENDING_REVIEW' NOT NULL,
	"reviewed_by_user_id" text DEFAULT '' NOT NULL,
	"reviewed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_sequences" (
	"id" text PRIMARY KEY NOT NULL,
	"prefix" text DEFAULT '' NOT NULL,
	"current_number" integer DEFAULT 1000 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'USTA' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"specialty" text DEFAULT 'GENEL' NOT NULL,
	"daily_wage" double precision DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_guards" (
	"id" text PRIMARY KEY NOT NULL,
	"idempotency_key" text NOT NULL,
	"scope" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"request_hash" text DEFAULT '' NOT NULL,
	"response_status_code" integer DEFAULT 0 NOT NULL,
	"response_body" text DEFAULT '' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "execution_guards_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "incident_traces" (
	"id" text PRIMARY KEY NOT NULL,
	"trace_id" text NOT NULL,
	"user_id" text DEFAULT 'ANONYMOUS' NOT NULL,
	"page_url" text DEFAULT '' NOT NULL,
	"activator_id" text DEFAULT '' NOT NULL,
	"api_endpoint" text DEFAULT '' NOT NULL,
	"function_name" text DEFAULT '' NOT NULL,
	"failing_symbol" text DEFAULT '' NOT NULL,
	"source_file" text DEFAULT '' NOT NULL,
	"failure_category" text DEFAULT 'BUSINESS_RULE' NOT NULL,
	"fail_code" text DEFAULT '' NOT NULL,
	"fail_reason" text DEFAULT '' NOT NULL,
	"blocked_at_step" text DEFAULT '' NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"ip_address" text DEFAULT '127.0.0.1' NOT NULL,
	"user_agent" text DEFAULT '' NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"barcode" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'GENEL' NOT NULL,
	"unit" text DEFAULT 'adet' NOT NULL,
	"quantity" double precision DEFAULT 0 NOT NULL,
	"min_stock_alert" double precision DEFAULT 5 NOT NULL,
	"purchase_price_without_vat" double precision DEFAULT 0 NOT NULL,
	"sale_price_with_vat" double precision DEFAULT 0 NOT NULL,
	"vat_rate" double precision DEFAULT 20 NOT NULL,
	"shelf_location" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "materials_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "progress_billings" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"billing_number" text NOT NULL,
	"period_title" text DEFAULT '' NOT NULL,
	"requested_amount" double precision NOT NULL,
	"approved_amount" double precision DEFAULT 0 NOT NULL,
	"deduction_amount" double precision DEFAULT 0 NOT NULL,
	"net_payable_amount" double precision DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'SUBMITTED' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_by_id" text DEFAULT 'SYSTEM' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_phases" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"progress_percentage" double precision DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"customer_id" text NOT NULL,
	"site_address" text DEFAULT '' NOT NULL,
	"contract_amount" double precision DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'IN_PROGRESS' NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"target_end_date" timestamp DEFAULT now() NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_by_id" text DEFAULT 'SYSTEM' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_invoice_items" (
	"id" text PRIMARY KEY NOT NULL,
	"purchase_invoice_id" text NOT NULL,
	"material_id" text NOT NULL,
	"quantity" double precision NOT NULL,
	"unit_cost_without_vat" double precision NOT NULL,
	"vat_rate" double precision DEFAULT 20 NOT NULL,
	"total_cost" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"supplier_id" text NOT NULL,
	"invoice_date" timestamp DEFAULT now() NOT NULL,
	"due_date" timestamp DEFAULT now() NOT NULL,
	"subtotal" double precision DEFAULT 0 NOT NULL,
	"total_vat" double precision DEFAULT 0 NOT NULL,
	"grand_total" double precision DEFAULT 0 NOT NULL,
	"payment_status" text DEFAULT 'PENDING' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_by_id" text DEFAULT 'SYSTEM' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_invoice_items" (
	"id" text PRIMARY KEY NOT NULL,
	"sales_invoice_id" text NOT NULL,
	"material_id" text NOT NULL,
	"quantity" double precision NOT NULL,
	"unit_price" double precision NOT NULL,
	"vat_rate" double precision DEFAULT 20 NOT NULL,
	"total_price" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"customer_id" text NOT NULL,
	"sale_type" text DEFAULT 'RETAIL' NOT NULL,
	"payment_method" text DEFAULT 'CASH' NOT NULL,
	"payment_status" text DEFAULT 'PAID' NOT NULL,
	"status" text DEFAULT 'COMPLETED' NOT NULL,
	"material_total" double precision DEFAULT 0 NOT NULL,
	"labor_total" double precision DEFAULT 0 NOT NULL,
	"discount_total" double precision DEFAULT 0 NOT NULL,
	"vat_total" double precision DEFAULT 0 NOT NULL,
	"grand_total" double precision DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_by_id" text DEFAULT 'SYSTEM' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sales_invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"material_id" text NOT NULL,
	"movement_type" text NOT NULL,
	"quantity" double precision NOT NULL,
	"previous_quantity" double precision DEFAULT 0 NOT NULL,
	"new_quantity" double precision DEFAULT 0 NOT NULL,
	"reference_type" text DEFAULT '' NOT NULL,
	"reference_id" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_by_id" text DEFAULT 'SYSTEM' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"contact_name" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"current_balance" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_phases" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"name" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_order_completions" (
	"id" text PRIMARY KEY NOT NULL,
	"work_order_id" text NOT NULL,
	"completed_by_user_id" text NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"customer_signature_name" text DEFAULT '' NOT NULL,
	"technician_notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "work_order_completions_work_order_id_unique" UNIQUE("work_order_id")
);
--> statement-breakpoint
CREATE TABLE "work_order_materials" (
	"id" text PRIMARY KEY NOT NULL,
	"work_order_id" text NOT NULL,
	"material_id" text NOT NULL,
	"quantity_used" double precision NOT NULL,
	"unit_price" double precision NOT NULL,
	"total_price" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"order_type" text DEFAULT 'SERVICE_CALL' NOT NULL,
	"customer_id" text NOT NULL,
	"project_id" text DEFAULT '' NOT NULL,
	"project_phase_id" text DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"priority" text DEFAULT 'NORMAL' NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"assigned_user_id" text DEFAULT '' NOT NULL,
	"labor_cost" double precision DEFAULT 0 NOT NULL,
	"total_material_cost" double precision DEFAULT 0 NOT NULL,
	"grand_total" double precision DEFAULT 0 NOT NULL,
	"created_by_id" text DEFAULT 'SYSTEM' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "work_orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
ALTER TABLE "customer_transactions" ADD CONSTRAINT "customer_transactions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_field_log_materials" ADD CONSTRAINT "daily_field_log_materials_daily_field_log_id_daily_field_logs_id_fk" FOREIGN KEY ("daily_field_log_id") REFERENCES "public"."daily_field_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_field_log_materials" ADD CONSTRAINT "daily_field_log_materials_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_field_logs" ADD CONSTRAINT "daily_field_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_billings" ADD CONSTRAINT "progress_billings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_phases" ADD CONSTRAINT "project_phases_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoice_items" ADD CONSTRAINT "purchase_invoice_items_purchase_invoice_id_purchase_invoices_id_fk" FOREIGN KEY ("purchase_invoice_id") REFERENCES "public"."purchase_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoice_items" ADD CONSTRAINT "purchase_invoice_items_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_sales_invoice_id_sales_invoices_id_fk" FOREIGN KEY ("sales_invoice_id") REFERENCES "public"."sales_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_phases" ADD CONSTRAINT "template_phases_template_id_project_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."project_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_completions" ADD CONSTRAINT "work_order_completions_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_materials" ADD CONSTRAINT "work_order_materials_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "customers" ("id", "name", "phone", "address", "customer_type")
VALUES ('CUST-WALKIN', 'Perakende Müşterisi', '', '', 'RETAIL')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "company_settings" ("id", "company_name", "receipt_footer_note", "default_vat_rate", "critical_stock_threshold")
VALUES ('default_company', 'Elektrik Otomasyon', 'İşbu belge bilgi amaçlıdır. Malzemeler montaj garantilidir.', 20, 5)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "project_templates" ("id", "name", "description")
VALUES ('tmpl_building', 'Konut / Bina Elektrik Taahhüdü', 'Bina elektrik altyapısı ve daire tesisat şablonu')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "template_phases" ("id", "template_id", "name", "order_index")
VALUES 
  ('ph_1', 'tmpl_building', 'Temel Topraklama & Şantiye Elektriği', 1),
  ('ph_2', 'tmpl_building', 'Kaba Tesisat (Borulama & Kasa)', 2),
  ('ph_3', 'tmpl_building', 'Kablo Çekimi & Tava Montajı', 3),
  ('ph_4', 'tmpl_building', 'Pano Montajı & Reglaj', 4),
  ('ph_5', 'tmpl_building', 'İnce Montaj (Anahtar, Priz, Armatür)', 5),
  ('ph_6', 'tmpl_building', 'Test, Meger Ölçümü & Devreye Alma', 6)
ON CONFLICT ("id") DO NOTHING;