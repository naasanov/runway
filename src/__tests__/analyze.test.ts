/**
 * Tests for POST /api/business/:id/analyze (Dev 2 — D2-01)
 *
 * Supabase and Gemini are mocked so these run without external services.
 */

import { CATEGORIES, RECURRENCE_PATTERNS } from "@/lib/types";

// ─── Mock state ──────────────────────────────────────────────────────────────

const mockTransactions = [
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
    date: "2026-03-01",
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

const geminiResponse = JSON.stringify([
  { id: "txn-001", category: "payroll", is_recurring: true, recurrence_pattern: "biweekly" },
  { id: "txn-002", category: "subscriptions", is_recurring: true, recurrence_pattern: "monthly" },
  { id: "txn-003", category: "revenue", is_recurring: false, recurrence_pattern: null },
]);

// Track all supabase update calls for assertions
const updateCalls: { id: string; data: Record<string, unknown> }[] = [];

// ─── Mock Supabase ───────────────────────────────────────────────────────────

jest.mock("@/lib/supabase", () => {
  return {
    supabase: {
      from: jest.fn((table: string) => {
        if (table === "businesses") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { id: "biz-test", runway_days: null, runway_severity: null },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === "transactions") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                is: jest.fn().mockResolvedValue({
                  data: mockTransactions,
                  error: null,
                }),
              })),
            })),
            update: jest.fn((data: Record<string, unknown>) => ({
              eq: jest.fn((field: string, value: string) => {
                if (field === "id") {
                  return {
                    eq: jest.fn().mockImplementation(() => {
                      updateCalls.push({ id: value, data });
                      return { error: null };
                    }),
                  };
                }
                return { error: null };
              }),
            })),
          };
        }
        return {};
      }),
    },
  };
});

// ─── Mock Gemini ─────────────────────────────────────────────────────────────

const mockGenerateContent = jest.fn();

jest.mock("@/lib/gemini", () => ({
  gemini: {
    generateContent: (...args: unknown[]) => mockGenerateContent(...args),
  },
}));

import { POST } from "@/app/api/business/[id]/analyze/route";

// ─── helpers ─────────────────────────────────────────────────────────────────

function callAnalyze(businessId = "biz-test") {
  const req = new Request("http://localhost/api/business/biz-test/analyze", {
    method: "POST",
  });
  return POST(req, { params: { id: businessId } });
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe("POST /api/business/:id/analyze — categorization", () => {
  beforeEach(() => {
    updateCalls.length = 0;
    mockGenerateContent.mockReset();
    mockGenerateContent.mockResolvedValue({
      response: { text: () => geminiResponse },
    });
  });

  it("returns 200 with correct response shape", async () => {
    const res = await callAnalyze();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.business_id).toBe("biz-test");
    expect(body.transactions_categorized).toBe(3);
    expect(typeof body.runway_days).toBe("number");
    expect(typeof body.sms_sent).toBe("boolean");
    expect(Array.isArray(body.alerts_created)).toBe(true);
  });

  it("sends transactions to Gemini in batches", async () => {
    await callAnalyze();
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);

    // Verify prompt includes transaction data
    const callArgs = mockGenerateContent.mock.calls[0][0];
    const prompt = Array.isArray(callArgs) ? callArgs.join(" ") : callArgs;
    expect(prompt).toContain("txn-001");
    expect(prompt).toContain("ADP Payroll");
  });

  it("writes correct categories back to DB", async () => {
    await callAnalyze();

    expect(updateCalls).toHaveLength(3);

    const payroll = updateCalls.find((c) => c.id === "txn-001");
    expect(payroll?.data).toEqual({
      category: "payroll",
      is_recurring: true,
      recurrence_pattern: "biweekly",
    });

    const sub = updateCalls.find((c) => c.id === "txn-002");
    expect(sub?.data).toEqual({
      category: "subscriptions",
      is_recurring: true,
      recurrence_pattern: "monthly",
    });

    const revenue = updateCalls.find((c) => c.id === "txn-003");
    expect(revenue?.data).toEqual({
      category: "revenue",
      is_recurring: false,
      recurrence_pattern: null,
    });
  });

  it("validates categories against the known enum", async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify([
            { id: "txn-001", category: "INVALID_CATEGORY", is_recurring: false, recurrence_pattern: null },
            { id: "txn-002", category: "subscriptions", is_recurring: true, recurrence_pattern: "monthly" },
            { id: "txn-003", category: "revenue", is_recurring: false, recurrence_pattern: null },
          ]),
      },
    });

    await callAnalyze();

    const invalid = updateCalls.find((c) => c.id === "txn-001");
    expect(invalid?.data.category).toBe("unknown");
  });

  it("validates recurrence_pattern against the known enum", async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify([
            { id: "txn-001", category: "payroll", is_recurring: true, recurrence_pattern: "every_other_tuesday" },
            { id: "txn-002", category: "subscriptions", is_recurring: true, recurrence_pattern: "monthly" },
            { id: "txn-003", category: "revenue", is_recurring: false, recurrence_pattern: null },
          ]),
      },
    });

    await callAnalyze();

    const invalid = updateCalls.find((c) => c.id === "txn-001");
    expect(invalid?.data.recurrence_pattern).toBeNull();
  });

  it("handles Gemini returning markdown-fenced JSON", async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => "```json\n" + geminiResponse + "\n```",
      },
    });

    const res = await callAnalyze();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.transactions_categorized).toBe(3);
  });

  it("returns 500 when Gemini fails", async () => {
    mockGenerateContent.mockRejectedValue(new Error("API quota exceeded"));

    const res = await callAnalyze();
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.code).toBe("ANALYZE_FAILED");
  });
});

describe("POST /api/business/:id/analyze — prompt quality", () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
    mockGenerateContent.mockResolvedValue({
      response: { text: () => geminiResponse },
    });
  });

  it("prompt includes all valid categories", async () => {
    await callAnalyze();
    const callArgs = mockGenerateContent.mock.calls[0][0];
    const prompt = Array.isArray(callArgs) ? callArgs[0] : callArgs;
    for (const cat of CATEGORIES) {
      expect(prompt).toContain(cat);
    }
  });

  it("prompt includes all valid recurrence patterns", async () => {
    await callAnalyze();
    const callArgs = mockGenerateContent.mock.calls[0][0];
    const prompt = Array.isArray(callArgs) ? callArgs[0] : callArgs;
    for (const pat of RECURRENCE_PATTERNS) {
      expect(prompt).toContain(pat);
    }
  });

  it("only sends necessary fields to Gemini (no full transaction objects)", async () => {
    await callAnalyze();
    const callArgs = mockGenerateContent.mock.calls[0][0];
    const dataPrompt = Array.isArray(callArgs) ? callArgs[1] : callArgs;
    // Should NOT contain fields like business_id, invoice_status in the data sent
    expect(dataPrompt).not.toContain("biz-test");
    expect(dataPrompt).not.toContain("invoice_status");
  });
});
