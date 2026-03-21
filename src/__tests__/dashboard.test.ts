/**
 * Tests for GET /api/business/:id/dashboard (Dev 2 — D2-03)
 */

const BUSINESS_ID = "biz-test";

const mockBusiness = {
  id: BUSINESS_ID,
  name: "Sweet Grace Bakery",
  current_balance: 4847.23,
  runway_days: 22,
  runway_severity: "red",
};

const mockTransactions = [
  {
    id: "txn-payroll",
    business_id: BUSINESS_ID,
    source: "stripe",
    transaction_type: "debit",
    invoice_status: null,
    invoice_date: null,
    customer_id: null,
    amount: -3800,
    description: "ADP Payroll",
    category: "payroll",
    date: "2026-03-15",
    is_recurring: true,
    recurrence_pattern: "biweekly",
    tags: [],
  },
];

const mockAlerts = [
  {
    id: "alert-1",
    business_id: BUSINESS_ID,
    scenario: "runway",
    severity: "red",
    headline: "You have 22 days of cash remaining.",
    detail: "Projected burn remains elevated.",
    recommended_actions: [],
    sms_sent: false,
    sms_sent_at: null,
    created_at: "2026-03-21T00:00:00Z",
  },
];

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === "businesses") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: mockBusiness,
                error: null,
              }),
            })),
          })),
        };
      }

      if (table === "transactions") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({
              data: mockTransactions,
              error: null,
            }),
          })),
        };
      }

      if (table === "alerts") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn().mockResolvedValue({
                data: mockAlerts,
                error: null,
              }),
            })),
          })),
        };
      }

      return {};
    }),
  },
}));

import { GET } from "@/app/api/business/[id]/dashboard/route";

describe("GET /api/business/:id/dashboard", () => {
  it("returns the persisted runway values from the business record", async () => {
    const res = await GET(new Request("http://localhost/api/business/biz-test/dashboard"), {
      params: { id: BUSINESS_ID },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.business.runway_days).toBe(22);
    expect(body.business.runway_severity).toBe("red");
    expect(body.alerts).toHaveLength(1);
  });
});
