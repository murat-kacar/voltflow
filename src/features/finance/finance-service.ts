import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  cashboxTransactions,
  customers,
  customerTransactions,
  suppliers,
} from "@/db/schema";
import { db } from "@/lib/db";

/**
 * ============================================================================
 * FİNANS & DEĞİŞMEZ DEFTER SERVİSİ (FINANCIAL LEDGER)
 * (Kasa, Cari Tahsilat, Tediye & Çift Taraflı Denetim)
 * ============================================================================
 */

export interface CollectCustomerDebtInput {
  customerId: string;
  amount: number;
  paymentMethod?: "CASH" | "BANK_TRANSFER" | "CREDIT_CARD";
  notes?: string;
  createdById?: string;
}

export interface RecordExpenseInput {
  amount: number;
  paymentMethod?: "CASH" | "BANK_TRANSFER" | "CREDIT_CARD";
  category:
    | "EXPENSE_FUEL"
    | "EXPENSE_FOOD"
    | "EXPENSE_SUPPLIER"
    | "EXPENSE_GENERAL"
    | "EXPENSE_RENT";
  supplierId?: string;
  description: string;
  createdById?: string;
}

/**
 * 1. Müşteriden Açık Hesap Borç Tahsilatı Alma (Fintech Double-Entry)
 * Müşterinin cari alacağını düşer, aynı anda kasaya nakit/banka girişi yapar.
 */
export async function collectCustomerDebt(input: CollectCustomerDebtInput) {
  if (input.amount <= 0) {
    throw new Error("Tahsilat tutarı sıfırdan büyük olmalıdır.");
  }

  const paymentMethod = input.paymentMethod ?? "CASH";
  const createdById = input.createdById ?? "SYSTEM";

  return await db.transaction(async (tx) => {
    // 1. Müşteriyi sorgula
    const [customer] = await tx
      .select()
      .from(customers)
      .where(eq(customers.id, input.customerId));

    if (!customer) {
      throw new Error(`Müşteri bulunamadı: ${input.customerId}`);
    }

    const previousBalance = customer.currentBalance;
    if (input.amount > previousBalance) {
      throw new Error("Tahsilat tutarı müşterinin açık bakiyesini aşamaz.");
    }
    const balanceAfter = previousBalance - input.amount;

    const customerTxId = randomUUID();
    const cashboxTxId = randomUUID();

    // 2. Müşteri cari bakiyesini güncelle
    await tx
      .update(customers)
      .set({
        currentBalance: balanceAfter,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, input.customerId));

    // 3. Cari hareket defterine yaz (Alacak / Credit)
    await tx.insert(customerTransactions).values({
      id: customerTxId,
      customerId: input.customerId,
      transactionType:
        paymentMethod === "BANK_TRANSFER"
          ? "CREDIT_BANK_PAYMENT"
          : "CREDIT_CASH_PAYMENT",
      amount: input.amount,
      balanceAfter,
      referenceType: "CASHBOX",
      referenceId: cashboxTxId,
      description: input.notes ?? "Açık hesap cari tahsilatı",
      createdById,
      createdAt: new Date(),
    });

    // 4. Kasa hareket defterine yaz (Giriş / Inflow)
    await tx.insert(cashboxTransactions).values({
      id: cashboxTxId,
      direction: "INFLOW",
      amount: input.amount,
      paymentMethod,
      category: "COLLECTION",
      description: `Cari Tahsilat - ${customer.name}`,
      referenceId: customerTxId,
      createdById,
      createdAt: new Date(),
    });

    return {
      success: true,
      customerId: customer.id,
      customerName: customer.name,
      previousBalance,
      collectedAmount: input.amount,
      remainingBalance: balanceAfter,
      customerTransactionId: customerTxId,
      cashboxTransactionId: cashboxTxId,
    };
  });
}

/**
 * 2. Masraf veya Toptancı Tediye Ödemesi Kaydetme
 * Kasadan çıkış yapar; eğer toptancı seçilmişse toptancı borcundan düşer.
 */
