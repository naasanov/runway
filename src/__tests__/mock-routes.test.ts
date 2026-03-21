/**
 * Tests for mock API route handlers (Dev 1 — D1-02, D1-03)
 *
 * Calls the route handler functions directly (no HTTP server needed).
 */

import { GET as stripeGET } from "@/app/api/mock/stripe/transactions/route";
import { GET as bankingGET } from "@/app/api/mock/banking/accounts/route";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateInDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ─── GET /api/mock/stripe/transactions ────────────────────────────────────────

describe("GET /api/mock/stripe/transactions", () => {
  it("returns 200 with transactions array and count", async () => {
    const res = await stripeGET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.transactions)).toBe(true);
    expect(typeof body.count).toBe("number");
    expect(body.count).toBe(body.transactions.length);
  });

  it("returns at least 200 transactions", async () => {
    const res = await stripeGET();
    const body = await res.json();
    expect(body.transactions.length).toBeGreaterThanOrEqual(200);
  });

  it("all transactions have category: null (pre-Gemini categorization)", async () => {
    const res = await stripeGET();
    const body = await res.json();
    const nonNull = body.transactions.filter(
      (t: { category: unknown }) => t.category !== null
    );
    expect(nonNull).toHaveLength(0);
  });

  it("contains exactly one unpaid Durham Catering invoice", async () => {
    const res = await stripeGET();
    const body = await res.json();
    const unpaid = body.transactions.filter(
      (t: { invoice_status: string }) => t.invoice_status === "unpaid"
    );
    expect(unpaid).toHaveLength(1);
    expect(unpaid[0].customer_id).toBe("cust-durham-catering");
    expect(unpaid[0].amount).toBe(3200);
  });

  it("unpaid invoice date is always 12 days in the past (relative to today)", async () => {
    const res = await stripeGET();
    const body = await res.json();
    const unpaid = body.transactions.find(
      (t: { invoice_status: string }) => t.invoice_status === "unpaid"
    );
    expect(unpaid.date).toBe(dateInDays(-12));
  });

  it("all transaction dates are on or before today", async () => {
    const res = await stripeGET();
    const body = await res.json();
    const future = body.transactions.filter(
      (t: { date: string }) => t.date > today()
    );
    expect(future).toHaveLength(0);
  });

  it("each transaction has required fields", async () => {
    const res = await stripeGET();
    const body = await res.json();
    const required = [
      "id",
      "business_id",
      "source",
      "transaction_type",
      "amount",
      "description",
      "date",
      "is_recurring",
      "tags",
    ];
    for (const txn of body.transactions.slice(0, 10)) {
      for (const field of required) {
        expect(txn).toHaveProperty(field);
      }
    }
  });
});

// ─── GET /api/mock/banking/accounts ──────────────────────────────────────────

describe("GET /api/mock/banking/accounts", () => {
  it("returns 200 with account and transactions", async () => {
    const res = await bankingGET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.account).toBeDefined();
    expect(Array.isArray(body.transactions)).toBe(true);
    expect(typeof body.count).toBe("number");
  });

  it("account current_balance is 4847.23", async () => {
    const res = await bankingGET();
    const body = await res.json();
    expect(body.account.current_balance).toBe(4847.23);
  });

  it("next_payroll_due is 8 days from today (in meta)", async () => {
    const res = await bankingGET();
    const body = await res.json();
    expect(body.meta.next_payroll_due).toBe(dateInDays(8));
  });

  it("next_insurance_due is 7 days from today (in meta)", async () => {
    const res = await bankingGET();
    const body = await res.json();
    expect(body.meta.next_insurance_due).toBe(dateInDays(7));
  });

  it("as_of is today", async () => {
    const res = await bankingGET();
    const body = await res.json();
    expect(body.account.as_of).toBe(today());
  });

  it("all transactions have category: null", async () => {
    const res = await bankingGET();
    const body = await res.json();
    const nonNull = body.transactions.filter(
      (t: { category: unknown }) => t.category !== null
    );
    expect(nonNull).toHaveLength(0);
  });

  it("has a past insurance debit of $1,200", async () => {
    const res = await bankingGET();
    const body = await res.json();
    const insurance = body.transactions.filter(
      (t: { category: string; amount: number }) =>
        t.category === null && t.amount === -1200
    );
    expect(insurance.length).toBeGreaterThanOrEqual(1);
  });
});
