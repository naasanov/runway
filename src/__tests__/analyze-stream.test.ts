/**
 * Tests for GET /api/business/:id/analyze/stream.
 */

import type { Transaction } from "@/lib/types";

const baseTransactions = [
  {
    id: "txn-001",
    business_id: "biz-test",
    source: "stripe",
    transaction_type: "debit",
    invoice_status: null,
    invoice_date: null,
    customer_id: null,
    amount: -3800,
    description: "ADP Payroll",
    category: null,
    date: "2026-03-15",
    is_recurring: false,
    recurrence_pattern: null,
    tags: ["payroll", "adp"],
  },
  {
    id: "txn-002",
    business_id: "biz-test",
    source: "stripe",
    transaction_type: "debit",
    invoice_status: null,
    invoice_date: null,
    customer_id: null,
    amount: -89,
    description: "Homebase Scheduling",
    category: null,
    date: "2026-03-10",
    is_recurring: false,
    recurrence_pattern: null,
    tags: ["scheduling", "hr", "subscription"],
  },
  {
    id: "txn-003",
    business_id: "biz-test",
    source: "stripe",
    transaction_type: "credit",
    invoice_status: null,
    invoice_date: null,
    customer_id: "cus_abc123",
    amount: 150,
    description: "Stripe payment — bakery sale",
    category: null,
    date: "2026-03-18",
    is_recurring: false,
    recurrence_pattern: null,
    tags: ["pos", "retail"],
  },
];

const categorizationResponse = JSON.stringify([
  {
    id: "txn-001",
    category: "payroll",
    is_recurring: true,
    recurrence_pattern: "biweekly",
  },
  {
    id: "txn-002",
    category: "subscriptions",
    is_recurring: true,
    recurrence_pattern: "monthly",
  },
  {
    id: "txn-003",
    category: "revenue",
    is_recurring: false,
    recurrence_pattern: null,
  },
]);

const state = {
  business: {
    id: "biz-test",
    current_balance: 5000,
    runway_days: null as number | null,
    runway_severity: null as string | null,
  },
  transactions: baseTransactions.map(
    (transaction) => ({ ...transaction }) as Transaction,
  ) as Transaction[],
  alertRows: [] as Array<Record<string, unknown>>,
};

function resetState() {
  state.business = {
    id: "biz-test",
    current_balance: 5000,
    runway_days: null,
    runway_severity: null,
  };
  state.transactions = baseTransactions.map(
    (transaction) => ({ ...transaction }) as Transaction,
  );
  state.alertRows = [];
}

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === "businesses") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: state.business,
                error: state.business ? null : new Error("missing"),
              }),
            })),
          })),
          update: jest.fn((data: Record<string, unknown>) => ({
            eq: jest.fn().mockImplementation(() => {
              state.business = {
                ...state.business,
                ...data,
              };
              return { error: null };
            }),
          })),
        };
      }

      if (table === "transactions") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => {
              const base = Promise.resolve({
                data: state.transactions,
                error: null,
              });

              return Object.assign(base, {
                is: jest.fn().mockResolvedValue({
                  data: state.transactions.filter(
                    (transaction) => transaction.category === null,
                  ),
                  error: null,
                }),
                not: jest.fn().mockResolvedValue({
                  count: state.transactions.filter(
                    (transaction) => transaction.category !== null,
                  ).length,
                  error: null,
                }),
              });
            }),
          })),
          upsert: jest.fn((rows: Transaction[]) => {
            rows.forEach((row) => {
              const index = state.transactions.findIndex(
                (transaction) => transaction.id === row.id,
              );
              if (index >= 0) {
                state.transactions[index] = {
                  ...state.transactions[index],
                  ...row,
                };
              }
            });

            return {
              select: jest.fn().mockResolvedValue({
                data: rows.map((row) => ({ id: row.id })),
                error: null,
              }),
            };
          }),
        };
      }

      if (table === "alerts") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({
              count: state.alertRows.length,
              error: null,
            }),
          })),
          insert: jest.fn((row: Record<string, unknown>) => {
            state.alertRows.push(row);
            return Promise.resolve({ error: null });
          }),
          delete: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ error: null }),
          })),
        };
      }

      return {};
    }),
  },
}));

const mockGenerateContent = jest.fn();

jest.mock("@/lib/gemini", () => ({
  gemini: {
    generateContent: (...args: unknown[]) => mockGenerateContent(...args),
  },
}));

