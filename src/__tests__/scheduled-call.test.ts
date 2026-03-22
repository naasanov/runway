jest.mock("@/scripts/alert-call", () => ({
  alertCall: jest.fn(),
}));

jest.mock("@/lib/dashboard-data", () => ({
  loadDashboardData: jest.fn(),
  DashboardDataError: class DashboardDataError extends Error {
    constructor(
      message: string,
      public code: "BUSINESS_NOT_FOUND" | "DASHBOARD_LOAD_FAILED",
    ) {
      super(message);
    }
  },
}));

jest.mock("@/lib/env", () => ({
  env: {
    ELEVENLABS_VOICE_ID: "voice-default",
    ELEVENLABS_VOICE_ID_LIGHT: "voice-light",
    ELEVENLABS_VOICE_ID_MEDIUM: "voice-medium",
    ELEVENLABS_VOICE_ID_HEAVY: "voice-heavy",
  },
}));

import { POST } from "@/app/api/alerts/scheduled-call/route";
import { alertCall } from "@/scripts/alert-call";
import { loadDashboardData, DashboardDataError } from "@/lib/dashboard-data";
import type { DashboardResponse } from "@/lib/types";

const mockAlertCall = alertCall as jest.Mock;
const mockLoadDashboardData = loadDashboardData as jest.Mock;
const MockDashboardDataError = DashboardDataError as unknown as typeof Error & {
  new (
    message: string,
    code: "BUSINESS_NOT_FOUND" | "DASHBOARD_LOAD_FAILED",
  ): Error;
};

function makeRequest(body?: unknown) {
  return new Request("http://localhost/api/alerts/scheduled-call", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeDashboardResponse(
  overrides: Partial<DashboardResponse> = {},
): DashboardResponse {
  return {
    business: {
      id: "biz-test",
      name: "Sweet Grace Bakery",
      current_balance: 4800,
      runway_days: 22,
      runway_severity: "red",
      owner_phone: "+19195551234",
    },
    alerts: [
      {
        id: "alert-1",
        business_id: "biz-test",
        scenario: "runway",
        severity: "red",
        headline: "You have 22 days of cash remaining.",
        detail: "Projected burn remains elevated.",
        recommended_actions: [],
        sms_sent: false,
        sms_sent_at: null,
        created_at: "2026-03-21T10:00:00Z",
      },
    ],
    forecast_summary: {
      horizon_days: 30,
      min_projected_balance: -1200,
      danger_dates: ["2026-03-30"],
      days: [],
    },
    upcoming_obligations: [
      {
        description: "ADP Payroll",
        amount: 3800,
        due_date: "2026-03-30",
        category: "payroll",
        is_recurring: true,
      },
    ],
    ...overrides,
  };
}

describe("POST /api/alerts/scheduled-call", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockLoadDashboardData.mockResolvedValue(makeDashboardResponse());
    mockAlertCall.mockResolvedValue(undefined);
  });

  afterEach(() => {
    actRunPendingTimers();
    jest.useRealTimers();
  });

  it("returns 400 when toNumber is missing", async () => {
    const res = await POST(makeRequest({ businessId: "biz-test" }) as never);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe("MISSING_PHONE");
  });

  it("returns 400 when businessId is missing", async () => {
    const res = await POST(makeRequest({ toNumber: "+15550001234" }) as never);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe("MISSING_BUSINESS_ID");
  });

  it("uses the top red alert and heavy voice", async () => {
    const responsePromise = POST(
      makeRequest({ toNumber: "+15550001234", businessId: "biz-test" }) as never,
    );
    await advanceDelay();
    const res = await responsePromise;
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, sentiment: "heavy" });
    expect(mockLoadDashboardData).toHaveBeenCalledWith("biz-test");
    expect(mockAlertCall).toHaveBeenCalledWith(
      expect.stringContaining("You have 22 days of cash remaining."),
      "+15550001234",
      "voice-heavy",
    );
    expect(mockAlertCall.mock.calls[0][0]).toContain("March 30");
  });

  it("falls back to a dashboard summary and light voice when alerts are empty", async () => {
    mockLoadDashboardData.mockResolvedValueOnce(
      makeDashboardResponse({
        alerts: [],
        business: {
          id: "biz-test",
          name: "Sweet Grace Bakery",
          current_balance: 4800,
          runway_days: 48,
          runway_severity: "amber",
          owner_phone: "+19195551234",
        },
        forecast_summary: {
          horizon_days: 30,
          min_projected_balance: 1200,
          danger_dates: [],
          days: [],
        },
      }),
    );

    const responsePromise = POST(
      makeRequest({ toNumber: "+15550001234", businessId: "biz-test" }) as never,
    );
    await advanceDelay();
    const res = await responsePromise;
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, sentiment: "light" });
    expect(mockAlertCall).toHaveBeenCalledWith(
      expect.stringContaining("Runway update for Sweet Grace Bakery."),
      "+15550001234",
      "voice-light",
    );
  });

  it("uses the medium voice for amber-led alerts", async () => {
    mockLoadDashboardData.mockResolvedValueOnce(
      makeDashboardResponse({
        alerts: [
          {
            id: "alert-amber",
            business_id: "biz-test",
            scenario: "subscription_waste",
            severity: "amber",
            headline: "Two subscriptions overlap.",
            detail: "Cancel one to save money.",
            recommended_actions: [],
            sms_sent: false,
            sms_sent_at: null,
            created_at: "2026-03-21T10:00:00Z",
          },
        ],
      }),
    );

    const responsePromise = POST(
      makeRequest({ toNumber: "+15550001234", businessId: "biz-test" }) as never,
    );
    await advanceDelay();
    await responsePromise;

    expect(mockAlertCall).toHaveBeenCalledWith(
      expect.stringContaining("Two subscriptions overlap."),
      "+15550001234",
      "voice-medium",
    );
  });

  it("returns 404 when the business cannot be found", async () => {
    mockLoadDashboardData.mockRejectedValueOnce(
      new MockDashboardDataError("Business not found.", "BUSINESS_NOT_FOUND"),
    );

    const responsePromise = POST(
      makeRequest({ toNumber: "+15550001234", businessId: "missing" }) as never,
    );
    await advanceDelay();
    const res = await responsePromise;
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.code).toBe("BUSINESS_NOT_FOUND");
  });

  it("returns 500 when alertCall fails", async () => {
    mockAlertCall.mockRejectedValueOnce(new Error("Twilio error"));

    const responsePromise = POST(
      makeRequest({ toNumber: "+15550001234", businessId: "biz-test" }) as never,
    );
    await advanceDelay();
    const res = await responsePromise;
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.code).toBe("CALL_FAILED");
  });
});

async function advanceDelay() {
  await jest.advanceTimersByTimeAsync(10_000);
}

function actRunPendingTimers() {
  jest.runOnlyPendingTimers();
}
