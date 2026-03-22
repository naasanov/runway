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
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

const DASHBOARD_RETRY_COUNT = 4;
const DASHBOARD_RETRY_DELAY_MS = 350;

// Color system: red = bad, amber/orange = mediocre, green = good
const COLORS = {
  red: {
    hex: "#dc2626",
    bg: "bg-red-50",
    bgStrong: "bg-red-600",
    border: "border-red-200",
    borderStrong: "border-red-500",
    text: "text-red-700",
    textStrong: "text-red-600",
    accent: "border-l-red-500",
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-700 border border-red-200",
    meter: "bg-red-500",
  },
  amber: {
    hex: "#d97706",
    bg: "bg-amber-50",
    bgStrong: "bg-amber-500",
    border: "border-amber-200",
    borderStrong: "border-amber-400",
    text: "text-amber-700",
    textStrong: "text-amber-600",
    accent: "border-l-amber-400",
    dot: "bg-amber-400",
    badge: "bg-amber-100 text-amber-700 border border-amber-200",
    meter: "bg-amber-400",
  },
  green: {
    hex: "#166534",
    bg: "bg-green-50",
    bgStrong: "bg-green-700",
    border: "border-green-200",
    borderStrong: "border-green-500",
    text: "text-green-800",
    textStrong: "text-green-700",
    accent: "border-l-green-600",
    dot: "bg-green-500",
    badge: "bg-green-100 text-green-800 border border-green-200",
    meter: "bg-green-600",
  },
} as const;

function getColors(severity: Severity | null) {
  if (severity === "red") return COLORS.red;
  if (severity === "amber") return COLORS.amber;
  return COLORS.green;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
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
          <span className="text-[10px] font-mono text-muted-foreground tracking-[0.15em]">
            #{index} ·
          </span>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.1em]">
            {label}
          </span>
        </div>
        {action}
      </div>
      <div className="mt-1.5 border-b border-border/50" />
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

// Chart tooltip
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="bg-background border border-border px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p
        className={`font-mono font-bold ${val < 0 ? "text-red-600" : "text-foreground"}`}
      >
        {formatCurrency(val)}
      </p>
    </div>
  );
}

