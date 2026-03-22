import { differenceInCalendarDays, parseISO, format, startOfDay } from "date-fns";
import type {
  Alert,
  Business,
  ForecastDay,
  RecommendedAction,
  Severity,
  AlertScenario,
  Transaction,
} from "./types";
import { isGeminiServiceUnavailable } from "./demo-fallback";

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
// Scenario 2 — Overdue Invoice
// ---------------------------------------------------------------------------

type AlertDraft = Omit<Alert, "sms_sent" | "sms_sent_at" | "created_at">;

export function detectOverdueInvoiceAlerts(
  businessId: string,
  transactions: Transaction[],
  forecastDays: ForecastDay[],
  today = new Date()
): AlertDraft[] {
  const alerts: AlertDraft[] = [];
  const todayStart = startOfDay(today);

  // Find overdue invoices: invoice type, not paid, issued strictly more than 7 calendar days ago
  const overdueInvoices = transactions.filter((txn) => {
    if (txn.transaction_type !== "invoice") return false;
    if (txn.invoice_status === "paid") return false;
    if (!txn.invoice_date) return false;
    const calendarDaysOld = differenceInCalendarDays(todayStart, parseISO(txn.invoice_date));
    return calendarDaysOld > 7;
  });

  if (overdueInvoices.length === 0) return alerts;

  // Find the nearest danger date from the forecast
  const firstDangerDay = forecastDays.find((d) => d.is_danger);

  for (const invoice of overdueInvoices) {
    const invoiceDate = parseISO(invoice.invoice_date!);
    const daysOverdue = differenceInCalendarDays(todayStart, invoiceDate);
    const amount = Math.abs(invoice.amount);
    // Extract customer name: split on em dash, en dash, or hyphen surrounded by spaces
    const customerName = invoice.customer_id
      ? (invoice.description.split(/\s*[—–\-]\s*/)[0]?.trim() || invoice.customer_id)
      : "Unknown customer";

    let headline: string;
    let detail: string;
    const actions: RecommendedAction[] = [];

    if (firstDangerDay) {
      const shortfall = Math.abs(firstDangerDay.projected_balance);
      const dangerDate = firstDangerDay.date;
      const obligationNames = firstDangerDay.obligations
        .map((o) => o.description)
        .join(" + ");

      headline = `${customerName} owes $${amount.toLocaleString()} and is ${daysOverdue} days overdue.`;
      detail = `If not collected by ${format(parseISO(dangerDate), "MMMM d")}, you will not cover the $${shortfall.toLocaleString()} ${obligationNames || "expense"} shortfall on ${format(parseISO(dangerDate), "MMMM d")}.`;

      actions.push({
        action: "Send payment reminder",
        target: customerName,
        amount,
        impact: `Covers ${obligationNames || "upcoming"} shortfall${amount > shortfall ? ` with $${(amount - shortfall).toLocaleString()} buffer` : ""}`,
      });
    } else {
      headline = `${customerName} owes $${amount.toLocaleString()} and is ${daysOverdue} days overdue.`;
      detail = `Invoice issued ${format(invoiceDate, "MMMM d")} is now ${daysOverdue} days past due. Collecting this improves your cash position.`;

      actions.push({
        action: "Send payment reminder",
        target: customerName,
        amount,
        impact: `Adds $${amount.toLocaleString()} to your cash position`,
      });
    }

    // Red if there's an upcoming shortfall the invoice could cover, otherwise amber
    const severity: Severity = firstDangerDay ? "red" : "amber";

    alerts.push(
      createAlert(businessId, "overdue_invoice", severity, headline, detail, actions)
    );
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// Scenario 3 — Subscription Waste
// ---------------------------------------------------------------------------

interface GeminiOverlapResult {
  overlapping_groups: {
    purpose: string;
    tools: { description: string; monthly_cost: number }[];
    cancel_recommendation: string;
    monthly_savings: number;
  }[];
}

export async function detectSubscriptionWasteAlerts(
  businessId: string,
  transactions: Transaction[],
  gemini: { generateContent: (prompt: string[]) => Promise<{ response: { text: () => string } }> }
): Promise<AlertDraft[]> {
  // Find all subscription transactions, deduplicate by description
  const subscriptionMap = new Map<string, { amount: number; count: number }>();

  for (const txn of transactions) {
    if (txn.category !== "subscriptions") continue;
    const cost = Math.abs(txn.amount);
    const existing = subscriptionMap.get(txn.description);
    if (existing) {
      existing.count++;
    } else {
      subscriptionMap.set(txn.description, { amount: cost, count: 1 });
    }
  }

  const subscriptions = Array.from(subscriptionMap.entries()).map(
    ([description, info]) => ({
      description,
      monthly_cost: info.amount,
    })
  );

  // Need at least 2 subscriptions to detect overlap
  if (subscriptions.length < 2) return [];

  const prompt = [
    `You are a financial analyst identifying overlapping subscription tools for a small business.

Given the list of subscriptions below, identify any groups of tools that serve the same purpose (e.g., two scheduling tools, two design tools, two POS systems).

For each overlapping group, return:
- "purpose": what the tools do (e.g., "employee scheduling")
- "tools": array of { "description", "monthly_cost" } for each overlapping tool
- "cancel_recommendation": the description of the higher-cost tool to cancel
- "monthly_savings": the monthly cost of the tool to cancel

Respond with ONLY a JSON object: { "overlapping_groups": [...] }
If no overlaps found, return { "overlapping_groups": [] }.
No markdown, no explanation.`,
    `Subscriptions:\n${JSON.stringify(subscriptions)}`,
  ];

  try {
    const response = await gemini.generateContent(prompt);
    const text = response.response.text();
    const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const result: GeminiOverlapResult = JSON.parse(cleaned);

    const alerts: AlertDraft[] = [];

    for (const group of result.overlapping_groups) {
      if (group.tools.length < 2) continue;

      const totalMonthlyCost = group.tools.reduce((s, t) => s + t.monthly_cost, 0);
      const annualSavings = group.monthly_savings * 12;
      const toolCount = group.tools.length;
      const toolNames = group.tools.map((t) => t.description).join(" and ");

      const headline = `You're paying $${totalMonthlyCost}/month for ${toolCount} ${group.purpose} tools that overlap.`;
      const detail = `${toolNames} serve the same purpose. Cancel ${group.cancel_recommendation} to save $${annualSavings.toLocaleString()}/year.`;

      const actions: RecommendedAction[] = [
        {
          action: `Cancel ${group.cancel_recommendation}`,
          target: group.cancel_recommendation,
          amount: group.monthly_savings,
          impact: `Save $${annualSavings.toLocaleString()}/year ($${group.monthly_savings}/month)`,
        },
      ];

      alerts.push(
        createAlert(businessId, "subscription_waste", "amber", headline, detail, actions)
      );
    }

    return alerts;
  } catch (err) {
    console.error("Subscription waste detection failed:", err);
    if (!isGeminiServiceUnavailable(err)) {
      return [];
    }

    console.log(
      `[alerts:${businessId}] subscription_waste_gemini_fallback ${JSON.stringify({
        subscription_count: subscriptions.length,
      })}`
    );

    const schedulingTools = subscriptions.filter((subscription) =>
      /homebase|7shifts|scheduling/i.test(subscription.description),
    );

    if (schedulingTools.length < 2) {
      console.log(
        `[alerts:${businessId}] subscription_waste_gemini_fallback_no_overlap ${JSON.stringify({
          subscription_count: subscriptions.length,
        })}`
      );
      return [];
    }

    const cancelTarget = schedulingTools.reduce((highest, current) =>
      current.monthly_cost > highest.monthly_cost ? current : highest,
    );
    const totalMonthlyCost = schedulingTools.reduce(
      (sum, tool) => sum + tool.monthly_cost,
      0,
    );
    const annualSavings = cancelTarget.monthly_cost * 12;
    const toolNames = schedulingTools.map((tool) => tool.description).join(" and ");

    return [
      createAlert(
        businessId,
        "subscription_waste",
        "amber",
        `You're paying $${totalMonthlyCost}/month for ${schedulingTools.length} scheduling tools that overlap.`,
        `${toolNames} serve the same purpose. Cancel ${cancelTarget.description} to save $${annualSavings.toLocaleString()}/year.`,
        [
          {
            action: `Cancel ${cancelTarget.description}`,
            target: cancelTarget.description,
            amount: cancelTarget.monthly_cost,
            impact: `Save $${annualSavings.toLocaleString()}/year ($${cancelTarget.monthly_cost}/month)`,
          },
        ],
      ),
    ];
  }
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
