/**
 * Tests for D4-02: Alert Scenario 1 — Runway
 *
 * Tests the detectRunwayAlert function and the GET /api/business/:id/alerts endpoint.
 * Supabase is mocked so tests run without external services.
 */

import { detectRunwayAlert, writeAlertToDb, clearExistingAlerts } from "@/lib/alert-scenarios";

// ---------------------------------------------------------------------------
// Unit tests for detectRunwayAlert
// ---------------------------------------------------------------------------

describe("detectRunwayAlert", () => {
  it("returns null when runway_days is null", () => {
    const result = detectRunwayAlert({
      id: "biz-test",
      current_balance: 5000,
      runway_days: null,
      runway_severity: null,
    });
    expect(result).toBeNull();
  });

  it("returns red alert when runway < 30 days", () => {
    const result = detectRunwayAlert({
      id: "biz-test",
      current_balance: 2000,
      runway_days: 15,
      runway_severity: "red",
    });

    expect(result).not.toBeNull();
    expect(result!.scenario).toBe("runway");
    expect(result!.severity).toBe("red");
    expect(result!.headline).toContain("15 days");
    expect(result!.detail).toContain("Critical");
  });

  it("returns amber alert when runway 30-59 days", () => {
    const result = detectRunwayAlert({
      id: "biz-test",
      current_balance: 5000,
      runway_days: 47,
      runway_severity: "amber",
    });

    expect(result).not.toBeNull();
    expect(result!.severity).toBe("amber");
    expect(result!.headline).toContain("47 days");
    expect(result!.detail).toContain("Warning");
  });

  it("returns green alert when runway >= 60 days", () => {
    const result = detectRunwayAlert({
      id: "biz-test",
      current_balance: 20000,
      runway_days: 90,
      runway_severity: "green",
    });

    expect(result).not.toBeNull();
    expect(result!.severity).toBe("green");
    expect(result!.headline).toContain("90 days");
    expect(result!.detail).toContain("Healthy");
  });

  it("formats effectively unlimited runway without showing 999", () => {
    const result = detectRunwayAlert({
      id: "biz-test",
      current_balance: 20000,
      runway_days: 999,
      runway_severity: "green",
    });

    expect(result).not.toBeNull();
    expect(result!.headline).toContain("more than 90 days");
    expect(result!.headline).not.toContain("999");
  });

  it("includes recommended actions for red/amber alerts", () => {
    const red = detectRunwayAlert({
      id: "biz-test",
      current_balance: 2000,
      runway_days: 10,
      runway_severity: "red",
    });
    expect(red!.recommended_actions.length).toBeGreaterThan(0);

    const amber = detectRunwayAlert({
      id: "biz-test",
      current_balance: 5000,
      runway_days: 45,
      runway_severity: "amber",
    });
    expect(amber!.recommended_actions.length).toBeGreaterThan(0);
  });

  it("returns correct alert shape", () => {
    const result = detectRunwayAlert({
      id: "biz-test",
      current_balance: 5000,
      runway_days: 47,
      runway_severity: "amber",
    });

    expect(result).toMatchObject({
      business_id: "biz-test",
      scenario: "runway",
      severity: "amber",
    });
    expect(result!.id).toBeTruthy();
    expect(typeof result!.headline).toBe("string");
    expect(typeof result!.detail).toBe("string");
    expect(Array.isArray(result!.recommended_actions)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Unit tests for writeAlertToDb
// ---------------------------------------------------------------------------

describe("writeAlertToDb", () => {
  it("inserts alert record and returns full Alert", async () => {
    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    const mockSupabase = {
      from: jest.fn(() => ({ insert: mockInsert })),
    };

    const alert = detectRunwayAlert({
      id: "biz-test",
      current_balance: 5000,
      runway_days: 47,
      runway_severity: "amber",
    })!;

    const result = await writeAlertToDb(mockSupabase, alert);

    expect(mockSupabase.from).toHaveBeenCalledWith("alerts");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: alert.id,
        business_id: "biz-test",
        scenario: "runway",
        severity: "amber",
        sms_sent: false,
      })
    );
    expect(result).not.toBeNull();
    expect(result!.sms_sent).toBe(false);
    expect(result!.created_at).toBeTruthy();
  });

  it("returns null on DB error", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    const mockInsert = jest
      .fn()
      .mockResolvedValue({ error: { message: "insert failed" } });
    const mockSupabase = {
      from: jest.fn(() => ({ insert: mockInsert })),
    };

    const alert = detectRunwayAlert({
      id: "biz-test",
      current_balance: 5000,
      runway_days: 47,
      runway_severity: "amber",
    })!;

    const result = await writeAlertToDb(mockSupabase, alert);
    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Unit tests for clearExistingAlerts
// ---------------------------------------------------------------------------

describe("clearExistingAlerts", () => {
  it("deletes alerts for the given business", async () => {
    const mockEq = jest.fn().mockResolvedValue({ error: null });
    const mockDelete = jest.fn(() => ({ eq: mockEq }));
    const mockSupabase = {
      from: jest.fn(() => ({ delete: mockDelete })),
    };

    await clearExistingAlerts(mockSupabase, "biz-test");

    expect(mockSupabase.from).toHaveBeenCalledWith("alerts");
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("business_id", "biz-test");
  });
});

// ---------------------------------------------------------------------------
// Integration test: GET /api/business/:id/alerts
// ---------------------------------------------------------------------------

const mockAlerts = [
  {
    id: "alert-001",
    business_id: "biz-test",
    scenario: "runway",
    severity: "amber",
    headline: "You have 47 days of cash remaining at current burn rate.",
    detail: "Warning...",
    recommended_actions: [],
    sms_sent: false,
    sms_sent_at: null,
    created_at: "2026-03-21T02:00:00Z",
  },
  {
    id: "alert-002",
    business_id: "biz-test",
    scenario: "overdue_invoice",
    severity: "red",
    headline: "Durham Catering owes $3,200",
    detail: "12 days overdue",
    recommended_actions: [],
    sms_sent: true,
    sms_sent_at: "2026-03-21T02:00:00Z",
    created_at: "2026-03-21T02:00:00Z",
  },
];

jest.mock("@/lib/supabase", () => {
  return {
    supabase: {
      from: jest.fn((table: string) => {
        if (table === "businesses") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { id: "biz-test" },
                  error: null,
                }),
              })),
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
  };
});

import { GET } from "@/app/api/business/[id]/alerts/route";

function makeAlertsRequest(businessId = "biz-test", severity?: string) {
  const url = new URL(`http://localhost/api/business/${businessId}/alerts`);
  if (severity) url.searchParams.set("severity", severity);
  const req = new Request(url.toString(), { method: "GET" });
  // NextRequest needs the nextUrl property
  Object.defineProperty(req, "nextUrl", { value: url });
  return req;
}

describe("GET /api/business/:id/alerts", () => {
  it("returns 200 with alerts sorted by severity (red first)", async () => {
    const req = makeAlertsRequest();
    const res = await GET(req as never, { params: { id: "biz-test" } });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.business_id).toBe("biz-test");
    expect(Array.isArray(body.alerts)).toBe(true);
    expect(body.alerts.length).toBe(2);
    // Red should sort before amber
    expect(body.alerts[0].severity).toBe("red");
    expect(body.alerts[1].severity).toBe("amber");
  });
});
