import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
  account,
  cashboxTransactions,
  companySettings,
  customers,
  customerTransactions,
  dailyFieldLogMaterials,
  dailyFieldLogs,
  documentSequences,
  employeeProfiles,
  executionGuards,
  incidentTraces,
  materials,
  progressBillings,
  projectPhases,
  projects,
  projectTemplates,
  purchaseInvoiceItems,
  purchaseInvoices,
  salesInvoiceItems,
  salesInvoices,
  session,
  stockMovements,
  suppliers,
  templatePhases,
  user,
  verification,
  workOrderCompletions,
  workOrderMaterials,
  workOrders,
} from "./schema";

/**
 * ============================================================================
 * SIFIR-NULL RUNTIME ZOD SCHEMAS & TIPLERI
 * (AGENTS.md Rule 3.E - Boundary Input Validation)
 * ============================================================================
 */

// 1. Auth & Kullanıcı
export const selectUserSchema = createSelectSchema(user);
export const insertUserSchema = createInsertSchema(user, {
  email: z.string().email(),
  name: z.string().min(2).max(100),
});
export type SelectUser = z.infer<typeof selectUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

export const selectSessionSchema = createSelectSchema(session);
export const insertSessionSchema = createInsertSchema(session);
export const selectAccountSchema = createSelectSchema(account);
export const insertAccountSchema = createInsertSchema(account);
export const selectVerificationSchema = createSelectSchema(verification);
export const insertVerificationSchema = createInsertSchema(verification);

// 2. Sistem & Şirket Ayarları
export const selectCompanySettingsSchema = createSelectSchema(companySettings);
export const insertCompanySettingsSchema = createInsertSchema(companySettings, {
  id: z.string().optional().default("default_company"),
  companyName: z.string().default("Elektrik Otomasyon"),
  defaultVatRate: z.number().default(20),
  criticalStockThreshold: z.number().default(5),
  receiptFooterNote: z
    .string()
    .default("İşbu belge bilgi amaçlıdır. Malzemeler montaj garantilidir."),
  phone: z.string().default(""),
  email: z.string().default(""),
  address: z.string().default(""),
  taxOffice: z.string().default(""),
  taxNumber: z.string().default(""),
  iban: z.string().default(""),
});
export type SelectCompanySettings = z.infer<typeof selectCompanySettingsSchema>;
export type InsertCompanySettings = z.infer<typeof insertCompanySettingsSchema>;

export const selectDocumentSequencesSchema =
  createSelectSchema(documentSequences);
export const insertDocumentSequencesSchema = createInsertSchema(
  documentSequences,
  {
    prefix: z.string().default(""),
    currentNumber: z.number().int().default(1000),
  },
);
export type SelectDocumentSequences = z.infer<
  typeof selectDocumentSequencesSchema
>;
export type InsertDocumentSequences = z.infer<
  typeof insertDocumentSequencesSchema
>;

// 3. Çalışan & Personel Profili
export const selectEmployeeProfileSchema = createSelectSchema(employeeProfiles);
export const insertEmployeeProfileSchema = createInsertSchema(
  employeeProfiles,
  {
    id: z.string().optional().default(""),
    role: z.enum(["PATRON", "OFIS", "USTA", "CIRAK"]).default("USTA"),
    phone: z.string().default(""),
    specialty: z.string().default("GENEL"),
    dailyWage: z.number().min(0).default(0),
    isActive: z.boolean().default(true),
  },
);
export type SelectEmployeeProfile = z.infer<typeof selectEmployeeProfileSchema>;
export type InsertEmployeeProfile = z.infer<typeof insertEmployeeProfileSchema>;

// 4. Malzeme & Stok
export const selectMaterialSchema = createSelectSchema(materials);
export const insertMaterialSchema = createInsertSchema(materials, {
  id: z.string().optional().default(""),
  code: z.string().min(2).max(50),
  barcode: z.string().default(""),
  name: z.string().min(2).max(200),
  category: z.string().default("GENEL"),
  unit: z.string().default("adet"),
  quantity: z.number().default(0),
  minStockAlert: z.number().min(0).default(5),
  purchasePriceWithoutVat: z.number().min(0).default(0),
  salePriceWithVat: z.number().min(0).default(0),
  vatRate: z.number().min(0).default(20),
  shelfLocation: z.string().default(""),
  isActive: z.boolean().default(true),
});
export type SelectMaterial = z.infer<typeof selectMaterialSchema>;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;

