/**
 * Seed data generator for Sweet Grace Bakery.
 * ALL dates are computed relative to `new Date()` at call time so the
 * "9-days-to-payroll-miss" story stays accurate on any run date.
 */

import { randomUUID } from "crypto";
import type { Transaction } from "./types";

// ─── Date helpers ──────────────────────────────────────────────────────────────

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return fmt(d);
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return fmt(d);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function subMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() - n);
  return d;
}

function nextId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

// ─── Stripe Transactions ───────────────────────────────────────────────────────

export function generateStripeTransactions(
  businessId: string
): Omit<Transaction, "created_at">[] {
  const today = new Date();
  const txns: Omit<Transaction, "created_at">[] = [];

  // ── Daily retail revenue: modest foot traffic over 70 days ──────────────────
  for (let i = 70; i >= 1; i--) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    const count = isWeekend
      ? 3 + Math.floor(Math.random() * 2) // 3-4
      : 2 + Math.floor(Math.random() * 2); // 2-3
    for (let t = 0; t < count; t++) {
      const amount = isWeekend
        ? Math.round((12 + Math.random() * 30) * 100) / 100
        : Math.round((8 + Math.random() * 20) * 100) / 100;
      txns.push({
        id: nextId("txn-str"),
        business_id: businessId,
        source: "stripe",
        transaction_type: "credit",
        invoice_status: null,
        invoice_date: null,
        customer_id: `cus_${Math.random().toString(36).slice(2, 10)}`,
        amount,
        description: "Stripe payment — bakery sale",
        category: "revenue",
        date: fmt(day),
        is_recurring: false,
        recurrence_pattern: null,
        tags: ["pos", "retail"],
      });
    }
  }

  // ── Bi-weekly payroll: $3,800 every 14 days ──────────────────────────────────
  // Last payroll 6 days ago → next payroll 8 days from now (creates the gap)
  for (let daysBack = 6; daysBack <= 90; daysBack += 14) {
    txns.push({
      id: nextId("txn-pay"),
      business_id: businessId,
      source: "stripe",
      transaction_type: "debit",
      invoice_status: null,
      invoice_date: null,
      customer_id: null,
      amount: -3800,
      description: "ADP Payroll",
      category: "payroll",
      date: daysAgo(daysBack),
      is_recurring: true,
      recurrence_pattern: "biweekly",
      tags: ["payroll", "adp"],
    });
  }

  // ── Monthly rent: $2,400 on the 1st of each month ────────────────────────────
  for (let m = 1; m <= 3; m++) {
    const rentDate = startOfMonth(subMonths(today, m));
    txns.push({
      id: nextId("txn-rent"),
      business_id: businessId,
      source: "stripe",
      transaction_type: "debit",
      invoice_status: null,
      invoice_date: null,
      customer_id: null,
      amount: -2400,
      description: "Commercial Rent — 542 Foster St",
      category: "rent",
      date: fmt(rentDate),
      is_recurring: true,
      recurrence_pattern: "monthly",
      tags: ["rent", "overhead"],
    });
  }

  // ── Supplier payments: King Arthur Flour (variable, Net 15) ──────────────────
  const flourAmounts = [1450, 920, 2100, 1680, 1050, 1820];
  flourAmounts.forEach((amt, idx) => {
    txns.push({
      id: nextId("txn-flour"),
      business_id: businessId,
      source: "stripe",
      transaction_type: "debit",
      invoice_status: null,
      invoice_date: null,
      customer_id: null,
      amount: -amt,
      description: "King Arthur Flour — Supplier Payment",
      category: "supplies",
      date: daysAgo(15 + idx * 15),
      is_recurring: true,
      recurrence_pattern: "monthly",
      tags: ["supplier", "flour", "ingredients"],
    });
  });

  // ── Subscriptions (4 tools, two scheduling apps that overlap) ────────────────
  const subs: { desc: string; amount: number; tags: string[] }[] = [
    { desc: "Square POS Monthly", amount: -60, tags: ["pos", "subscription"] },
    { desc: "Canva Pro", amount: -13, tags: ["design", "subscription"] },
    {
      desc: "Homebase Scheduling",
      amount: -89,
      tags: ["scheduling", "hr", "subscription"],
    },
    {
      desc: "7shifts Staff Scheduling",
      amount: -45,
      tags: ["scheduling", "hr", "subscription"],
    },
  ];
  subs.forEach((sub, idx) => {
    for (let m = 1; m <= 3; m++) {
      txns.push({
        id: nextId("txn-sub"),
        business_id: businessId,
        source: "stripe",
        transaction_type: "debit",
        invoice_status: null,
        invoice_date: null,
        customer_id: null,
        amount: sub.amount,
        description: sub.desc,
        category: "subscriptions",
        date: daysAgo(m * 30 + idx * 2),
        is_recurring: true,
        recurrence_pattern: "monthly",
        tags: sub.tags,
      });
    }
  });

  // ── Durham Catering: wholesale account invoices ───────────────────────────────
  // Bi-weekly invoices at $8k-12k each so Durham accounts for >60% of total revenue.
  // This triggers the revenue_concentration red alert.
  const durhamPaidInvoices = [
    { amount: 4200, daysBack: 112 },
    { amount: 4600, daysBack: 98 },
    { amount: 5100, daysBack: 84 },
    { amount: 4800, daysBack: 70 },
    { amount: 4400, daysBack: 56 },
    { amount: 5000, daysBack: 42 },
  ];
  durhamPaidInvoices.forEach(({ amount, daysBack }, i) => {
    txns.push({
      id: nextId("txn-dc-paid"),
      business_id: businessId,
      source: "stripe",
      transaction_type: "invoice",
      invoice_status: "paid",
      invoice_date: daysAgo(daysBack + 12),
      customer_id: "cust-durham-catering",
      amount,
      description: `Durham Catering Co — Invoice #${1015 + i}`,
      category: "revenue",
      date: daysAgo(daysBack),
      is_recurring: false,
      recurrence_pattern: null,
      tags: ["catering", "wholesale", "b2b"],
    });
  });

  // ── The critical unpaid invoice: $3,200, 12 days overdue ─────────────────────
  txns.push({
    id: nextId("txn-dc-unpaid"),
    business_id: businessId,
    source: "stripe",
    transaction_type: "invoice",
    invoice_status: "unpaid",
    invoice_date: daysAgo(12),
    customer_id: "cust-durham-catering",
    amount: 3200,
    description: "Durham Catering Co — Invoice #1021",
    category: "revenue",
    date: daysAgo(12),
    is_recurring: false,
    recurrence_pattern: null,
    tags: ["catering", "wholesale", "b2b"],
  });

  return txns;
}