export async function recordExpenseOrSupplierPayment(
  input: RecordExpenseInput,
) {
  if (input.amount <= 0) {
    throw new Error("Ödeme tutarı sıfırdan büyük olmalıdır.");
  }

  const paymentMethod = input.paymentMethod ?? "CASH";
  const createdById = input.createdById ?? "SYSTEM";
  const cashboxTxId = randomUUID();

  return await db.transaction(async (tx) => {
    let supplierName = "";

    // Toptancı ödemesi ise toptancı bakiyesini güncelle
    if (input.supplierId) {
      const [supplier] = await tx
        .select()
        .from(suppliers)
        .where(eq(suppliers.id, input.supplierId));

      if (!supplier) {
        throw new Error(`Toptancı bulunamadı: ${input.supplierId}`);
      }

      supplierName = supplier.companyName;
      const newBalance = supplier.currentBalance - input.amount;
      if (newBalance < 0) {
        throw new Error("Toptancı ödemesi mevcut borcu aşamaz.");
      }

      await tx
        .update(suppliers)
        .set({
          currentBalance: newBalance,
          updatedAt: new Date(),
        })
        .where(eq(suppliers.id, input.supplierId));
    }

    // Kasadan çıkış kaydı
    await tx.insert(cashboxTransactions).values({
      id: cashboxTxId,
      direction: "OUTFLOW",
      amount: input.amount,
      paymentMethod,
      category: input.category,
      description: input.supplierId
        ? `Toptancı Ödemesi - ${supplierName} (${input.description})`
        : input.description,
      referenceId: input.supplierId ?? "",
      createdById,
      createdAt: new Date(),
    });

    return {
      success: true,
      cashboxTxId,
      outflowAmount: input.amount,
      paymentMethod,
      category: input.category,
      supplierId: input.supplierId ?? "",
    };
  });
}

/**
 * 3. Türetilmiş Cari Bakiye Denetimi (Derived Balance Audit)
 * Immutable hareket defterinden tüm borç ve alacakları toplayarak
 * müşteri tablosundaki bakiyenin doğruluğunu matematiksel olarak garanti eder.
 */
export async function getDerivedCustomerBalance(customerId: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, customerId));

  if (!customer) {
    throw new Error(`Müşteri bulunamadı: ${customerId}`);
  }

  const transactions = await db
    .select()
    .from(customerTransactions)
    .where(eq(customerTransactions.customerId, customerId));

  let calculatedBalance = 0;
  for (const tx of transactions) {
    if (
      tx.transactionType === "DEBIT_SALE" ||
      tx.transactionType === "DEBIT_PROGRESS_BILLING"
    ) {
      calculatedBalance += tx.amount;
    } else if (
      tx.transactionType === "CREDIT_CASH_PAYMENT" ||
      tx.transactionType === "CREDIT_BANK_PAYMENT"
    ) {
      calculatedBalance -= tx.amount;
    }
  }

  const storedBalance = customer.currentBalance;
  const isConsistent = Math.abs(storedBalance - calculatedBalance) < 0.01;

  return {
    customerId,
    customerName: customer.name,
    storedBalance,
    calculatedBalance,
    isConsistent,
    transactionCount: transactions.length,
  };
}

/**
 * 4. Kasa Bakiye ve Özet Raporu (Derived Cashbox Balance)
 * Kasadaki tüm hareketlerin net toplamını hesaplar.
 */
export async function getDerivedCashboxSummary() {
  const allTx = await db.select().from(cashboxTransactions);

  let totalInflow = 0;
  let totalOutflow = 0;
  const byMethod = {
    CASH: 0,
    BANK_TRANSFER: 0,
    CREDIT_CARD: 0,
  };

  for (const tx of allTx) {
    const isCash = tx.paymentMethod === "CASH";
    const isBank = tx.paymentMethod === "BANK_TRANSFER";
    const isCard = tx.paymentMethod === "CREDIT_CARD";

    if (tx.direction === "INFLOW") {
      totalInflow += tx.amount;
      if (isCash) byMethod.CASH += tx.amount;
      if (isBank) byMethod.BANK_TRANSFER += tx.amount;
      if (isCard) byMethod.CREDIT_CARD += tx.amount;
    } else {
      totalOutflow += tx.amount;
      if (isCash) byMethod.CASH -= tx.amount;
      if (isBank) byMethod.BANK_TRANSFER -= tx.amount;
      if (isCard) byMethod.CREDIT_CARD -= tx.amount;
    }
  }

  return {
    totalInflow,
    totalOutflow,
    netCashbox: totalInflow - totalOutflow,
    byMethod,
    totalTransactions: allTx.length,
  };
}
