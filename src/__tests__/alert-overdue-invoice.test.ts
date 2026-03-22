/**
 * Tests for D4-03: Alert Scenario 2 — Overdue Invoice
 *
 * Tests the detectOverdueInvoiceAlerts function.
 */

import { detectOverdueInvoiceAlerts } from "@/lib/alert-scenarios";
import type { Transaction, ForecastDay } from "@/lib/types";

// Use Date constructor with year/month/day to avoid UTC-vs-local timezone issues
const TODAY = new Date(2026, 2, 21); // March 21, 2026 at local midnight

function makeTxn(overrides: Partial<Transaction>): Transaction {
  return {
    id: "txn-001",
    business_id: "biz-test",
    source: "stripe",
    transaction_type: "credit",
    invoice_status: null,
    invoice_date: null,
    customer_id: null,
    amount: 100,
    description: "Test transaction",
    category: "revenue",
    date: "2026-03-15",
    is_recurring: false,
    recurrence_pattern: null,
    tags: [],
    ...overrides,
  };
}

const overdueInvoice = makeTxn({
  id: "txn-inv-001",
  transaction_type: "invoice",
  invoice_status: "unpaid",
  invoice_date: "2026-03-09", // 12 days before TODAY
  customer_id: "cust-durham-catering",
  amount: 3200,
  description: "Durham Catering Co — Invoice #1021",
});

const paidInvoice = makeTxn({
  id: "txn-inv-002",
  transaction_type: "invoice",
  invoice_status: "paid",
  invoice_date: "2026-03-05",
  customer_id: "cust-other",
  amount: 500,
  description: "Other Client — Invoice #500",
});

const recentUnpaidInvoice = makeTxn({
  id: "txn-inv-003",
  transaction_type: "invoice",
  invoice_status: "unpaid",
  invoice_date: "2026-03-18", // only 3 days ago — not overdue yet
  customer_id: "cust-new",
  amount: 800,
  description: "New Client — Invoice #800",
});

const forecastWithDanger: ForecastDay[] = [
  {
    date: "2026-03-22",
    projected_balance: 4000,
    is_danger: false,
    obligations: [],
    expected_revenue: 480,
  },
  {
    date: "2026-03-28",
    projected_balance: -2200,
    is_danger: true,
    obligations: [
      { description: "Payroll", amount: 3800 },
      { description: "Insurance", amount: 1200 },
    ],
    expected_revenue: 480,
  },
];

const forecastNoDanger: ForecastDay[] = [
  {
    date: "2026-03-22",
    projected_balance: 10000,
    is_danger: false,
    obligations: [],
    expected_revenue: 480,
  },
  {
    date: "2026-03-28",
    projected_balance: 5000,
    is_danger: false,
    obligations: [{ description: "Payroll", amount: 3800 }],
    expected_revenue: 480,
  },
];

describe("detectOverdueInvoiceAlerts", () => {
  it("returns empty array when no overdue invoices exist", () => {
    const result = detectOverdueInvoiceAlerts(
      "biz-test",
      [paidInvoice, recentUnpaidInvoice],
      forecastWithDanger,
      TODAY
    );
    expect(result).toHaveLength(0);
  });

  it("detects overdue unpaid invoices older than 7 days", () => {
    const result = detectOverdueInvoiceAlerts(
      "biz-test",
      [overdueInvoice],
      forecastWithDanger,
      TODAY
    );
    expect(result).toHaveLength(1);
    expect(result[0].scenario).toBe("overdue_invoice");
    expect(result[0].headline).toContain("3,200");
    // invoice_date is 2026-03-09, TODAY is 2026-03-21 → exactly 12 calendar days
    expect(result[0].headline).toContain("12 days overdue");
  });

  it("ignores paid invoices", () => {
    const result = detectOverdueInvoiceAlerts(
      "biz-test",
      [paidInvoice],
      forecastWithDanger,
      TODAY
    );
    expect(result).toHaveLength(0);
  });

  it("ignores invoices less than 7 days old", () => {
    const result = detectOverdueInvoiceAlerts(
      "biz-test",
      [recentUnpaidInvoice],
      forecastWithDanger,
      TODAY
    );
    expect(result).toHaveLength(0);
  });

  it("does NOT flag an invoice exactly 7 calendar days old (boundary)", () => {
    // TODAY is 2026-03-21; invoice on 2026-03-14 is exactly 7 days → should NOT trigger
    const exactly7Days = makeTxn({
      id: "txn-inv-boundary",
      transaction_type: "invoice",
      invoice_status: "unpaid",
      invoice_date: "2026-03-14",
      customer_id: "cust-boundary",
      amount: 1000,
      description: "Boundary Client — Invoice #777",
    });

    const result = detectOverdueInvoiceAlerts(
      "biz-test",
      [exactly7Days],
      forecastWithDanger,
      TODAY
    );
    expect(result).toHaveLength(0);
  });

  it("DOES flag an invoice 8 calendar days old (one past boundary)", () => {
    const eightDays = makeTxn({
      id: "txn-inv-8days",
      transaction_type: "invoice",
      invoice_status: "unpaid",
      invoice_date: "2026-03-13",
      customer_id: "cust-boundary-2",
      amount: 1000,
      description: "Boundary Client 2 — Invoice #778",
    });

    const result = detectOverdueInvoiceAlerts(
      "biz-test",
      [eightDays],
      forecastWithDanger,
      TODAY
    );
    expect(result).toHaveLength(1);
    expect(result[0].headline).toContain("8 days overdue");
  });

  it("extracts customer name from descriptions with hyphens or en dashes", () => {
    const hyphenInvoice = makeTxn({
      id: "txn-inv-hyphen",
      transaction_type: "invoice",
      invoice_status: "unpaid",
      invoice_date: "2026-03-09",
      customer_id: "cust-test",
      amount: 500,
      description: "Acme Corp - Invoice #999",
    });

    const result = detectOverdueInvoiceAlerts(
      "biz-test",
      [hyphenInvoice],
      forecastNoDanger,
      TODAY
    );
    expect(result[0].headline).toContain("Acme Corp");
    expect(result[0].headline).not.toContain("Invoice #999");
  });

  it("returns red severity when forecast has a danger date", () => {
    const result = detectOverdueInvoiceAlerts(
      "biz-test",
      [overdueInvoice],
      forecastWithDanger,
      TODAY
    );
    expect(result[0].severity).toBe("red");
    expect(result[0].detail).toContain("Payroll");
  });

  it("returns amber severity when forecast has no danger date", () => {
    const result = detectOverdueInvoiceAlerts(
      "biz-test",
      [overdueInvoice],
      forecastNoDanger,
      TODAY
    );
    expect(result[0].severity).toBe("amber");
  });

  it("includes send reminder action with correct amount", () => {
    const result = detectOverdueInvoiceAlerts(
      "biz-test",
      [overdueInvoice],
      forecastWithDanger,
      TODAY
    );
    const action = result[0].recommended_actions[0];
    expect(action.action).toBe("Send payment reminder");
    expect(action.amount).toBe(3200);
    expect(action.target).toContain("Durham Catering");
  });

  it("handles multiple overdue invoices", () => {
    const secondOverdue = makeTxn({
      id: "txn-inv-004",
      transaction_type: "invoice",
      invoice_status: "unpaid",
      invoice_date: "2026-03-10",
      customer_id: "cust-other-co",
      amount: 1500,
      description: "Other Co — Invoice #200",
    });

    const result = detectOverdueInvoiceAlerts(
      "biz-test",
      [overdueInvoice, secondOverdue],
      forecastWithDanger,
      TODAY
    );
    expect(result).toHaveLength(2);
  });
});
