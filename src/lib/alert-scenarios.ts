import type {
  Alert,
  Business,
  RecommendedAction,
  Severity,
  AlertScenario,
} from "./types";

let alertCounter = 0;

function generateAlertId(): string {
  alertCounter++;
  return `alert-${String(alertCounter).padStart(4, "0")}-${Date.now()}`;
}

function createAlert(
  businessId: string,
  scenario: AlertScenario,
  severity: Severity,
  headline: string,
  detail: string,
  recommendedActions: RecommendedAction[]
): Omit<Alert, "sms_sent" | "sms_sent_at" | "created_at"> {
  return {
    id: generateAlertId(),
    business_id: businessId,
    scenario,
    severity,
    headline,
    detail,
    recommended_actions: recommendedActions,
  };
}

// ---------------------------------------------------------------------------
// Scenario 1 — Runway
// ---------------------------------------------------------------------------

export function detectRunwayAlert(
  business: Pick<Business, "id" | "current_balance" | "runway_days" | "runway_severity">
): Omit<Alert, "sms_sent" | "sms_sent_at" | "created_at"> | null {
  const { runway_days, runway_severity } = business;

  if (runway_days == null || runway_severity == null) {
    return null;
  }

  const severity: Severity = runway_severity;

  const headline = `You have ${runway_days} days of cash remaining at current burn rate.`;

  let detail: string;
  if (severity === "red") {
    detail = `Critical: At your current spend, cash runs out in less than 30 days. Current balance: $${business.current_balance.toLocaleString()}.`;
  } else if (severity === "amber") {
    detail = `Warning: Your runway is between 30–59 days. Current balance: $${business.current_balance.toLocaleString()}.`;
  } else {
    detail = `Healthy: You have 60+ days of runway. Current balance: $${business.current_balance.toLocaleString()}.`;
  }

  const actions: RecommendedAction[] = [];
  if (severity === "red" || severity === "amber") {
    actions.push({
      action: "Review upcoming expenses",
      target: "All recurring obligations",
      amount: 0,
      impact: "Identify expenses that can be deferred or cut",
    });
  }

  return createAlert(business.id, "runway", severity, headline, detail, actions);
}

// ---------------------------------------------------------------------------
// Helpers for writing alerts to DB
// ---------------------------------------------------------------------------

export async function writeAlertToDb(
  supabase: { from: (table: string) => unknown },
  alert: Omit<Alert, "sms_sent" | "sms_sent_at" | "created_at">
): Promise<Alert | null> {
  const row = {
    id: alert.id,
    business_id: alert.business_id,
    scenario: alert.scenario,
    severity: alert.severity,
    headline: alert.headline,
    detail: alert.detail,
    recommended_actions: alert.recommended_actions,
    sms_sent: false,
    sms_sent_at: null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("alerts") as any).insert(row);

  if (error) {
    console.error(`Failed to write alert ${alert.id}:`, error);
    return null;
  }

  return {
    ...alert,
    sms_sent: false,
    sms_sent_at: null,
    created_at: new Date().toISOString(),
  };
}

export async function clearExistingAlerts(
  supabase: { from: (table: string) => unknown },
  businessId: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("alerts") as any)
    .delete()
    .eq("business_id", businessId);

  if (error) {
    console.error("Failed to clear existing alerts:", error);
  }
}
