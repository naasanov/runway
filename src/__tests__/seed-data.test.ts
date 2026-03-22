/**
 * Tests for src/lib/seed-data.ts (Dev 1 — D1-02, D1-03, D1-04)
 *
 * Core invariant: all dates are relative to today so the "9-days-to-payroll-miss"
 * demo story stays accurate on any run date.
 */

import {
  generateStripeTransactions,
  generateBankingData,
  generateAllTransactions,
  generateConcentrationStripeTransactions,
  generateConcentrationBankingData,
  generateConcentrationTransactions,
} from "@/lib/seed-data";
import { computeForecast } from "@/lib/forecast";

// ─── helpers ──────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateInDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ─── generateStripeTransactions ───────────────────────────────────────────────

describe("generateStripeTransactions", () => {
  const BIZ_ID = "biz-test-001";
  let txns: ReturnType<typeof generateStripeTransactions>;

  beforeEach(() => {
    txns = generateStripeTransactions(BIZ_ID);
  });

  it("returns at least 200 transactions (90 days of retail + recurring items)", () => {
    expect(txns.length).toBeGreaterThanOrEqual(200);
  });

  it("assigns business_id to every transaction", () => {
    expect(txns.every((t) => t.business_id === BIZ_ID)).toBe(true);
  });

  it("has exactly one unpaid Durham Catering invoice", () => {
    const unpaid = txns.filter((t) => t.invoice_status === "unpaid");
    expect(unpaid).toHaveLength(1);
    expect(unpaid[0].customer_id).toBe("cust-durham-catering");
    expect(unpaid[0].amount).toBe(3200);
  });

  it("unpaid invoice date is 12 days ago (relative to today)", () => {
    const unpaid = txns.find((t) => t.invoice_status === "unpaid")!;
    expect(unpaid.invoice_date).toBe(dateInDays(-12));
    expect(unpaid.date).toBe(dateInDays(-12));
  });

  it("Durham Catering total revenue (paid + unpaid) accounts for >60% of all positive revenue", () => {
    // Revenue concentration alert counts all revenue from a customer, including uncollected invoices
    const durhamRevenue = txns
      .filter((t) => t.customer_id === "cust-durham-catering" && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalRevenue = txns
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    expect(durhamRevenue / totalRevenue).toBeGreaterThan(0.6);
  });

  it("has bi-weekly payroll debits of $3,800", () => {
    const payrolls = txns.filter((t) => t.description.includes("Payroll"));
    expect(payrolls.length).toBeGreaterThanOrEqual(3);
    expect(payrolls.every((t) => t.amount === -3800)).toBe(true);
    expect(payrolls.every((t) => t.recurrence_pattern === "biweekly")).toBe(
      true
    );
  });

  it("has monthly rent debits of $2,400", () => {
    const rent = txns.filter((t) => t.description.includes("Rent"));
    expect(rent.length).toBeGreaterThanOrEqual(2);
    expect(rent.every((t) => t.amount === -2400)).toBe(true);
  });

  it("has two overlapping scheduling subscriptions (Homebase + 7shifts)", () => {
    const scheduling = txns.filter(
      (t) =>
        t.tags.includes("scheduling") && t.transaction_type === "debit"
    );
    const descriptions = Array.from(new Set(scheduling.map((t) => t.description)));
    expect(descriptions.length).toBeGreaterThanOrEqual(2);
    expect(descriptions.some((d) => d.toLowerCase().includes("homebase"))).toBe(
      true
    );
    expect(descriptions.some((d) => d.toLowerCase().includes("7shifts"))).toBe(
      true
    );
  });

  it("all dates are in the past (no future-dated stripe transactions)", () => {
    const futureTxns = txns.filter((t) => t.date > today());
    expect(futureTxns).toHaveLength(0);
  });

  it("all transaction IDs are unique", () => {
    const ids = txns.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ─── generateBankingData ──────────────────────────────────────────────────────

describe("generateBankingData", () => {
  const BIZ_ID = "biz-test-002";
  let result: ReturnType<typeof generateBankingData>;

  beforeEach(() => {
    result = generateBankingData(BIZ_ID);
  });

  it("returns account with current_balance of 3127.23", () => {
    expect(result.account.current_balance).toBe(3127.23);
  });

  it("next_payroll_due is 8 days from today", () => {
    expect(result.account.next_payroll_due).toBe(dateInDays(8));
  });

  it("next_insurance_due is 7 days from today", () => {
    expect(result.account.next_insurance_due).toBe(dateInDays(7));
  });

  it("as_of is today", () => {
    expect(result.account.as_of).toBe(today());
  });

  it("has a past quarterly insurance debit of $1,200", () => {
    const insurance = result.transactions.filter(
      (t) =>
        t.category === "insurance" &&
        t.amount === -1200 &&
        t.recurrence_pattern === "quarterly"
    );
    expect(insurance.length).toBeGreaterThanOrEqual(1);
  });

  it("assigns business_id to all transactions", () => {
    expect(result.transactions.every((t) => t.business_id === BIZ_ID)).toBe(
      true
    );
  });

  it("all banking transaction dates are in the past", () => {
    const futureTxns = result.transactions.filter((t) => t.date > today());
    expect(futureTxns).toHaveLength(0);
  });
});

// ─── generateAllTransactions ──────────────────────────────────────────────────

describe("generateAllTransactions", () => {
  const BIZ_ID = "biz-test-003";
  let result: ReturnType<typeof generateAllTransactions>;

  beforeEach(() => {
    result = generateAllTransactions(BIZ_ID);
  });

  it("allTxns combines stripe and banking transactions", () => {
    expect(result.allTxns.length).toBe(
      result.stripeTxns.length + result.bankingTxns.length
    );
  });

  it("all IDs across combined set are unique", () => {
    const ids = result.allTxns.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("account current_balance is 3127.23", () => {
    expect(result.account.current_balance).toBe(3127.23);
  });

  // ── Payroll-miss scenario validation (D1-03) ──────────────────────────────
  // Confirm the data setup creates the correct shortfall:
  // current_balance ($4,847) < payroll ($3,800) + insurance ($1,200) = $5,000
  it("payroll + insurance on days 7-8 exceeds current balance (creates shortfall)", () => {
    const balance = result.account.current_balance;
    const upcomingPayroll = 3800;
    const upcomingInsurance = 1200;
    expect(upcomingPayroll + upcomingInsurance).toBeGreaterThan(balance);
  });

  it("produces a forecast runway of 14 days or less for the demo story", () => {
    const forecast = computeForecast(
      result.allTxns as never,
      result.account.current_balance,
      30
    );

    expect(forecast.runwayDays).toBeLessThanOrEqual(14);
    expect(forecast.firstNegativeDate).not.toBeNull();
  });
});

describe("concentration scenario seed data", () => {
  const BIZ_ID = "biz-concentration-test";

  it("concentration stripe seed yields >75% revenue from one client", () => {
    const txns = generateConcentrationStripeTransactions(BIZ_ID);

    const revenue = txns.filter((t) => t.amount > 0 && t.category === "revenue");
    const totalRevenue = revenue.reduce((sum, t) => sum + t.amount, 0);
    const topClientRevenue = revenue
      .filter((t) => t.customer_id === "cust-techcorp-solutions")
      .reduce((sum, t) => sum + t.amount, 0);

    expect(totalRevenue).toBeGreaterThan(0);
    expect(topClientRevenue / totalRevenue).toBeGreaterThan(0.75);
  });

  it("concentration stripe seed has clean subscriptions (no scheduling overlap tags)", () => {
    const txns = generateConcentrationStripeTransactions(BIZ_ID);
    const schedulingTagged = txns.filter((t) => t.tags.includes("scheduling"));
    expect(schedulingTagged).toHaveLength(0);
  });

  it("concentration banking seed keeps runway healthy (no near-term crisis)", () => {
    const { account } = generateConcentrationBankingData(BIZ_ID);
    expect(account.current_balance).toBe(52000);
    expect(account.next_payroll_due).toBe(dateInDays(9));
    expect(account.next_insurance_due).toBe(dateInDays(45));
  });

  it("generateConcentrationTransactions combines stripe + banking transactions", () => {
    const result = generateConcentrationTransactions(BIZ_ID);
    expect(result.allTxns.length).toBe(
      result.stripeTxns.length + result.bankingTxns.length
    );
  });
});