export const selectStockMovementSchema = createSelectSchema(stockMovements);
export const insertStockMovementSchema = createInsertSchema(stockMovements, {
  movementType: z.enum([
    "PURCHASE_IN",
    "RETAIL_SALE_OUT",
    "FIELD_CONSUMPTION_OUT",
    "RETURN_IN",
    "ADJUSTMENT",
  ]),
  quantity: z.number(),
  previousQuantity: z.number().default(0),
  newQuantity: z.number().default(0),
});
export type SelectStockMovement = z.infer<typeof selectStockMovementSchema>;
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;

// 5. Toptancı & Alış
export const selectSupplierSchema = createSelectSchema(suppliers);
export const insertSupplierSchema = createInsertSchema(suppliers, {
  companyName: z.string().min(2).max(200),
  contactName: z.string().default(""),
  phone: z.string().default(""),
  address: z.string().default(""),
  currentBalance: z.number().default(0),
});
export type SelectSupplier = z.infer<typeof selectSupplierSchema>;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

export const selectPurchaseInvoiceSchema = createSelectSchema(purchaseInvoices);
export const insertPurchaseInvoiceSchema = createInsertSchema(
  purchaseInvoices,
  {
    invoiceNumber: z.string().min(1),
    subtotal: z.number().min(0).default(0),
    totalVat: z.number().min(0).default(0),
    grandTotal: z.number().min(0).default(0),
    paymentStatus: z.enum(["PENDING", "PAID", "PARTIAL"]).default("PENDING"),
  },
);
export type SelectPurchaseInvoice = z.infer<typeof selectPurchaseInvoiceSchema>;
export type InsertPurchaseInvoice = z.infer<typeof insertPurchaseInvoiceSchema>;

export const selectPurchaseInvoiceItemSchema =
  createSelectSchema(purchaseInvoiceItems);
export const insertPurchaseInvoiceItemSchema =
  createInsertSchema(purchaseInvoiceItems);
export type SelectPurchaseInvoiceItem = z.infer<
  typeof selectPurchaseInvoiceItemSchema
>;
export type InsertPurchaseInvoiceItem = z.infer<
  typeof insertPurchaseInvoiceItemSchema
>;

// 6. Müşteri & Cari & Kasa
export const selectCustomerSchema = createSelectSchema(customers);
export const insertCustomerSchema = createInsertSchema(customers, {
  name: z.string().min(2).max(200),
  phone: z.string().default(""),
  address: z.string().default(""),
  taxOffice: z.string().default(""),
  taxNumber: z.string().default(""),
  customerType: z
    .enum(["INDIVIDUAL", "CONTRACTOR", "RETAIL"])
    .default("INDIVIDUAL"),
  currentBalance: z.number().default(0),
});
export type SelectCustomer = z.infer<typeof selectCustomerSchema>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export const selectCustomerTransactionSchema =
  createSelectSchema(customerTransactions);
export const insertCustomerTransactionSchema = createInsertSchema(
  customerTransactions,
  {
    transactionType: z.enum([
      "DEBIT_SALE",
      "DEBIT_PROGRESS_BILLING",
      "CREDIT_CASH_PAYMENT",
      "CREDIT_BANK_PAYMENT",
    ]),
    amount: z.number(),
    balanceAfter: z.number().default(0),
  },
);
export type SelectCustomerTransaction = z.infer<
  typeof selectCustomerTransactionSchema
>;
export type InsertCustomerTransaction = z.infer<
  typeof insertCustomerTransactionSchema
>;

export const selectCashboxTransactionSchema =
  createSelectSchema(cashboxTransactions);
export const insertCashboxTransactionSchema = createInsertSchema(
  cashboxTransactions,
  {
    direction: z.enum(["INFLOW", "OUTFLOW"]),
    amount: z.number().positive(),
    paymentMethod: z
      .enum(["CASH", "BANK_TRANSFER", "CREDIT_CARD"])
      .default("CASH"),
    category: z.string().default("SALES"),
  },
);
export type SelectCashboxTransaction = z.infer<
  typeof selectCashboxTransactionSchema
>;
export type InsertCashboxTransaction = z.infer<
  typeof insertCashboxTransactionSchema
>;

