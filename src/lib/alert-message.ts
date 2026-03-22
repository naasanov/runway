import { format, parseISO } from "date-fns";
import type { Alert, DashboardResponse } from "@/lib/types";
import { formatRunwayDaysPhrase } from "@/lib/runway-display";

export interface AlertMessageResponse {
  message: string;
  sentiment: "light" | "medium" | "heavy";
}

export type AlertSentiment = AlertMessageResponse["sentiment"];
export type AlertMessageContext = DashboardResponse;

const severityWeight: Record<Alert["severity"], number> = {
  red: 3,
  amber: 2,
  green: 1,
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string): string {
  return format(parseISO(date), "MMMM d");
}

function chooseTopAlert(alerts: Alert[]): Alert | null {
  if (alerts.length === 0) return null;

  return [...alerts].sort((left, right) => {
    const severityDifference =
      severityWeight[right.severity] - severityWeight[left.severity];
    if (severityDifference !== 0) return severityDifference;
    return right.created_at.localeCompare(left.created_at);
  })[0];
}

function buildDashboardFact(context: AlertMessageContext): string {
  const firstDangerDate = context.forecast_summary.danger_dates[0];
  if (firstDangerDate) {
    return `Your forecast first goes negative on ${formatDate(firstDangerDate)}.`;
  }

  const nextObligation = context.upcoming_obligations[0];
  if (nextObligation) {
    return `Your next major obligation is ${nextObligation.description} for ${formatCurrency(nextObligation.amount)} on ${formatDate(nextObligation.due_date)}.`;
  }

  if (context.business.runway_days != null) {
    return `You have about ${formatRunwayDaysPhrase(context.business.runway_days)} of cash runway at the current pace.`;
  }

  return "Your latest dashboard data is ready to review.";
}

function buildNoAlertSummary(context: AlertMessageContext): string {
  const runwaySentence =
    context.business.runway_days != null
      ? `You currently have about ${formatRunwayDaysPhrase(context.business.runway_days)} of cash runway.`
      : "Your latest cash flow summary is ready.";

  const supportingFact = buildDashboardFact(context);
  return [
    `Runway update for ${context.business.name}.`,
    runwaySentence,
    supportingFact,
    "Check your Runway dashboard for the full breakdown.",
  ].join(" ");
}

/** Generate the alert call message and sentiment from live dashboard data. */
export async function getAlertMessage(
  context: AlertMessageContext,
): Promise<AlertMessageResponse> {
  const topAlert = chooseTopAlert(context.alerts);

  if (!topAlert) {
    return {
      message: buildNoAlertSummary(context),
      sentiment: "light",
    };
  }

  const sentiment: AlertSentiment =
    topAlert.severity === "red"
      ? "heavy"
      : topAlert.severity === "amber"
        ? "medium"
        : "light";

  return {
    message: [
      `Runway alert for ${context.business.name}.`,
      topAlert.headline,
      buildDashboardFact(context),
      "Please check your Runway dashboard for the full details and recommended next steps.",
    ].join(" "),
    sentiment,
  };
}
