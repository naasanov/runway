"use client";

import { Nav } from "@/components/nav";
import { ApiError, runwayApi } from "@/lib/api";
import type {
  DashboardResponse,
  MeResponse,
  RecommendedAction,
  Severity,
  Transaction,
} from "@/lib/types";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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

const COLORS = {
  red: {
    hex: "#dc2626",
    text: "text-red-600",
    accent: "border-l-red-500",
    dot: "bg-red-500",
    meter: "bg-red-500",
  },
  amber: {
    hex: "#d97706",
    text: "text-amber-600",
    accent: "border-l-amber-400",
    dot: "bg-amber-400",
    meter: "bg-amber-400",
  },
  green: {
    hex: "#166534",
    text: "text-green-700",
    accent: "border-l-green-600",
    dot: "bg-green-500",
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

function SectionHeader({ index, label }: { index: string; label: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-muted-foreground tracking-[0.15em]">
          #{index} ·
        </span>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.1em]">
          {label}
        </span>
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

// Scroll reveal hook — fades in when 20% of element is visible
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${
        visible
          ? "opacity-100 translate-y-0 scale-100 blur-0"
          : "opacity-0 translate-y-12 scale-[0.97] blur-[2px]"
      }`}
    >
      {children}
    </div>
  );
}

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
      <p className={`font-mono font-bold ${val < 0 ? "text-red-600" : "text-foreground"}`}>
        {formatCurrency(val)}
      </p>
    </div>
  );
}

function CashFlowChart({ days }: { days: DashboardResponse["forecast_summary"]["days"] }) {
  const chartData = days.map((day) => ({
    label: format(parseISO(day.date), "MMM d"),
    balance: Math.round(day.projected_balance),
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
        <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          interval={3}
        />
        <YAxis
          tickFormatter={(v: number) =>
            Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
          }
          tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <ReferenceLine y={0} stroke={COLORS.red.hex} strokeDasharray="4 2" strokeWidth={1.5} />
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
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

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

    async function loadTransactions() {
      try {
        const scenario =
          typeof window !== "undefined"
            ? (localStorage.getItem(`runway_scenario_${selectedBusinessId}`) ??
              "bakery")
            : "bakery";

        const res = await fetch(
          `/api/mock/stripe/transactions?business_id=${selectedBusinessId}&scenario=${scenario}`
        );
        if (res.ok) {
          const json = (await res.json()) as { transactions: Transaction[] };
          if (!cancelled) {
            setTransactions(
              [...json.transactions]
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 20)
            );
          }
        }
      } catch {
        // non-critical — silently skip
      }
    }

    void loadDashboard();
    void loadTransactions();
    void runwayApi.getMe().then((u) => { if (!cancelled) setMe(u); }).catch(() => null);
    return () => { cancelled = true; };
  }, [businessId, router]);

  const headlineAlert = useMemo(
    () =>
      data?.alerts.find((a) => a.severity === "red") ??
      data?.alerts[0] ??
      null,
    [data]
  );

  const topAction = useMemo<RecommendedAction | null>(
    () => headlineAlert?.recommended_actions[0] ?? null,
    [headlineAlert]
  );

  const remainingActions = useMemo<RecommendedAction[]>(
    () =>
      data?.alerts
        .flatMap((a) => a.recommended_actions)
        .filter((a) => a !== topAction)
        .slice(0, 4) ?? [],
    [data, topAction]
  );

  if (!businessId) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-3xl mx-auto px-6 py-16">
          <div className="border border-border p-6">
            <p className="font-medium">No business selected.</p>
            <Link href="/connect" className="inline-flex mt-4 px-4 py-2 bg-foreground text-background text-sm font-medium">
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
          <div className="border border-border p-6 text-red-600">{error}</div>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background pb-mobile-nav">
        <Nav businessId={businessId} />
        <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
          <div className="h-[50vh] bg-muted animate-pulse" />
          <div className="h-32 bg-muted animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-72 bg-muted animate-pulse" />
            <div className="h-72 bg-muted animate-pulse" />
          </div>
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

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-12">

        {/* Header */}
        <header>
          <p className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] uppercase mb-1">
            {`// ${me?.name ?? "cash_flow_intelligence"}`}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{me?.businessName ?? data.business.name}</h1>
        </header>

        {/* #01 · Cash Runway — 50vh, split: number left / top alert+action right */}
        <section>
          <SectionHeader index="01" label="Cash Runway" />

          <div className={`min-h-[50vh] border border-border border-l-4 ${sc.accent} grid grid-cols-1 lg:grid-cols-2`}>

            {/* LEFT: runway number */}
            <div className="flex flex-col justify-between p-8 lg:border-r border-border">
              <p className={`text-xs font-mono font-bold uppercase tracking-[0.2em] ${sc.text}`}>
                {isCritical ? "⚠ runway alert" : isWarning ? "▲ low runway" : "✓ runway healthy"}
              </p>

              <div>
                <div className="flex items-baseline gap-4 mb-2">
                  <span
                    className={`font-black font-mono tabular-nums leading-none ${sc.text} ${isCritical ? "animate-pulse" : ""}`}
                    style={{ fontSize: "clamp(5rem, 14vw, 11rem)" }}
                  >
                    {runwayDays}
                  </span>
                  <div>
                    <p className="text-2xl font-bold text-foreground">days of cash</p>
                    <p className="text-sm text-muted-foreground">at current burn rate</p>
                  </div>
                </div>

                {/* Meter bar */}
                <div className="w-full h-[3px] bg-border/30 mt-6 mb-6">
                  <div
                    className={`h-full ${sc.meter} transition-all duration-700`}
                    style={{ width: `${meterPct}%` }}
                  />
                </div>

                <div className="flex items-center gap-8 flex-wrap">
                  <KpiStat label="Current Balance" value={formatCurrency(data.business.current_balance)} />
                  {data.forecast_summary.min_projected_balance < 0 && (
                    <KpiStat
                      label="Lowest Projected"
                      value={formatCurrency(data.forecast_summary.min_projected_balance)}
                      danger
                    />
                  )}
                  <KpiStat label="Forecast Window" value={`${data.forecast_summary.horizon_days} days`} />
                </div>
              </div>
            </div>

            {/* RIGHT: top alert + recommended action */}
            {headlineAlert ? (
              <div className="flex flex-col justify-between p-8">
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.15em] mb-4">
                    #02 · Top Alert
                  </p>
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${sc.dot} ${isCritical ? "animate-pulse" : ""}`} />
                    <div>
                      <p className={`font-bold text-lg leading-snug ${sc.text}`}>
                        {headlineAlert.headline}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                        {headlineAlert.detail}
                      </p>
                    </div>
                  </div>
                </div>

                {topAction && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.15em] mb-3">
                      recommended action
                    </p>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-semibold leading-snug">
                          {topAction.action}
                          {topAction.target && (
                            <span className="text-muted-foreground font-normal"> · {topAction.target}</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{topAction.impact}</p>
                      </div>
                      <p className={`text-lg font-mono font-black tabular-nums shrink-0 ${topAction.amount > 0 ? "text-green-700" : "text-red-600"}`}>
                        {topAction.amount > 0 ? "+" : ""}{formatCurrency(topAction.amount)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                No active alerts
              </div>
            )}
          </div>
        </section>

        {/* #03 · Active Alerts */}
        {data.alerts.length > 0 && (
          <Reveal>
            <SectionHeader index="02" label="Active Alerts" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.alerts.map((alert) => {
                const asc = getColors(alert.severity);
                return (
                  <div
                    key={alert.id}
                    className={`bg-background border border-border border-l-4 ${asc.accent} p-5`}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${asc.dot} ${alert.severity === "red" ? "animate-pulse" : ""}`} />
                      <p className={`font-semibold text-sm leading-snug ${asc.text}`}>
                        {alert.headline}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground pl-5 leading-relaxed">
                      {alert.detail}
                    </p>
                  </div>
                );
              })}
            </div>
          </Reveal>
        )}

        {/* #04 · Cash Forecast + #05 · Upcoming Obligations */}
        <Reveal>
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
                    <div key={`${item.description}-${item.due_date}`} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <span className="text-[10px] font-mono text-muted-foreground w-4 tabular-nums shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(item.due_date), "MMM d")}
                        </p>
                      </div>
                      <span className={`font-mono font-semibold tabular-nums text-sm shrink-0 ${isDanger ? "text-red-600" : "text-foreground"}`}>
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Reveal>

        {/* #06 · Recommended Actions */}
        {remainingActions.length > 0 && (
          <Reveal>
            <SectionHeader index="05" label="Recommended Actions" />
            <div className="border border-border divide-y divide-border">
              {remainingActions.map((action, index) => (
                <div key={`${action.action}-${index}`} className="flex items-start gap-4 px-4 py-4">
                  <span className="text-[10px] font-mono text-muted-foreground w-4 tabular-nums mt-0.5 shrink-0">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {action.action}
                      {action.target && (
                        <span className="text-muted-foreground font-normal"> · {action.target}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{action.impact}</p>
                  </div>
                  <div className={`shrink-0 text-sm font-mono font-bold tabular-nums ${action.amount > 0 ? "text-green-700" : "text-red-600"}`}>
                    {action.amount > 0 ? "+" : ""}{formatCurrency(action.amount)}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        )}

        {/* #07 · Transaction History */}
        {transactions.length > 0 && (
          <Reveal>
            <SectionHeader index="06" label="Transaction History" />
            <div className="border border-border divide-y divide-border">
              {transactions.map((txn) => {
                const isCredit = txn.transaction_type === "credit";
                const isUnpaid = txn.invoice_status === "unpaid";
                return (
                  <div key={txn.id} className="flex items-center gap-4 px-4 py-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{txn.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(txn.date), "MMM d, yyyy")}
                        {txn.category && (
                          <span className="ml-2 font-mono">{txn.category}</span>
                        )}
                        {isUnpaid && (
                          <span className="ml-2 text-red-600 font-semibold">unpaid</span>
                        )}
                      </p>
                    </div>
                    <span className={`font-mono font-semibold tabular-nums shrink-0 ${isCredit ? "text-green-700" : "text-foreground"}`}>
                      {isCredit ? "+" : "−"}{formatCurrency(Math.abs(txn.amount))}
                    </span>
                  </div>
                );
              })}
            </div>
          </Reveal>
        )}

      </main>
    </div>
  );
}

function KpiStat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.15em]">
        {label}
      </p>
      <p className={`text-xl font-mono font-bold tabular-nums mt-0.5 ${danger ? "text-red-600" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