// ─── Banking Transactions ──────────────────────────────────────────────────────

export interface BankAccount {
  id: string;
  business_id: string;
  type: string;
  current_balance: number;
  as_of: string;
  next_payroll_due: string;
  next_insurance_due: string;
}

export function generateBankingData(businessId: string): {
  account: BankAccount;
  transactions: Omit<Transaction, "created_at">[];
} {
  const transactions: Omit<Transaction, "created_at">[] = [];

  // ── Past quarterly insurance payments ─────────────────────────────────────
  transactions.push({
    id: nextId("txn-ins"),
    business_id: businessId,
    source: "banking",
    transaction_type: "debit",
    invoice_status: null,
    invoice_date: null,
    customer_id: null,
    amount: -1200,
    description: "Business Insurance Premium — Quarterly",
    category: "insurance",
    date: daysAgo(83),
    is_recurring: true,
    recurrence_pattern: "quarterly",
    tags: ["insurance", "overhead"],
  });

  // ── Manual cash/check deposits ───────────────────────────────────────────
  const deposits = [180, 240, 95, 310, 125];
  deposits.forEach((amt, i) => {
    transactions.push({
      id: nextId("txn-dep"),
      business_id: businessId,
      source: "banking",
      transaction_type: "credit",
      invoice_status: null,
      invoice_date: null,
      customer_id: null,
      amount: amt,
      description: "Cash Deposit",
      category: "revenue",
      date: daysAgo(i * 7 + 3),
      is_recurring: false,
      recurrence_pattern: null,
      tags: ["cash", "deposit"],
    });
  });

  const account: BankAccount = {
    id: "acct-sgb-checking",
    business_id: businessId,
    type: "checking",
    current_balance: 3127.23,
    as_of: fmt(new Date()),
    // Future obligations that create the payroll-miss scenario:
    // Payroll in 8 days + Insurance in 7 days = shortfall on ~day 8
    next_payroll_due: daysFromNow(8),
    next_insurance_due: daysFromNow(7),
  };

  return { account, transactions };
}

// ─── Combined payload for /connect ────────────────────────────────────────────

export function generateAllTransactions(businessId: string) {
  const stripe = generateStripeTransactions(businessId);
  const { account, transactions: banking } = generateBankingData(businessId);
  return {
    stripeTxns: stripe,
    bankingTxns: banking,
    account,
    allTxns: [...stripe, ...banking],
  };
}
