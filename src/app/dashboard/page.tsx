"use client";

import { Nav } from "@/components/nav";
import { ApiError, runwayApi } from "@/lib/api";
import type {
  DashboardResponse,
  RecommendedAction,
  Severity,
} from "@/lib/types";
import { format, parseISO } from "date-fns";
import { AlertTriangle, Calendar, TrendingDown, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function severityText(severity: Severity | null): string {
  if (severity === "red") return "text-red-700 bg-red-50 border-red-200";
  if (severity === "amber")
    return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-green-700 bg-green-50 border-green-200";
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
        const response = await runwayApi.getDashboard(selectedBusinessId);

        if (
          response.business.runway_days == null &&
          response.alerts.length === 0 &&
          response.upcoming_obligations.length === 0
        ) {
          throw new Error(
            "Dashboard returned no runway, no alerts, and no upcoming obligations."
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
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="font-medium">No business selected.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Connect a business first so we know which dashboard to load.
            </p>
            <Link
              href="/connect"
              className="inline-flex mt-4 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium"
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
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
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
          <div className="h-20 rounded-2xl bg-muted animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-72 rounded-xl bg-muted animate-pulse" />
            <div className="h-72 rounded-xl bg-muted animate-pulse" />
          </div>
          <div className="h-48 rounded-xl bg-muted animate-pulse" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-mobile-nav">
      <Nav businessId={businessId} />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {data.business.name} · Cash flow overview
          </p>
        </header>

        <section
          className={`rounded-2xl border p-6 ${severityText(
            data.business.runway_severity
          )}`}
        >
          <p className="text-sm font-medium mb-1">Cash Runway</p>
          <p className="text-5xl font-bold mb-2">
            {data.business.runway_days ?? 0} days
          </p>
          <p className="font-semibold text-lg max-w-prose">
            {headlineAlert?.headline ?? "No active alerts."}
          </p>
          <p className="text-sm mt-1 max-w-prose">
            Current balance: {formatCurrency(data.business.current_balance)}
            {data.forecast_summary.min_projected_balance < 0
              ? ` · Lowest projected balance: ${formatCurrency(
                  data.forecast_summary.min_projected_balance
                )}`
              : ""}
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <TrendingDown className="size-4" />
                {data.forecast_summary.horizon_days}-Day Cash Forecast
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Projected balance day-by-day from `GET
                /api/business/:id/dashboard`
              </p>
            </div>

            <div className="space-y-3">
              {data.forecast_summary.days.slice(0, 8).map((day) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {format(parseISO(day.date), "MMM d")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Revenue {formatCurrency(day.expected_revenue)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        day.is_danger ? "text-red-600" : "text-foreground"
                      }`}
                    >
                      {formatCurrency(day.projected_balance)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {day.obligations.length
                        ? `${day.obligations.length} obligations`
                        : "No obligations"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Calendar className="size-4" />
              Upcoming Obligations
            </h2>
            <div className="space-y-3">
              {data.upcoming_obligations.map((item) => (
                <div
                  key={`${item.description}-${item.due_date}`}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(item.due_date), "MMM d")}
                    </p>
                  </div>
                  <span
                    className={`font-semibold tabular-nums ${
                      data.forecast_summary.danger_dates.includes(item.due_date)
                        ? "text-red-600"
                        : ""
                    }`}
                  >
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <section>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <AlertTriangle className="size-4" />
            Active Alerts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                severity={alert.severity}
                headline={alert.headline}
                detail={alert.detail}
              />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Zap className="size-4" />
            Recommended Actions
          </h2>
          <div className="space-y-3">
            {recommendedActions.map((action, index) => (
              <div
                key={`${action.action}-${index}`}
                className="flex items-start gap-4 rounded-xl border border-border bg-card p-4"
              >
                <span className="size-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {action.action}
                    {action.target ? ` · ${action.target}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {action.impact}
                  </p>
                </div>
                <div className="shrink-0 text-xs font-medium text-muted-foreground">
                  {formatCurrency(action.amount)}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function AlertCard({
  severity,
  headline,
  detail,
}: {
  severity: Severity;
  headline: string;
  detail: string;
}) {
  const colors = {
    red: "border-red-200 bg-red-50",
    amber: "border-amber-200 bg-amber-50",
    green: "border-green-200 bg-green-50",
  };
  const dotColors = {
    red: "bg-red-500",
    amber: "bg-amber-400",
    green: "bg-green-500",
  };

  const isRed = severity === "red";

  return (
    <div
      className={`rounded-xl border p-4 ${colors[severity]} ${isRed ? "ring-1 ring-red-300" : ""}`}
    >
      <div className="flex items-center gap-2.5 mb-1.5">
        <span
          className={`size-3 rounded-full ${dotColors[severity]} ${isRed ? "animate-pulse" : ""}`}
        />
        <p className={`font-semibold ${isRed ? "text-base" : "text-sm"}`}>
          {headline}
        </p>
      </div>
      <p className="text-sm text-muted-foreground pl-5 max-w-prose">{detail}</p>
    </div>
  );
}