// 7. Satış & Tezgâh (POS)
export const selectSalesInvoiceSchema = createSelectSchema(salesInvoices);
export const insertSalesInvoiceSchema = createInsertSchema(salesInvoices, {
  id: z.string().optional().default(""),
  invoiceNumber: z.string().min(1),
  saleType: z.enum(["RETAIL", "SERVICE_CALL", "PROJECT"]).default("RETAIL"),
  paymentMethod: z
    .enum(["CASH", "CREDIT_CARD", "BANK_TRANSFER", "OPEN_ACCOUNT"])
    .default("CASH"),
  paymentStatus: z.enum(["PAID", "UNPAID", "PARTIAL"]).default("PAID"),
  status: z.enum(["COMPLETED", "CANCELLED", "REFUNDED"]).default("COMPLETED"),
  materialTotal: z.number().min(0).default(0),
  laborTotal: z.number().min(0).default(0),
  discountTotal: z.number().min(0).default(0),
  vatTotal: z.number().min(0).default(0),
  grandTotal: z.number().min(0).default(0),
});
export type SelectSalesInvoice = z.infer<typeof selectSalesInvoiceSchema>;
export type InsertSalesInvoice = z.infer<typeof insertSalesInvoiceSchema>;

export const selectSalesInvoiceItemSchema =
  createSelectSchema(salesInvoiceItems);
export const insertSalesInvoiceItemSchema = createInsertSchema(
  salesInvoiceItems,
  {
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    vatRate: z.number().min(0).default(20),
    totalPrice: z.number().min(0),
  },
);
export type SelectSalesInvoiceItem = z.infer<
  typeof selectSalesInvoiceItemSchema
>;
export type InsertSalesInvoiceItem = z.infer<
  typeof insertSalesInvoiceItemSchema
>;

// 8. Şantiye & Taahhüt
export const selectProjectTemplateSchema = createSelectSchema(projectTemplates);
export const insertProjectTemplateSchema = createInsertSchema(projectTemplates);
export type SelectProjectTemplate = z.infer<typeof selectProjectTemplateSchema>;
export type InsertProjectTemplate = z.infer<typeof insertProjectTemplateSchema>;

export const selectTemplatePhaseSchema = createSelectSchema(templatePhases);
export const insertTemplatePhaseSchema = createInsertSchema(templatePhases);
export type SelectTemplatePhase = z.infer<typeof selectTemplatePhaseSchema>;
export type InsertTemplatePhase = z.infer<typeof insertTemplatePhaseSchema>;

export const selectProjectSchema = createSelectSchema(projects);
export const insertProjectSchema = createInsertSchema(projects, {
  name: z.string().min(2).max(200),
  siteAddress: z.string().default(""),
  contractAmount: z.number().min(0).default(0),
  status: z
    .enum(["PLANNING", "IN_PROGRESS", "COMPLETED", "ON_HOLD"])
    .default("IN_PROGRESS"),
});
export type SelectProject = z.infer<typeof selectProjectSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export const selectProjectPhaseSchema = createSelectSchema(projectPhases);
export const insertProjectPhaseSchema = createInsertSchema(projectPhases, {
  name: z.string().min(2),
  orderIndex: z.number().int().default(0),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).default("PENDING"),
  progressPercentage: z.number().min(0).max(100).default(0),
});
export type SelectProjectPhase = z.infer<typeof selectProjectPhaseSchema>;
export type InsertProjectPhase = z.infer<typeof insertProjectPhaseSchema>;

export const selectProgressBillingSchema = createSelectSchema(progressBillings);
export const insertProgressBillingSchema = createInsertSchema(
  progressBillings,
  {
    billingNumber: z.string().min(1),
    periodTitle: z.string().default(""),
    requestedAmount: z.number().min(0),
    approvedAmount: z.number().min(0).default(0),
    deductionAmount: z.number().min(0).default(0),
    netPayableAmount: z.number().min(0).default(0),
    status: z
      .enum(["SUBMITTED", "APPROVED", "PAID", "REJECTED"])
      .default("SUBMITTED"),
  },
);
export type SelectProgressBilling = z.infer<typeof selectProgressBillingSchema>;
export type InsertProgressBilling = z.infer<typeof insertProgressBillingSchema>;

