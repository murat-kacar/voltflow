/**
 * Kanonik Mimari Bekleyen İşler ve Ertelenmiş Domain Kontratları
 * (Deferred Architectural Backlog & Domain Contracts)
 *
 * Bu dosya, GAG Protokolü (Graphify > Antigravity > Gemini) kapsamındaki tüm araçların
 * ve gelecek ajanların projedeki "doğal eksikler" (iş mantığı/domain henüz netleşmediği için
 * bilerek ertelenen mimari parçalar) hakkında tam bilgi sahibi olması amacıyla tanımlanmıştır.
 *
 * Graphify AST ayrıştırıcısı bu arayüzleri ve sembolleri doğrudan kod grafiğine (graph.json)
 * işleyerek etki analizinde (blast radius) ve yeni modül ekleme aşamalarında ilk sınıf vatandaş yapar.
 */

/**
 * 1. İdempotens ve Çift Tetikleme Koruması Kontratı (AGENTS.md Kural 3.I)
 * Durum: DOĞAL EKSİK (Ödeme, sipariş veya hassas dış webhook domaini eklendiğinde devreye alınacak)
 */
export interface IdempotencyExecutionContract {
  readonly key: string;
  readonly scope: string; // örn: "orders.create", "billing.charge"
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly requestHash: string;
  readonly responseStatusCode?: number;
  readonly responseBody?: string;
  readonly status: "PENDING" | "RESOLVED" | "FAILED";
}

export interface IdempotencyStore {
  acquireLock(key: string, ttlMs: number): Promise<boolean>;
  getExistingResponse(
    key: string,
  ): Promise<IdempotencyExecutionContract | null>;
  saveResponse(key: string, statusCode: number, body: unknown): Promise<void>;
  releaseLock(key: string): Promise<void>;
}

/**
 * 2. Denetim İzi (Audit Trail & Accounting) Kontratı (AGENTS.md Kural 3.C)
 * Durum: DOĞAL EKSİK (Kritik domain varlıkları ve mutasyonlar netleştiğinde schema.ts'ye eklenecek)
 */
export type AuditActionType =
  | "ENTITY_CREATE"
  | "ENTITY_UPDATE"
  | "ENTITY_DELETE"
  | "AUTH_LOGIN"
  | "AUTH_LOGOUT"
  | "ROLE_CHANGE"
  | "SENSITIVE_DATA_ACCESS";

export interface AuditTrailRecord {
  readonly id: string;
  readonly actorId: string;
  readonly actorEmail?: string;
  readonly action: AuditActionType;
  readonly entityName: string;
  readonly entityId: string;
  readonly previousState?: Record<string, unknown>;
  readonly newState?: Record<string, unknown>;
  readonly ipAddress: string;
  readonly userAgent?: string;
  readonly traceId: string;
  readonly timestamp: Date;
}

export interface AuditTrailService {
  recordAudit(
    record: Omit<AuditTrailRecord, "id" | "timestamp">,
  ): Promise<void>;
}

/**
 * 3. Rol Tabanlı Erişim Denetimi (RBAC & Tenant) Kontratı (AGENTS.md Kural 3.C)
 * Durum: DOĞAL EKSİK (Bugünkü tek OFİS kullanıcısı modeli, saha personeli ve ayrık yetkiler devreye alındığında genişletilecek)
 */
export type SystemRole = "OFIS" | "USTA" | "ISCI" | "CIRAK";

export interface RbacPolicyContract {
  readonly role: SystemRole;
  readonly permissions: string[]; // örn: ["users:read", "billing:write", "analytics:view"]
  readonly organizationId?: string; // Multi-tenant pazar yeri için
}

export interface RbacGuard {
  hasPermission(userId: string, requiredPermission: string): Promise<boolean>;
  requireRole(userId: string, role: SystemRole): Promise<void>;
}

/**
 * 4. Gerçek E-Posta İletim Sağlayıcısı Kontratı (AGENTS.md Kural 3.C)
 * Durum: DOĞAL EKSİK (Prod e-posta servisi [Resend, SendGrid, Postmark] seçilene kadar dev console.log aktiftir)
 */
export interface EmailTransportPayload {
  readonly to: string;
  readonly subject: string;
  readonly htmlBody: string;
  readonly textBody?: string;
  readonly templateId?: string;
  readonly variables?: Record<string, unknown>;
}

export interface EmailTransportContract {
  sendEmail(
    payload: EmailTransportPayload,
  ): Promise<{ messageId: string; success: boolean }>;
}