function CashFlowChart({
  days,
}: {
  days: DashboardResponse["forecast_summary"]["days"];
}) {
  const chartData = days.map((day) => ({
    label: format(parseISO(day.date), "MMM d"),
    balance: Math.round(day.projected_balance),
    isDanger: day.is_danger,
  }));

  const hasNegative = chartData.some((d) => d.balance < 0);
  const strokeColor = hasNegative ? COLORS.red.hex : COLORS.green.hex;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.15} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="2 4"
          stroke="hsl(var(--border))"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          interval={3}
        />
        <YAxis
          tickFormatter={(v: number) =>
            Math.abs(v) >= 1000
              ? `$${(v / 1000).toFixed(0)}k`
              : `$${v}`
          }
          tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <ReferenceLine
          y={0}
          stroke={COLORS.red.hex}
          strokeDasharray="4 2"
          strokeWidth={1.5}
        />
        <RechartsTooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="balance"
          stroke={strokeColor}
          strokeWidth={2}
          fill="url(#cashGrad)"
          dot={false}
          activeDot={{ r: 3, fill: strokeColor, stroke: "white", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
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
          if (isHydratedDashboard(response)) break;
          await sleep(DASHBOARD_RETRY_DELAY_MS);
          response = await runwayApi.getDashboard(selectedBusinessId);
        }

        if (!isHydratedDashboard(response)) {
          throw new Error(
            "Dashboard returned no runway, no alerts, and no upcoming obligations after multiple retries."
          );
        }

        if (!cancelled) setData(response);
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
    return () => { cancelled = true; };
  }, [businessId, router]);

  const headlineAlert = useMemo(
    () =>
      data?.alerts.find((a) => a.severity === "red") ??
      data?.alerts[0] ??
      null,
    [data]
  );

  const recommendedActions = useMemo<RecommendedAction[]>(
    () =>
      data?.alerts.flatMap((a) => a.recommended_actions).slice(0, 4) ?? [],
    [data]
  );

  if (!businessId) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-3xl mx-auto px-6 py-16">
          <div className="border border-border p-6">
            <p className="font-medium">No business selected.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Connect a business first.
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
          <div className="border border-border p-6 text-red-600">
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
          <div className="h-48 bg-muted animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-72 bg-muted animate-pulse" />
            <div className="h-72 bg-muted animate-pulse" />
          </div>
          <div className="h-36 bg-muted animate-pulse" />
        </main>
      </div>
    );
  }

  const sc = getColors(data.business.runway_severity);
  const isCritical = data.business.runway_severity === "red";
  const isWarning = data.business.runway_severity === "amber";
  const runwayDays = data.business.runway_days ?? 0;
  const meterPct = Math.min(100, (runwayDays / 90) * 100);

  return (
    <div className="min-h-screen bg-background pb-mobile-nav">
      <Nav businessId={businessId} />

      {/* Crisis / warning banner — colored bg, white text only (no secondary color text) */}
      {isCritical && (
        <div className="bg-red-600 border-b border-red-700">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
            <p className="text-white text-sm font-medium">
              <span className="font-bold">Cash crisis:</span>{" "}
              {runwayDays} days of runway remaining
              {headlineAlert && ` — ${headlineAlert.headline}`}
            </p>
          </div>
        </div>
      )}
      {isWarning && (
        <div className="bg-amber-500 border-b border-amber-600">
          <div className="max-w-6xl mx-auto px-6 py-2.5 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-white shrink-0" />
            <p className="text-white text-sm font-medium">
              Cash runway is low — {runwayDays} days remaining at current burn rate.
            </p>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-10">

        {/* Header */}
        <header>
          <p className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] uppercase mb-1">
            {"// cash_flow_intelligence"}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{data.business.name}</h1>
        </header>

        {/* #01 · Cash Runway */}
        <section>
          <SectionHeader index="01" label="Cash Runway" />
          <div className={`bg-background border border-border border-l-4 ${sc.accent} relative overflow-hidden`}>

            {/* Runway meter bar at bottom */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-border/20">
              <div
                className={`h-full ${sc.meter} transition-all duration-700`}
                style={{ width: `${meterPct}%` }}
              />
            </div>

            <div className="p-6">
              <div className="flex items-start gap-5 mb-5">
                {/* Big number */}
                <div className="flex items-baseline gap-3">
                  <span
                    className={`text-8xl font-black font-mono tabular-nums leading-none ${sc.text} ${isCritical ? "animate-pulse" : ""}`}
                  >
                    {runwayDays}
                  </span>
                  <div>
                    <p className="text-base font-bold text-foreground">days of cash</p>
                    <p className="text-xs text-muted-foreground">at current burn rate</p>
                    <div className={`inline-flex mt-2 px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider border border-border text-muted-foreground`}>
                      {isCritical ? "critical" : isWarning ? "warning" : "healthy"}
                    </div>
                  </div>
                </div>

                {/* Headline alert callout — neutral bg, colored text only */}
                {headlineAlert && (
                  <div className="ml-auto max-w-sm p-4 border border-border">
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">
                      top alert
                    </p>
                    <p className={`text-sm font-semibold leading-snug ${sc.text}`}>
                      {headlineAlert.headline}
                    </p>
                  </div>
                )}
              </div>

              {/* KPI row */}
              <div className="flex items-center gap-8 border-t border-border/40 pt-4">
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
                <KpiStat
                  label="Forecast Horizon"
                  value={`${data.forecast_summary.horizon_days} days`}
                />
              </div>
            </div>
          </div>
        </section>

        {/* #02 · Active Alerts */}
        <section>
          <SectionHeader index="02" label="Active Alerts" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

        {/* #03 · Cash Forecast chart + #04 · Upcoming Obligations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <SectionHeader
              index="03"
              label={`${data.forecast_summary.horizon_days}-Day Cash Forecast`}
            />
            <div className="border border-border p-4 pb-2">
              <CashFlowChart days={data.forecast_summary.days} />
              {data.forecast_summary.min_projected_balance < 0 && (
                <p className="text-[10px] font-mono text-red-500 mt-2 text-center tracking-wider">
                  balance goes negative — red line = $0
                </p>
              )}
            </div>
          </div>

          <div>
            <SectionHeader index="04" label="Upcoming Obligations" />
            <div className="border border-border divide-y divide-border">
              {data.upcoming_obligations.map((item, i) => {
                const isDanger = data.forecast_summary.danger_dates.includes(item.due_date);
                return (
                  <div
                    key={`${item.description}-${item.due_date}`}
                    className="flex items-center gap-3 px-4 py-3 text-sm"
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
                      className={`font-mono font-semibold tabular-nums text-sm shrink-0 ${isDanger ? "text-red-600" : "text-foreground"}`}
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
          <div className="border border-border divide-y divide-border">
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
        className={`text-xl font-mono font-bold tabular-nums mt-0.5 ${danger ? "text-red-600" : "text-foreground"}`}
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
}: {
  severity: Severity;
  headline: string;
  detail: string;
}) {
  const sc = getColors(severity);

  return (
    <div className={`bg-background border border-border border-l-4 ${sc.accent} p-5`}>
      <div className="flex items-start gap-3 mb-2">
        <div
          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${sc.dot} ${severity === "red" ? "animate-pulse" : ""}`}
        />
        <p className={`font-semibold text-sm leading-snug ${sc.text}`}>
          {headline}
        </p>
      </div>
      <p className="text-xs text-muted-foreground pl-5 leading-relaxed">
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
  const isPositive = action.amount > 0;
  return (
    <div
      className={`flex items-start gap-4 px-4 py-4 ${index < total - 1 ? "" : ""}`}
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
      <div
        className={`shrink-0 text-sm font-mono font-bold tabular-nums ${isPositive ? "text-green-700" : "text-red-600"}`}
      >
        {isPositive ? "+" : ""}{formatCurrency(action.amount)}
      </div>
    </div>
  );
}
