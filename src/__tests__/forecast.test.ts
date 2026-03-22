/**
 * Tests for GET /api/business/:id/forecast (Dev 2 — D2-02 / D2-03)
 *
 * Supabase is mocked so these run without external services.
 */

import type { Transaction } from "@/lib/types";

// ─── Mock data ───────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const BUSINESS_ID = "biz-test";

const mockBusiness = {
  id: BUSINESS_ID,
  current_balance: 5000,
};

const businessUpdatePayloads: Record<string, unknown>[] = [];
const mockBusinessUpdate = jest.fn();

const mockTransactions: Partial<Transaction>[] = [
  // Recurring payroll every 2 weeks, $3800
  {
    id: "txn-pay-1",
    business_id: BUSINESS_ID,
    source: "stripe",
    transaction_type: "debit",
    amount: -3800,
    description: "ADP Payroll",
    category: "payroll",
    date: daysAgo(6),
    is_recurring: true,
    recurrence_pattern: "biweekly",
    tags: [],
  },
  {
    id: "txn-pay-2",
    business_id: BUSINESS_ID,
    source: "stripe",
    transaction_type: "debit",
    amount: -3800,
    description: "ADP Payroll",
    category: "payroll",
    date: daysAgo(20),
    is_recurring: true,
    recurrence_pattern: "biweekly",
    tags: [],
  },
  // Monthly rent $2400
  {
    id: "txn-rent-1",
    business_id: BUSINESS_ID,
    source: "stripe",
    transaction_type: "debit",
    amount: -2400,
    description: "Commercial Rent",
    category: "rent",
    date: daysAgo(5),
    is_recurring: true,
    recurrence_pattern: "monthly",
    tags: [],
  },
  // Revenue over last 30 days: ~$300/day => $9000 total over 30 days
  ...Array.from({ length: 30 }, (_, i) => ({
    id: `txn-rev-${i}`,
    business_id: BUSINESS_ID,
    source: "stripe" as const,
    transaction_type: "credit" as const,
    amount: 300,
    description: "Stripe payment — bakery sale",
    category: "revenue" as const,
    date: daysAgo(i),
    is_recurring: false,
    recurrence_pattern: null,
    tags: [],
  })),
];

// ─── Mock Supabase ───────────────────────────────────────────────────────────

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
          update: jest.fn((data: Record<string, unknown>) => {
            businessUpdatePayloads.push(data);
            return {
              eq: mockBusinessUpdate.mockResolvedValue({
                error: null,
              }),
            };
          }),
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
      return {};
    }),
  },
}));

import { GET } from "@/app/api/business/[id]/forecast/route";

// ─── helpers ─────────────────────────────────────────────────────────────────

