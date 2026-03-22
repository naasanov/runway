/**
 * Tests for GET /api/business/:id/dashboard (Dev 2 — D2-04)
 *
 * Supabase is mocked so these run without external services.
 */

const BUSINESS_ID = "biz-test";

type MockBusiness = {
  id: string;
  name: string;
  current_balance: number;
  runway_days: number;
  runway_severity: string;
};

const mockState = {
  business: {
    id: BUSINESS_ID,
    name: "Sweet Grace Bakery",
    current_balance: 4847.23,
    runway_days: 22,
    runway_severity: "red",
  } as MockBusiness | null,
  transactions: [
    {
      id: "txn-payroll-1",
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
    {
      id: "txn-rent-1",
      business_id: BUSINESS_ID,
      source: "banking",
      transaction_type: "debit",
      invoice_status: null,
      invoice_date: null,
      customer_id: null,
      amount: -2400,
      description: "Commercial Rent",
      category: "rent",
      date: "2026-03-01",
      is_recurring: true,
      recurrence_pattern: "monthly",
      tags: [],
    },
    ...Array.from({ length: 30 }, (_, i) => ({
      id: `txn-revenue-${i}`,
      business_id: BUSINESS_ID,
      source: "stripe" as const,
      transaction_type: "credit" as const,
      invoice_status: null,
      invoice_date: null,
      customer_id: `cust-${i % 3}`,
      amount: 300,
      description: "Stripe payment — bakery sale",
      category: "revenue" as const,
      date: `2026-03-${String(i + 1).padStart(2, "0")}`,
      is_recurring: false,
      recurrence_pattern: null,
      tags: [],
    })),
  ],
  alerts: [
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
      created_at: "2026-03-21T10:00:00Z",
    },
    {
      id: "alert-2",
      business_id: BUSINESS_ID,
      scenario: "overdue_invoice",
      severity: "amber",
      headline: "Durham Catering owes $3,200 and is 12 days overdue.",
      detail: "Collecting this invoice helps cover the next payroll gap.",
      recommended_actions: [],
      sms_sent: false,
      sms_sent_at: null,
      created_at: "2026-03-20T10:00:00Z",
    },
  ],
  businessError: null as unknown,
  transactionsError: null as unknown,
  alertsError: null as unknown,
};

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === "businesses") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: mockState.business,
                error: mockState.businessError,
              }),
            })),
          })),
        };
      }

      if (table === "transactions") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({
              data: mockState.transactions,
              error: mockState.transactionsError,
            }),
          })),
        };
      }

      if (table === "alerts") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn().mockResolvedValue({
                data: mockState.alerts,
                error: mockState.alertsError,
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

function callDashboard(businessId = BUSINESS_ID) {
  return GET(
    new Request(`http://localhost/api/business/${businessId}/dashboard`),
    { params: { id: businessId } },
  );
}

describe("GET /api/business/:id/dashboard", () => {
  beforeEach(() => {
    mockState.business = {
      id: BUSINESS_ID,
      name: "Sweet Grace Bakery",
      current_balance: 4847.23,
      runway_days: 22,
      runway_severity: "red",
    };
    mockState.transactions = [
      {
        id: "txn-payroll-1",
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
      {
        id: "txn-rent-1",
        business_id: BUSINESS_ID,
        source: "banking",
        transaction_type: "debit",
        invoice_status: null,
        invoice_date: null,
        customer_id: null,
        amount: -2400,
        description: "Commercial Rent",
        category: "rent",
        date: "2026-03-01",
        is_recurring: true,
        recurrence_pattern: "monthly",
        tags: [],
      },
      ...Array.from({ length: 30 }, (_, i) => ({
        id: `txn-revenue-${i}`,
        business_id: BUSINESS_ID,
        source: "stripe" as const,
        transaction_type: "credit" as const,
        invoice_status: null,
        invoice_date: null,
        customer_id: `cust-${i % 3}`,
        amount: 300,
        description: "Stripe payment — bakery sale",
        category: "revenue" as const,
        date: `2026-03-${String(i + 1).padStart(2, "0")}`,
        is_recurring: false,
        recurrence_pattern: null,
        tags: [],
      })),
    ];
    mockState.alerts = [
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
        created_at: "2026-03-21T10:00:00Z",
      },
      {
        id: "alert-2",
        business_id: BUSINESS_ID,
        scenario: "overdue_invoice",
        severity: "amber",
        headline: "Durham Catering owes $3,200 and is 12 days overdue.",
        detail: "Collecting this invoice helps cover the next payroll gap.",
        recommended_actions: [],
        sms_sent: false,
        sms_sent_at: null,
        created_at: "2026-03-20T10:00:00Z",
      },
    ];
    mockState.businessError = null;
    mockState.transactionsError = null;
    mockState.alertsError = null;
  });

  it("returns a single aggregated dashboard payload with business, alerts, forecast summary, and obligations", async () => {
    const res = await callDashboard();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.business).toEqual(mockState.business);
    expect(body.alerts).toEqual(mockState.alerts);

    expect(body.forecast_summary.horizon_days).toBe(30);
    expect(body.forecast_summary.days).toHaveLength(30);
    expect(typeof body.forecast_summary.min_projected_balance).toBe("number");
    expect(Array.isArray(body.forecast_summary.danger_dates)).toBe(true);

    expect(Array.isArray(body.upcoming_obligations)).toBe(true);
    expect(body.upcoming_obligations.length).toBeGreaterThan(0);
    expect(body.upcoming_obligations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          description: expect.stringMatching(/ADP Payroll|Commercial Rent/),
          amount: expect.any(Number),
          due_date: expect.any(String),
          is_recurring: true,
        }),
      ]),
    );
  });

  it("returns the persisted runway values from the business record", async () => {
    const res = await callDashboard();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.business.runway_days).toBe(22);
    expect(body.business.runway_severity).toBe("red");
  });

  it("returns 404 when the business does not exist", async () => {
    mockState.business = null;

    const res = await callDashboard("missing-business");
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.code).toBe("BUSINESS_NOT_FOUND");
  });

  it("returns 500 when transactions cannot be loaded", async () => {
    mockState.transactionsError = new Error("transactions query failed");

    const res = await callDashboard();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.code).toBe("DASHBOARD_LOAD_FAILED");
  });

  it("returns 500 when alerts cannot be loaded", async () => {
    mockState.alertsError = new Error("alerts query failed");

    const res = await callDashboard();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.code).toBe("DASHBOARD_LOAD_FAILED");
  });
});