// 9. İş Emirleri & Servis
export const selectWorkOrderSchema = createSelectSchema(workOrders);
export const insertWorkOrderSchema = createInsertSchema(workOrders, {
  orderNumber: z.string().min(1),
  orderType: z.enum(["SERVICE_CALL", "PROJECT_TASK"]).default("SERVICE_CALL"),
  title: z.string().min(2).max(200),
  description: z.string().default(""),
  address: z.string().default(""),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  status: z
    .enum(["OPEN", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
    .default("OPEN"),
  laborCost: z.number().min(0).default(0),
  totalMaterialCost: z.number().min(0).default(0),
  grandTotal: z.number().min(0).default(0),
});
export type SelectWorkOrder = z.infer<typeof selectWorkOrderSchema>;
export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;

export const selectWorkOrderMaterialSchema =
  createSelectSchema(workOrderMaterials);
export const insertWorkOrderMaterialSchema = createInsertSchema(
  workOrderMaterials,
  {
    quantityUsed: z.number().positive(),
    unitPrice: z.number().min(0),
    totalPrice: z.number().min(0),
  },
);
export type SelectWorkOrderMaterial = z.infer<
  typeof selectWorkOrderMaterialSchema
>;
export type InsertWorkOrderMaterial = z.infer<
  typeof insertWorkOrderMaterialSchema
>;

export const selectWorkOrderCompletionSchema =
  createSelectSchema(workOrderCompletions);
export const insertWorkOrderCompletionSchema =
  createInsertSchema(workOrderCompletions);
export type SelectWorkOrderCompletion = z.infer<
  typeof selectWorkOrderCompletionSchema
>;
export type InsertWorkOrderCompletion = z.infer<
  typeof insertWorkOrderCompletionSchema
>;

// 10. Saha Günlüğü & Puantaj
export const selectDailyFieldLogSchema = createSelectSchema(dailyFieldLogs);
export const insertDailyFieldLogSchema = createInsertSchema(dailyFieldLogs, {
  id: z.string().optional().default(""),
  hoursWorked: z.number().min(0).max(24).default(8),
  workSummary: z.string().default("Normal mesai tamamlandı."),
  status: z
    .enum(["PENDING_REVIEW", "APPROVED", "REJECTED"])
    .default("PENDING_REVIEW"),
});
export type SelectDailyFieldLog = z.infer<typeof selectDailyFieldLogSchema>;
export type InsertDailyFieldLog = z.infer<typeof insertDailyFieldLogSchema>;

export const selectDailyFieldLogMaterialSchema = createSelectSchema(
  dailyFieldLogMaterials,
);
export const insertDailyFieldLogMaterialSchema = createInsertSchema(
  dailyFieldLogMaterials,
  {
    quantity: z.number().positive(),
  },
);
export type SelectDailyFieldLogMaterial = z.infer<
  typeof selectDailyFieldLogMaterialSchema
>;
export type InsertDailyFieldLogMaterial = z.infer<
  typeof insertDailyFieldLogMaterialSchema
>;

// 11. Olay Günlüğü & İdempotens
export const selectIncidentTraceSchema = createSelectSchema(incidentTraces);
export const insertIncidentTraceSchema = createInsertSchema(incidentTraces, {
  id: z.string().optional().default(""),
  durationMs: z.number().int().default(0),
  ipAddress: z.string().default("127.0.0.1"),
  userAgent: z.string().default(""),
  pageUrl: z.string().default(""),
  activatorId: z.string().default(""),
  apiEndpoint: z.string().default(""),
  failingSymbol: z.string().default(""),
  sourceFile: z.string().default(""),
  failCode: z.string().default(""),
  failReason: z.string().default(""),
  blockedAtStep: z.string().default(""),
  failureCategory: z
    .enum(["NETWORK_CUT", "SECURITY_GUARD", "DEVELOPMENT_BUG", "BUSINESS_RULE"])
    .default("BUSINESS_RULE"),
});
export type SelectIncidentTrace = z.infer<typeof selectIncidentTraceSchema>;
export type InsertIncidentTrace = z.infer<typeof insertIncidentTraceSchema>;

export const selectExecutionGuardSchema = createSelectSchema(executionGuards);
export const insertExecutionGuardSchema = createInsertSchema(executionGuards, {
  id: z.string().optional().default(""),
  status: z.enum(["PENDING", "RESOLVED", "ORPHANED"]).default("PENDING"),
  requestHash: z.string().default(""),
  responseStatusCode: z.number().int().default(0),
  responseBody: z.string().default(""),
});
export type SelectExecutionGuard = z.infer<typeof selectExecutionGuardSchema>;
export type InsertExecutionGuard = z.infer<typeof insertExecutionGuardSchema>;