jest.mock("@/lib/alert-scenarios", () => ({
  detectRunwayAlert: jest.fn((business: { id: string; runway_days: number }) => ({
    id: "alert-runway",
    business_id: business.id,
    scenario: "runway",
    severity: "red",
    headline: `You have ${business.runway_days} days of cash remaining at current burn rate.`,
    detail: "Critical runway warning.",
    recommended_actions: [],
  })),
  detectOverdueInvoiceAlerts: jest.fn(() => []),
  detectSubscriptionWasteAlerts: jest.fn(async () => []),
  detectRevenueConcentrationAlert: jest.fn(() => null),
  clearExistingAlerts: jest.fn(async () => {}),
  writeAlertToDb: jest.fn(async (_supabase: unknown, alert: Record<string, unknown>) => ({
    ...alert,
    sms_sent: false,
    sms_sent_at: null,
    created_at: "2026-03-22T10:00:00.000Z",
  })),
}));

import { GET } from "@/app/api/business/[id]/analyze/stream/route";

function parseSse(responseText: string) {
  return responseText
    .split("\n\n")
    .filter((chunk) => chunk.startsWith("event: "))
    .map((chunk) => {
      const [eventLine, dataLine] = chunk.split("\n");
      return {
        event: eventLine.replace("event: ", ""),
        data: JSON.parse(dataLine.replace("data: ", "")),
      };
    });
}

describe("GET /api/business/:id/analyze/stream", () => {
  beforeEach(() => {
    resetState();
    mockGenerateContent.mockReset();
    mockGenerateContent.mockResolvedValue({
      response: { text: () => categorizationResponse },
    });
  });

  it("streams analysis_started, batch events, and analysis_completed", async () => {
    const response = await GET(
      new Request("http://localhost/api/business/biz-test/analyze/stream"),
      { params: { id: "biz-test" } },
    );

    expect(response.headers.get("Content-Type")).toContain("text/event-stream");

    const events = parseSse(await response.text());

    expect(events[0].event).toBe("analysis_started");
    expect(events[0].data.total_transactions).toBe(3);
    expect(events.some((event) => event.event === "batch_started")).toBe(true);

    const completedBatch = events.find(
      (event) => event.event === "batch_completed",
    );
    expect(completedBatch?.data.transactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "txn-001",
          category: "payroll",
        }),
      ]),
    );

    const completed = events.at(-1);
    expect(completed?.event).toBe("analysis_completed");
    expect(completed?.data.transactions_categorized).toBe(3);
    expect(completed?.data.runway_days).toBeGreaterThan(0);
  });

  it("emits fallback_used when Gemini is unavailable", async () => {
    mockGenerateContent.mockRejectedValue(new Error("503 Service Unavailable"));

    const response = await GET(
      new Request("http://localhost/api/business/biz-test/analyze/stream"),
      { params: { id: "biz-test" } },
    );
    const events = parseSse(await response.text());

    const fallbackEvent = events.find((event) => event.event === "fallback_used");
    expect(fallbackEvent?.data.batch_number).toBe(1);
    expect(fallbackEvent?.data.fallback_count).toBe(3);
    expect(events.at(-1)?.event).toBe("analysis_completed");
  });

  it("emits analysis_failed when categorization fails", async () => {
    mockGenerateContent.mockRejectedValue(new Error("quota exceeded"));

    const response = await GET(
      new Request("http://localhost/api/business/biz-test/analyze/stream"),
      { params: { id: "biz-test" } },
    );
    const events = parseSse(await response.text());

    expect(events.at(-1)).toEqual(
      expect.objectContaining({
        event: "analysis_failed",
        data: expect.objectContaining({
          code: "ANALYZE_FAILED",
        }),
      }),
    );
  });

  it("completes immediately when there are no uncategorized transactions", async () => {
    state.transactions = state.transactions.map(
      (transaction) =>
        ({
          ...transaction,
          category:
            transaction.transaction_type === "credit" ? "revenue" : "payroll",
        }) as Transaction,
    );

    const response = await GET(
      new Request("http://localhost/api/business/biz-test/analyze/stream"),
      { params: { id: "biz-test" } },
    );
    const events = parseSse(await response.text());

    expect(events.map((event) => event.event)).toEqual([
      "analysis_started",
      "analysis_completed",
    ]);
    expect(events[1].data.transactions_categorized).toBe(0);
  });
});