function callForecast(businessId = BUSINESS_ID, horizon?: number) {
  const url = new URL(
    `http://localhost/api/business/${businessId}/forecast`
  );
  if (horizon !== undefined) {
    url.searchParams.set("horizon", String(horizon));
  }
  const req = new Request(url.toString(), { method: "GET" });
  // NextRequest needs nextUrl — use the native Request and cast
  const nextReq = Object.assign(req, {
    nextUrl: url,
  });
  return GET(nextReq as never, { params: { id: businessId } });
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe("GET /api/business/:id/forecast", () => {
  beforeEach(() => {
    mockBusinessUpdate.mockClear();
    businessUpdatePayloads.length = 0;
  });

  it("returns 200 with correct response shape", async () => {
    const res = await callForecast();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.business_id).toBe(BUSINESS_ID);
    expect(body.horizon_days).toBe(30);
    expect(typeof body.current_balance).toBe("number");
    expect(typeof body.avg_daily_net_burn).toBe("number");
    expect(typeof body.runway_days).toBe("number");
    expect(typeof body.generated_at).toBe("string");
    expect(Array.isArray(body.days)).toBe(true);
  });

  it("returns the correct number of days for the horizon", async () => {
    const res = await callForecast(BUSINESS_ID, 30);
    const body = await res.json();
    expect(body.days).toHaveLength(30);
  });

  it("supports 60-day horizon", async () => {
    const res = await callForecast(BUSINESS_ID, 60);
    const body = await res.json();
    expect(body.horizon_days).toBe(60);
    expect(body.days).toHaveLength(60);
  });

  it("supports 90-day horizon", async () => {
    const res = await callForecast(BUSINESS_ID, 90);
    const body = await res.json();
    expect(body.horizon_days).toBe(90);
    expect(body.days).toHaveLength(90);
  });

  it("rejects invalid horizon values", async () => {
    const res = await callForecast(BUSINESS_ID, 45);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.code).toBe("INVALID_HORIZON");
  });

  it("first day balance equals current_balance", async () => {
    const res = await callForecast();
    const body = await res.json();
    expect(body.days[0].projected_balance).toBe(mockBusiness.current_balance);
  });

  it("each day has expected_revenue > 0 when there is revenue history", async () => {
    const res = await callForecast();
    const body = await res.json();
    for (const day of body.days) {
      expect(day.expected_revenue).toBeGreaterThan(0);
    }
  });

  it("each ForecastDay has required fields", async () => {
    const res = await callForecast();
    const body = await res.json();
    for (const day of body.days) {
      expect(day).toHaveProperty("date");
      expect(day).toHaveProperty("projected_balance");
      expect(day).toHaveProperty("is_danger");
      expect(day).toHaveProperty("obligations");
      expect(day).toHaveProperty("expected_revenue");
      expect(Array.isArray(day.obligations)).toBe(true);
    }
  });

  it("marks is_danger true when projected_balance goes negative", async () => {
    const res = await callForecast();
    const body = await res.json();
    const negativeDays = body.days.filter(
      (d: { projected_balance: number }) => d.projected_balance < 0
    );
    for (const day of negativeDays) {
      expect(day.is_danger).toBe(true);
    }
  });

  it("sets first_negative_date when balance goes negative", async () => {
    const res = await callForecast();
    const body = await res.json();
    const negativeDays = body.days.filter(
      (d: { projected_balance: number }) => d.projected_balance < 0
    );
    if (negativeDays.length > 0) {
      expect(body.first_negative_date).toBe(negativeDays[0].date);
    }
  });

  it("projects recurring obligations on future dates", async () => {
    const res = await callForecast(BUSINESS_ID, 30);
    const body = await res.json();

    // At least one day should have obligations (payroll or rent within 30 days)
    const daysWithObligations = body.days.filter(
      (d: { obligations: unknown[] }) => d.obligations.length > 0
    );
    expect(daysWithObligations.length).toBeGreaterThan(0);
  });

  it("obligations have description and amount", async () => {
    const res = await callForecast(BUSINESS_ID, 30);
    const body = await res.json();

    const daysWithObligations = body.days.filter(
      (d: { obligations: unknown[] }) => d.obligations.length > 0
    );
    for (const day of daysWithObligations) {
      for (const obl of day.obligations) {
        expect(typeof obl.description).toBe("string");
        expect(typeof obl.amount).toBe("number");
        expect(obl.amount).toBeGreaterThan(0);
      }
    }
  });

  it("current_balance in response matches business record", async () => {
    const res = await callForecast();
    const body = await res.json();
    expect(body.current_balance).toBe(mockBusiness.current_balance);
  });

  it("persists runway_days and runway_severity back to the business record", async () => {
    const res = await callForecast();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockBusinessUpdate).toHaveBeenCalledWith("id", BUSINESS_ID);
    expect(businessUpdatePayloads).toHaveLength(1);
    expect(businessUpdatePayloads[0]).toEqual({
      runway_days: body.runway_days,
      runway_severity:
        body.runway_days < 30
          ? "red"
          : body.runway_days < 60
            ? "amber"
            : "green",
    });
    expect(body.runway_days).toBeGreaterThanOrEqual(0);
  });
});
