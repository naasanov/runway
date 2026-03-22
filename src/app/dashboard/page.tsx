"use client";

import { Nav } from "@/components/nav";
import { ApiError, runwayApi } from "@/lib/api";
import type {
  DashboardResponse,
  RecommendedAction,
  Severity,
} from "@/lib/types";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const DASHBOARD_RETRY_COUNT = 4;
const DASHBOARD_RETRY_DELAY_MS = 350;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function severityColors(severity: Severity | null) {
  if (severity === "red")
    return {
      border: "border-runway-danger/30",
      bg: "bg-runway-danger/5",
      text: "text-runway-danger",
      accent: "border-l-runway-danger",
    };
  if (severity === "amber")
    return {
      border: "border-runway-warning/30",
      bg: "bg-runway-warning/5",
      text: "text-runway-warning",
      accent: "border-l-runway-warning",
    };
  return {
    border: "border-runway-positive/30",
    bg: "bg-runway-positive/5",
    text: "text-runway-positive",
    accent: "border-l-runway-positive",
  };
}

function SectionHeader({
  index,
  label,
  action,
}: {
  index: string;
  label: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-runway-muted tracking-[0.15em]">
            #{index} ·
          </span>
          <span className="text-xs font-semibold text-runway-text-secondary uppercase tracking-[0.1em]">
            {label}
          </span>
        </div>
        {action}
      </div>
      <div className="mt-1.5 border-b border-runway-border/50" />
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isHydratedDashboard(data: DashboardResponse): boolean {
  return (
    data.business.runway_days != null ||
    data.alerts.length > 0 ||
    data.upcoming_obligations.length > 0
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams.get("b");
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) {
      router.replace("/connect");
      return;
    }

    const selectedBusinessId = businessId;
    let cancelled = false;

    async function loadDashboard() {
      try {
        setError(null);
        let response = await runwayApi.getDashboard(selectedBusinessId);

        for (let attempt = 1; attempt < DASHBOARD_RETRY_COUNT; attempt += 1) {
          if (isHydratedDashboard(response)) {
            break;
          }

          await sleep(DASHBOARD_RETRY_DELAY_MS);
          response = await runwayApi.getDashboard(selectedBusinessId);
        }

        if (!isHydratedDashboard(response)) {
          throw new Error(
            "Dashboard returned no runway, no alerts, and no upcoming obligations after multiple retries."
          );
        }

        if (!cancelled) {
          setData(response);
        }
      } catch (dashboardError) {
        if (!cancelled) {
          setError(
            dashboardError instanceof ApiError
              ? dashboardError.message
              : dashboardError instanceof Error
                ? dashboardError.message
                : "We couldn't load the dashboard."
          );
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [businessId, router]);

  const headlineAlert = useMemo(
    () =>
      data?.alerts.find((alert) => alert.severity === "red") ??
      data?.alerts[0] ??
      null,
    [data]
  );

  const recommendedActions = useMemo<RecommendedAction[]>(
    () =>
      data?.alerts.flatMap((alert) => alert.recommended_actions).slice(0, 4) ??
      [],
    [data]
  );

  if (!businessId) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-3xl mx-auto px-6 py-16">
          <div className="border border-border bg-card p-6">
            <p className="font-medium">No business selected.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Connect a business first so we know which dashboard to load.
            </p>
            <Link
              href="/connect"
              className="inline-flex mt-4 px-4 py-2 bg-foreground text-background text-sm font-medium"
            >
              Go to connect
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background pb-mobile-nav">
        <Nav businessId={businessId} />
        <main className="max-w-6xl mx-auto px-6 py-8">
          <div className="border border-red-200 bg-red-50 p-6 text-red-700">
            {error}
          </div>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background pb-mobile-nav">
        <Nav businessId={businessId} />
        <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
          <div className="h-20 bg-muted animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-72 bg-muted animate-pulse" />
            <div className="h-72 bg-muted animate-pulse" />
          </div>
          <div className="h-48 bg-muted animate-pulse" />
        </main>
      </div>
    );
  }

  const sc = severityColors(data.business.runway_severity);

  return (
    <div className="min-h-screen bg-background pb-mobile-nav">
      <Nav businessId={businessId} />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-10">

        {/* Header */}
        <header className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] uppercase mb-1">
              {"// cash_flow_intelligence"}
            </p>
            <h1 className="text-2xl font-bold tracking-tight">{data.business.name}</h1>
          </div>
        </header>

        {/* #01 · Runway */}
        <section>
          <SectionHeader index="01" label="Cash Runway" />
          <div className={`border-l-4 ${sc.accent} ${sc.bg} border border-l-0 ${sc.border} p-6`}>
            <div className="flex items-baseline gap-4 mb-3">
              <span className={`text-6xl font-bold font-mono tabular-nums tracking-tighter ${sc.text}`}>
                {data.business.runway_days ?? 0}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">days of cash</p>
                <p className="text-xs text-muted-foreground">at current burn rate</p>
              </div>
              <div className={`ml-auto px-2.5 py-1 border ${sc.border} ${sc.bg}`}>
                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${sc.text}`}>
                  {data.business.runway_severity === "red"
                    ? "critical"
                    : data.business.runway_severity === "amber"
                      ? "warning"
                      : "healthy"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 border-t border-border/50 pt-4 mt-2">
              <KpiStat
                label="Current Balance"
                value={formatCurrency(data.business.current_balance)}
              />
              {data.forecast_summary.min_projected_balance < 0 && (
                <KpiStat
                  label="Lowest Projected"
                  value={formatCurrency(data.forecast_summary.min_projected_balance)}
                  danger
                />
              )}
              {headlineAlert && (
                <p className="text-sm text-muted-foreground ml-auto max-w-xs text-right leading-snug">
                  {headlineAlert.headline}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* #02 · Active Alerts */}
        <section>
          <SectionHeader index="02" label="Active Alerts" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-border">
            {data.alerts.map((alert, i) => (
              <AlertCard
                key={alert.id}
                severity={alert.severity}
                headline={alert.headline}
                detail={alert.detail}
                index={i}
                total={data.alerts.length}
              />
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* #03 · Cash Forecast */}
          <div className="lg:col-span-2">
            <SectionHeader
              index="03"
              label={`${data.forecast_summary.horizon_days}-Day Cash Forecast`}
            />
            <div className="space-y-0 border border-border">
              {data.forecast_summary.days.slice(0, 8).map((day, i) => (
                <div
                  key={day.date}
                  className={`flex items-center justify-between px-4 py-3 text-sm ${
                    i < 7 ? "border-b border-border" : ""
                  } ${day.is_danger ? "bg-red-50 dark:bg-red-950/10" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-muted-foreground w-4 tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="font-medium tabular-nums">
                        {format(parseISO(day.date), "MMM d")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Rev {formatCurrency(day.expected_revenue)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-mono font-semibold tabular-nums ${
                        day.is_danger ? "text-red-600" : "text-foreground"
                      }`}
                    >
                      {formatCurrency(day.projected_balance)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {day.obligations.length
                        ? `${day.obligations.length} obligations`
                        : "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* #04 · Upcoming Obligations */}
          <div>
            <SectionHeader index="04" label="Upcoming Obligations" />
            <div className="space-y-0 border border-border">
              {data.upcoming_obligations.map((item, i) => {
                const isDanger = data.forecast_summary.danger_dates.includes(item.due_date);
                return (
                  <div
                    key={`${item.description}-${item.due_date}`}
                    className={`flex items-center gap-3 px-4 py-3 text-sm ${
                      i < data.upcoming_obligations.length - 1 ? "border-b border-border" : ""
                    } ${isDanger ? "bg-red-50 dark:bg-red-950/10" : ""}`}
                  >
                    <span className="text-[10px] font-mono text-muted-foreground w-4 tabular-nums shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(item.due_date), "MMM d")}
                      </p>
                    </div>
                    <span
                      className={`font-mono font-semibold tabular-nums text-sm shrink-0 ${
                        isDanger ? "text-red-600" : "text-foreground"
                      }`}
                    >
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* #05 · Recommended Actions */}
        <section>
          <SectionHeader index="05" label="Recommended Actions" />
          <div className="space-y-0 border border-border">
            {recommendedActions.map((action, index) => (
              <ActionRow
                key={`${action.action}-${index}`}
                index={index}
                action={action}
                total={recommendedActions.length}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function KpiStat({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.15em]">
        {label}
      </p>
      <p
        className={`text-xl font-mono font-bold tabular-nums mt-0.5 ${
          danger ? "text-red-600" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function AlertCard({
  severity,
  headline,
  detail,
  index,
  total,
}: {
  severity: Severity;
  headline: string;
  detail: string;
  index: number;
  total: number;
}) {
  const isLastRow = index >= total - (total % 2 === 0 ? 2 : 1);
  const isRightCol = index % 2 === 1;

  const sc = severityColors(severity);
  const isRed = severity === "red";

  return (
    <div
      className={`p-5 border-l-4 ${sc.accent} ${sc.bg} ${
        !isLastRow ? "border-b border-border" : ""
      } ${isRightCol ? "border-l border-border border-l-4" : ""}`}
    >
      <div className="flex items-start gap-3 mb-2">
        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
          severity === "red" ? "bg-red-500" : severity === "amber" ? "bg-amber-400" : "bg-green-500"
        } ${isRed ? "animate-pulse" : ""}`} />
        <p className={`font-semibold text-sm leading-snug ${sc.text}`}>
          {headline}
        </p>
      </div>
      <p className="text-xs text-muted-foreground pl-5 leading-relaxed max-w-prose">
        {detail}
      </p>
    </div>
  );
}

function ActionRow({
  index,
  action,
  total,
}: {
  index: number;
  action: RecommendedAction;
  total: number;
}) {
  return (
    <div
      className={`flex items-start gap-4 px-4 py-4 ${
        index < total - 1 ? "border-b border-border" : ""
      }`}
    >
      <span className="text-[10px] font-mono text-muted-foreground w-4 tabular-nums mt-0.5 shrink-0">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          {action.action}
          {action.target ? (
            <span className="text-muted-foreground font-normal"> · {action.target}</span>
          ) : null}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{action.impact}</p>
      </div>
      <div className="shrink-0 text-sm font-mono font-semibold tabular-nums text-foreground">
        {formatCurrency(action.amount)}
      </div>
    </div>
  );
}