/**
 * 5. Dağıtık Hız Sınırlama (Distributed Rate Limiting) Kontratı (AGENTS.md Kural 3.I)
 * Durum: DOĞAL EKSİK (Sunucusuz Vercel veya çoklu pod ölçeğinde Upstash/Redis ile devreye alınacak)
 */
export interface DistributedRateLimiterContract {
  checkLimit(
    identifier: string,
    limit: number,
    windowSeconds: number,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetSeconds: number;
  }>;
}

/**
 * 6. Otomatik İstek Bağlamı ve Dağıtık İzleme (Request Context / Trace ID) Kontratı (AGENTS.md Kural 3.D)
 * Durum: DOĞAL EKSİK (API rotaları ve middleware derinleştikçe AsyncLocalStorage üzerinden bağlanacak)
 */
export interface RequestContextContract {
  readonly traceId: string;
  readonly timestamp: string;
  readonly clientIp?: string;
  readonly userId?: string;
  readonly organizationId?: string;
}

/**
 * 7. Veritabanı Entegrasyon Test Kontratı (AGENTS.md Kural 2 - Faz 5)
 * Durum: DOĞAL EKSİK (İş akışları ve spesifik domain tabloları bağlandığında CI/CD'de test DB ile çalışacak)
 */
export interface DatabaseIntegrationTestLifecycle {
  setupTestDatabase(): Promise<void>;
  cleanupTestData(): Promise<void>;
  runWithTransactionRollback<T>(fn: () => Promise<T>): Promise<T>;
}

/**
 * MİMARİ BEKLEYEN İŞLER KAYIT KÜTÜĞÜ
 * Graphify ve Ajanlar için Deklaratif Beyan
 */
export const DEFERRED_ARCHITECTURAL_REGISTRY = [
  {
    id: "DEFERRED-001",
    name: "Distributed Rate Limiter (Redis / Upstash)",
    targetRule: "AGENTS.md Section 3.I",
    currentImplementation: "In-memory Sliding Window (Map)",
    deferredReason:
      "Tekil sunucu/dev aşamasında harici Redis bağımlılığı getirmemek; çoklu instance aşamasında aktifleştirilecek.",
    contractInterface: "DistributedRateLimiterContract",
  },
  {
    id: "DEFERRED-002",
    name: "Database Idempotency Store",
    targetRule: "AGENTS.md Section 3.I",
    currentImplementation:
      "Active in schema.ts (execution_guards) & telemetry/idempotency guard",
    deferredReason:
      "AKTİF: Tezgâh satışı ve şantiye sarfiyat işlemleri için idempotency kilidi bağlandı.",
    contractInterface: "IdempotencyExecutionContract",
  },
  {
    id: "DEFERRED-003",
    name: "Audit Trail Storage (audit_logs)",
    targetRule: "AGENTS.md Section 3.C",
    currentImplementation:
      "Active in schema.ts (incident_traces & stock_movements)",
    deferredReason:
      "AKTİF: Olay telemetrisi, stok hareketleri ve işlem denetim izi bağlandı.",
    contractInterface: "AuditTrailRecord",
  },
  {
    id: "DEFERRED-004",
    name: "RBAC & Multi-Tenant Schema",
    targetRule: "AGENTS.md Section 3.C",
    currentImplementation:
      "Single OFIS operator profile; authenticated route-level access guard active",
    deferredReason:
      "Tek kullanıcı tüm operasyonları yürütür. USTA/ISCI/CIRAK kullanıcıları ve en az yetki politikaları saha fazında aktifleştirilecek.",
    contractInterface: "RbacPolicyContract",
  },
  {
    id: "DEFERRED-005",
    name: "Production Email Transport (SMTP / Resend)",
    targetRule: "AGENTS.md Section 3.C",
    currentImplementation: "Console / Logger Emulation",
    deferredReason:
      "Gerçek API anahtarı ve domain DNS yapılandırması aşamasında bağlanacak.",
    contractInterface: "EmailTransportContract",
  },
  {
    id: "DEFERRED-006",
    name: "AsyncLocalStorage Request Context (Auto Trace ID)",
    targetRule: "AGENTS.md Section 3.D",
    currentImplementation: "Manual Trace ID passing",
    deferredReason:
      "API route'ları çoğaldıkça Next.js Server Components / Action boundary'sine bağlanacak.",
    contractInterface: "RequestContextContract",
  },
  {
    id: "DEFERRED-007",
    name: "Database & API Integration Test Suite",
    targetRule: "AGENTS.md Section 2 (Phase 5)",
    currentImplementation: "Unit tests for helper utilities (Vitest)",
    deferredReason:
      "Gerçek domain senaryoları ve API route'ları yazıldıkça genişletilecek.",
    contractInterface: "DatabaseIntegrationTestLifecycle",
  },
] as const;
