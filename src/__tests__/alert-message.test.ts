import { getAlertMessage } from "@/lib/alert-message";
import type { DashboardResponse } from "@/lib/types";

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
    alerts: [],
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

describe("getAlertMessage", () => {
  it("prefers a red alert over an amber alert", async () => {
    const result = await getAlertMessage(
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
            created_at: "2026-03-21T09:00:00Z",
          },
          {
            id: "alert-red",
            business_id: "biz-test",
            scenario: "runway",
            severity: "red",
            headline: "You have 22 days of cash remaining.",
            detail: "Projected burn remains elevated.",
            recommended_actions: [],
            sms_sent: false,
            sms_sent_at: null,
            created_at: "2026-03-20T09:00:00Z",
          },
        ],
      }),
    );

    expect(result.sentiment).toBe("heavy");
    expect(result.message).toContain("You have 22 days of cash remaining.");
    expect(result.message).toContain("March 30");
  });

  it("prefers the newest alert when severities match", async () => {
    const result = await getAlertMessage(
      makeDashboardResponse({
        alerts: [
          {
            id: "alert-old",
            business_id: "biz-test",
            scenario: "runway",
            severity: "amber",
            headline: "Old runway warning.",
            detail: "Older detail.",
            recommended_actions: [],
            sms_sent: false,
            sms_sent_at: null,
            created_at: "2026-03-20T09:00:00Z",
          },
          {
            id: "alert-new",
            business_id: "biz-test",
            scenario: "overdue_invoice",
            severity: "amber",
            headline: "New invoice alert.",
            detail: "Newer detail.",
            recommended_actions: [],
            sms_sent: false,
            sms_sent_at: null,
            created_at: "2026-03-21T09:00:00Z",
          },
        ],
      }),
    );

    expect(result.sentiment).toBe("medium");
    expect(result.message).toContain("New invoice alert.");
    expect(result.message).not.toContain("Old runway warning.");
  });

  it("builds a dashboard-only summary when there are no alerts", async () => {
    const result = await getAlertMessage(makeDashboardResponse());

    expect(result.sentiment).toBe("light");
    expect(result.message).toContain("Runway update for Sweet Grace Bakery.");
    expect(result.message).toContain("22 days of cash runway");
    expect(result.message).toContain("March 30");
  });

  it("keeps green alerts light", async () => {
    const result = await getAlertMessage(
      makeDashboardResponse({
        business: {
          id: "biz-test",
          name: "Sweet Grace Bakery",
          current_balance: 8400,
          runway_days: 75,
          runway_severity: "green",
          owner_phone: "+19195551234",
        },
        forecast_summary: {
          horizon_days: 30,
          min_projected_balance: 4100,
          danger_dates: [],
          days: [],
        },
        alerts: [
          {
            id: "alert-green",
            business_id: "biz-test",
            scenario: "runway",
            severity: "green",
            headline: "You have healthy runway.",
            detail: "Cash position looks stable.",
            recommended_actions: [],
            sms_sent: false,
            sms_sent_at: null,
            created_at: "2026-03-21T09:00:00Z",
          },
        ],
      }),
    );

    expect(result.sentiment).toBe("light");
    expect(result.message).toContain("You have healthy runway.");
  });

  it("does not say 999 days in healthy runway summaries", async () => {
    const result = await getAlertMessage(
      makeDashboardResponse({
        business: {
          id: "biz-test",
          name: "Sweet Grace Bakery",
          current_balance: 8400,
          runway_days: 999,
          runway_severity: "green",
          owner_phone: "+19195551234",
        },
        alerts: [],
        forecast_summary: {
          horizon_days: 30,
          min_projected_balance: 4100,
          danger_dates: [],
          days: [],
        },
      }),
    );

    expect(result.message).toContain("more than 90 days");
    expect(result.message).not.toContain("999");
  });
});
