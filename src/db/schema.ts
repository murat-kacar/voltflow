import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// PostgreSQL NUMERIC keeps monetary, quantity and rate arithmetic exact while
// retaining number values at the TypeScript boundary.
const doublePrecision = (name: string) =>
  numeric(name, { precision: 14, scale: 2, mode: "number" });

/**
 * ============================================================================
 * 1. KIMLIK & OTURUM YÖNETIMI (Better-Auth Core)
 * ============================================================================
 */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: text("role").default("user").notNull(),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  issuer: text("issuer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * ============================================================================
 * 2. SISTEM, ŞIRKET AYARLARI & SAYAÇLAR (Sıfır-NULL)
 * ============================================================================
 */

export const companySettings = pgTable("company_settings", {
  id: text("id").primaryKey(),
  companyName: text("company_name").default("Elektrik Otomasyon").notNull(),
  phone: text("phone").default("").notNull(),
  email: text("email").default("").notNull(),
  address: text("address").default("").notNull(),
  taxOffice: text("tax_office").default("").notNull(),
  taxNumber: text("tax_number").default("").notNull(),
  iban: text("iban").default("").notNull(),
  receiptFooterNote: text("receipt_footer_note")
    .default("İşbu belge bilgi amaçlıdır. Malzemeler montaj garantilidir.")
    .notNull(),
  defaultVatRate: doublePrecision("default_vat_rate").default(20).notNull(),
  criticalStockThreshold: doublePrecision("critical_stock_threshold")
    .default(5)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const documentSequences = pgTable("document_sequences", {
  id: text("id").primaryKey(), // "SALES_INVOICE", "WORK_ORDER", "PROGRESS_BILLING"
  prefix: text("prefix").default("").notNull(), // "FS-", "IE-", "HK-"
  currentNumber: integer("current_number").default(1000).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * ============================================================================
 * 3. ÇALIŞAN & PERSONEL PROFILLERI (Sıfır-NULL)
 * ============================================================================
 */

export const employeeProfiles = pgTable("employee_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role").default("OFIS").notNull(), // Gelecek faz: "OFIS", "USTA", "ISCİ", "CIRAK"
  phone: text("phone").default("").notNull(),
  specialty: text("specialty").default("GENEL").notNull(), // "PANO", "SANTIYE", "ARIZA", "GENEL"
  dailyWage: doublePrecision("daily_wage").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * ============================================================================
 * 4. STOK, MALZEME & HAREKET KATMANI (Sıfır-NULL)
 * ============================================================================
 */

export const materials = pgTable("materials", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  barcode: text("barcode").default("").notNull(),
  name: text("name").notNull(),
  category: text("category").default("GENEL").notNull(), // "KABLO", "SALT_SIGORTA", "AYDINLATMA", "PRIZ_ANAHTAR", "BORU_TAVA", "SARF"
  unit: text("unit").default("adet").notNull(), // "metre", "adet", "paket", "rulo", "boy"
  quantity: doublePrecision("quantity").default(0).notNull(),
  minStockAlert: doublePrecision("min_stock_alert").default(5).notNull(),
  purchasePriceWithoutVat: doublePrecision("purchase_price_without_vat")
    .default(0)
    .notNull(),
  salePriceWithVat: doublePrecision("sale_price_with_vat").default(0).notNull(),
  vatRate: doublePrecision("vat_rate").default(20).notNull(),
  shelfLocation: text("shelf_location").default("").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const stockMovements = pgTable("stock_movements", {
  id: text("id").primaryKey(),
  materialId: text("material_id")
    .notNull()
    .references(() => materials.id, { onDelete: "restrict" }),
  movementType: text("movement_type").notNull(), // "PURCHASE_IN", "RETAIL_SALE_OUT", "FIELD_CONSUMPTION_OUT", "RETURN_IN", "ADJUSTMENT"
  quantity: doublePrecision("quantity").notNull(),
  previousQuantity: doublePrecision("previous_quantity").default(0).notNull(),
  newQuantity: doublePrecision("new_quantity").default(0).notNull(),
  referenceType: text("reference_type").default("").notNull(), // "SALES_INVOICE", "PURCHASE_INVOICE", "DAILY_LOG", "WORK_ORDER"
  referenceId: text("reference_id").default("").notNull(),
  notes: text("notes").default("").notNull(),
  createdById: text("created_by_id").default("SYSTEM").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * ============================================================================
 * 5. TOPTANCILAR & ALIŞ İRSALİYELERİ (Sıfır-NULL)
 * ============================================================================
 */

export const suppliers = pgTable("suppliers", {
  id: text("id").primaryKey(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").default("").notNull(),
  phone: text("phone").default("").notNull(),
  address: text("address").default("").notNull(),
  currentBalance: doublePrecision("current_balance").default(0).notNull(), // Toptancıya borcumuz
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const purchaseInvoices = pgTable("purchase_invoices", {
  id: text("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull(),
  supplierId: text("supplier_id")
    .notNull()
    .references(() => suppliers.id, { onDelete: "restrict" }),
  invoiceDate: timestamp("invoice_date").defaultNow().notNull(),
  dueDate: timestamp("due_date").defaultNow().notNull(),
  subtotal: doublePrecision("subtotal").default(0).notNull(),
  totalVat: doublePrecision("total_vat").default(0).notNull(),
  grandTotal: doublePrecision("grand_total").default(0).notNull(),
  paymentStatus: text("payment_status").default("PENDING").notNull(), // "PENDING", "PAID", "PARTIAL"
  notes: text("notes").default("").notNull(),
  createdById: text("created_by_id").default("SYSTEM").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const purchaseInvoiceItems = pgTable("purchase_invoice_items", {
  id: text("id").primaryKey(),
  purchaseInvoiceId: text("purchase_invoice_id")
    .notNull()
    .references(() => purchaseInvoices.id, { onDelete: "cascade" }),
  materialId: text("material_id")
    .notNull()
    .references(() => materials.id, { onDelete: "restrict" }),
  quantity: doublePrecision("quantity").notNull(),
  unitCostWithoutVat: doublePrecision("unit_cost_without_vat").notNull(),
  vatRate: doublePrecision("vat_rate").default(20).notNull(),
  totalCost: doublePrecision("total_cost").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * ============================================================================
 * 6. MÜŞTERİ CARİLERİ & AÇIK HESAP (Sıfır-NULL)
 * ============================================================================
 */

export const customers = pgTable("customers", {
  id: text("id").primaryKey(), // Sentinel: "CUST-WALKIN"
  name: text("name").notNull(),
  phone: text("phone").default("").notNull(),
  address: text("address").default("").notNull(),
  taxOffice: text("tax_office").default("").notNull(),
  taxNumber: text("tax_number").default("").notNull(),
  customerType: text("customer_type").default("INDIVIDUAL").notNull(), // "INDIVIDUAL", "CONTRACTOR", "RETAIL"
  currentBalance: doublePrecision("current_balance").default(0).notNull(), // Müşterinin bize borcu
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const customerTransactions = pgTable("customer_transactions", {
  id: text("id").primaryKey(),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  transactionType: text("transaction_type").notNull(), // "DEBIT_SALE", "DEBIT_PROGRESS_BILLING", "CREDIT_CASH_PAYMENT", "CREDIT_BANK_PAYMENT"
  amount: doublePrecision("amount").notNull(),
  balanceAfter: doublePrecision("balance_after").default(0).notNull(),
  referenceType: text("reference_type").default("").notNull(), // "SALES_INVOICE", "PROGRESS_BILLING", "CASHBOX"
  referenceId: text("reference_id").default("").notNull(),
  description: text("description").default("").notNull(),
  createdById: text("created_by_id").default("SYSTEM").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cashboxTransactions = pgTable("cashbox_transactions", {
  id: text("id").primaryKey(),
  direction: text("direction").notNull(), // "INFLOW", "OUTFLOW"
  amount: doublePrecision("amount").notNull(),
  paymentMethod: text("payment_method").default("CASH").notNull(), // "CASH", "BANK_TRANSFER", "CREDIT_CARD"
  category: text("category").default("SALES").notNull(), // "SALES", "COLLECTION", "EXPENSE_FUEL", "EXPENSE_FOOD", "EXPENSE_SUPPLIER"
  description: text("description").default("").notNull(),
  referenceId: text("reference_id").default("").notNull(),
  createdById: text("created_by_id").default("SYSTEM").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * ============================================================================
 * 7. TEZGAH SATIŞI & SATIŞ BELGELERİ (Sıfır-NULL)
 * ============================================================================
 */

export const salesInvoices = pgTable("sales_invoices", {
  id: text("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  saleType: text("sale_type").default("RETAIL").notNull(), // "RETAIL", "SERVICE_CALL", "PROJECT"
  paymentMethod: text("payment_method").default("CASH").notNull(), // "CASH", "CREDIT_CARD", "BANK_TRANSFER", "OPEN_ACCOUNT"
  paymentStatus: text("payment_status").default("PAID").notNull(), // "PAID", "UNPAID", "PARTIAL"
  status: text("status").default("COMPLETED").notNull(), // "COMPLETED", "CANCELLED", "REFUNDED"
  materialTotal: doublePrecision("material_total").default(0).notNull(),
  laborTotal: doublePrecision("labor_total").default(0).notNull(),
  discountTotal: doublePrecision("discount_total").default(0).notNull(),
  vatTotal: doublePrecision("vat_total").default(0).notNull(),
  grandTotal: doublePrecision("grand_total").default(0).notNull(),
  notes: text("notes").default("").notNull(),
  createdById: text("created_by_id").default("SYSTEM").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const salesInvoiceItems = pgTable("sales_invoice_items", {
  id: text("id").primaryKey(),
  salesInvoiceId: text("sales_invoice_id")
    .notNull()
    .references(() => salesInvoices.id, { onDelete: "cascade" }),
  materialId: text("material_id")
    .notNull()
    .references(() => materials.id, { onDelete: "restrict" }),
  quantity: doublePrecision("quantity").notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  vatRate: doublePrecision("vat_rate").default(20).notNull(),
  totalPrice: doublePrecision("total_price").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * ============================================================================
 * 8. ŞANTİYE & TAAHHÜT YÖNETİMİ (Sıfır-NULL)
 * ============================================================================
 */

export const projectTemplates = pgTable("project_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const templatePhases = pgTable("template_phases", {
  id: text("id").primaryKey(),
  templateId: text("template_id")
    .notNull()
    .references(() => projectTemplates.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  orderIndex: integer("order_index").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  siteAddress: text("site_address").default("").notNull(),
  contractAmount: doublePrecision("contract_amount").default(0).notNull(),
  status: text("status").default("IN_PROGRESS").notNull(), // "PLANNING", "IN_PROGRESS", "COMPLETED", "ON_HOLD"
  startDate: timestamp("start_date").defaultNow().notNull(),
  targetEndDate: timestamp("target_end_date").defaultNow().notNull(),
  notes: text("notes").default("").notNull(),
  createdById: text("created_by_id").default("SYSTEM").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projectPhases = pgTable("project_phases", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  orderIndex: integer("order_index").default(0).notNull(),
  status: text("status").default("PENDING").notNull(), // "PENDING", "IN_PROGRESS", "COMPLETED"
  progressPercentage: doublePrecision("progress_percentage")
    .default(0)
    .notNull(),
  notes: text("notes").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const progressBillings = pgTable("progress_billings", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "restrict" }),
  billingNumber: text("billing_number").notNull(), // "HK-01"
  periodTitle: text("period_title").default("").notNull(),
  requestedAmount: doublePrecision("requested_amount").notNull(),
  approvedAmount: doublePrecision("approved_amount").default(0).notNull(),
  deductionAmount: doublePrecision("deduction_amount").default(0).notNull(),
  netPayableAmount: doublePrecision("net_payable_amount").default(0).notNull(),
  status: text("status").default("SUBMITTED").notNull(), // "SUBMITTED", "APPROVED", "PAID", "REJECTED"
  notes: text("notes").default("").notNull(),
  createdById: text("created_by_id").default("SYSTEM").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * ============================================================================
 * 9. İŞ EMİRLERİ & SAHA GÖREVLERİ (Sıfır-NULL)
 * ============================================================================
 */

export const workOrders = pgTable("work_orders", {
  id: text("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  orderType: text("order_type").default("SERVICE_CALL").notNull(), // "SERVICE_CALL", "PROJECT_TASK"
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  projectId: text("project_id").default("").notNull(),
  projectPhaseId: text("project_phase_id").default("").notNull(),
  title: text("title").notNull(),
  description: text("description").default("").notNull(),
  address: text("address").default("").notNull(),
  priority: text("priority").default("NORMAL").notNull(), // "LOW", "NORMAL", "HIGH", "URGENT"
  status: text("status").default("OPEN").notNull(), // "OPEN", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"
  assignedUserId: text("assigned_user_id").default("").notNull(),
  laborCost: doublePrecision("labor_cost").default(0).notNull(),
  totalMaterialCost: doublePrecision("total_material_cost")
    .default(0)
    .notNull(),
  grandTotal: doublePrecision("grand_total").default(0).notNull(),
  createdById: text("created_by_id").default("SYSTEM").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workOrderMaterials = pgTable("work_order_materials", {
  id: text("id").primaryKey(),
  workOrderId: text("work_order_id")
    .notNull()
    .references(() => workOrders.id, { onDelete: "cascade" }),
  materialId: text("material_id")
    .notNull()
    .references(() => materials.id, { onDelete: "restrict" }),
  quantityUsed: doublePrecision("quantity_used").notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  totalPrice: doublePrecision("total_price").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workOrderCompletions = pgTable("work_order_completions", {
  id: text("id").primaryKey(),
  workOrderId: text("work_order_id")
    .notNull()
    .unique()
    .references(() => workOrders.id, { onDelete: "cascade" }),
  completedByUserId: text("completed_by_user_id").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  customerSignatureName: text("customer_signature_name").default("").notNull(),
  technicianNotes: text("technician_notes").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * ============================================================================
 * 10. SAHA GÜNLÜĞÜ & PUANTAJ (Sıfır-NULL)
 * ============================================================================
 */

export const dailyFieldLogs = pgTable("daily_field_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  projectId: text("project_id").default("").notNull(),
  logDate: timestamp("log_date").defaultNow().notNull(),
  hoursWorked: doublePrecision("hours_worked").default(8).notNull(),
  workSummary: text("work_summary")
    .default("Normal mesai tamamlandı.")
    .notNull(),
  status: text("status").default("PENDING_REVIEW").notNull(), // "PENDING_REVIEW", "APPROVED", "REJECTED"
  reviewedByUserId: text("reviewed_by_user_id").default("").notNull(),
  reviewedAt: timestamp("reviewed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const dailyFieldLogMaterials = pgTable("daily_field_log_materials", {
  id: text("id").primaryKey(),
  dailyFieldLogId: text("daily_field_log_id")
    .notNull()
    .references(() => dailyFieldLogs.id, { onDelete: "cascade" }),
  materialId: text("material_id")
    .notNull()
    .references(() => materials.id, { onDelete: "restrict" }),
  quantity: doublePrecision("quantity").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * ============================================================================
 * 11. TELEMETRİ, OLAY GÜNLÜĞÜ & İDEMPOTENS (Sıfır-NULL)
 * ============================================================================
 */

export const incidentTraces = pgTable("incident_traces", {
  id: text("id").primaryKey(),
  traceId: text("trace_id").notNull(),
  userId: text("user_id").default("ANONYMOUS").notNull(),
  pageUrl: text("page_url").default("").notNull(),
  activatorId: text("activator_id").default("").notNull(),
  apiEndpoint: text("api_endpoint").default("").notNull(),
  functionName: text("function_name").default("").notNull(),
  failingSymbol: text("failing_symbol").default("").notNull(), // Graphify AST eşleşmesi
  sourceFile: text("source_file").default("").notNull(),
  failureCategory: text("failure_category").default("BUSINESS_RULE").notNull(), // "NETWORK_CUT", "SECURITY_GUARD", "DEVELOPMENT_BUG", "BUSINESS_RULE"
  failCode: text("fail_code").default("").notNull(),
  failReason: text("fail_reason").default("").notNull(),
  blockedAtStep: text("blocked_at_step").default("").notNull(),
  durationMs: integer("duration_ms").default(0).notNull(),
  ipAddress: text("ip_address").default("127.0.0.1").notNull(),
  userAgent: text("user_agent").default("").notNull(),
  details: jsonb("details").default({}).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const executionGuards = pgTable("execution_guards", {
  id: text("id").primaryKey(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  scope: text("scope").notNull(), // "sales.checkout", "field_log.submit"
  status: text("status").default("PENDING").notNull(), // "PENDING", "RESOLVED", "ORPHANED"
  requestHash: text("request_hash").default("").notNull(),
  responseStatusCode: integer("response_status_code").default(0).notNull(),
  responseBody: text("response_body").default("").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
