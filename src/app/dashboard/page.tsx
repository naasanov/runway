import { Nav } from "@/components/nav";
import {
  AlertTriangle,
  Calendar,
  TrendingDown,
  Zap,
} from "lucide-react";

const UPCOMING = [
  { label: "Payroll", date: "Mar 28", amount: 3800, danger: true },
  { label: "Insurance", date: "Mar 28", amount: 1200, danger: true },
  { label: "Rent", date: "Apr 1", amount: 2400, danger: false },
];

const ALERTS = [
  {
    severity: "red" as const,
    headline: "You may miss payroll in 9 days.",
    detail: "Projected shortfall of $2,200 by March 28 without intervention.",
  },
  {
    severity: "amber" as const,
    headline: "Durham Catering invoice is 12 days overdue.",
    detail: "Collecting $3,200 would fully cover the expected shortfall.",
  },
  {
    severity: "amber" as const,
    headline: "Duplicate scheduling subscriptions detected.",
    detail: "Cancel one tool to save roughly $1,068 per year.",
  },
  {
    severity: "red" as const,
    headline: "Revenue concentration risk is high.",
    detail: "Over 60% of trailing revenue comes from one customer.",
  },
];

const ACTIONS = [
  {
    action: "Collect Durham Catering invoice ($3,200)",
    impact: "Covers projected payroll shortfall and adds cushion.",
    cta: "Send reminder",
  },
  {
    action: "Cancel one scheduling tool",
    impact: "Saves around $89/month in recurring spend.",
    cta: "Review tools",
  },
  {
    action: "Delay next flour payment by 5 days",
    impact: "Helps bridge the payroll + insurance overlap week.",
  },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background pb-mobile-nav">
      <Nav businessId="sweet-grace-bakery" />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Page header */}
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Sweet Grace Bakery · Cash flow overview</p>
        </header>

        {/* Headline metric */}
        <section className="rounded-2xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 p-6">
          <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
            Cash Runway
          </p>
          <p className="text-5xl font-bold text-red-700 dark:text-red-300 mb-2">
            9 days
          </p>
          <p className="text-red-800 dark:text-red-200 font-semibold text-lg max-w-prose">
            You will miss payroll on March 28th.
          </p>
          <p className="text-sm text-red-700/70 dark:text-red-300/70 mt-1 max-w-prose">
            Current balance: $4,200 · Projected shortfall: $2,200
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cash forecast chart placeholder */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingDown className="size-4" />
                  30-Day Cash Forecast
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Projected balance day-by-day
                </p>
              </div>
            </div>
            {/* Simple cash flow visualization */}
            <div className="h-48 relative">
              <svg className="w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
                {/* Grid lines */}
                <line x1="0" y1="75" x2="400" y2="75" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4" />
                <line x1="0" y1="37.5" x2="400" y2="37.5" stroke="currentColor" strokeOpacity="0.05" strokeDasharray="4" />
                <line x1="0" y1="112.5" x2="400" y2="112.5" stroke="currentColor" strokeOpacity="0.05" strokeDasharray="4" />

                {/* Danger zone */}
                <rect x="0" y="100" width="400" height="50" fill="rgb(239 68 68)" fillOpacity="0.1" />

                {/* Cash flow line */}
                <path
                  d="M 0,30 Q 50,25 100,35 T 200,50 T 300,90 T 350,110 L 400,130"
                  fill="none"
                  stroke="rgb(239 68 68)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Data points */}
                <circle cx="0" cy="30" r="4" fill="rgb(34 197 94)" />
                <circle cx="100" cy="35" r="4" fill="rgb(34 197 94)" />
                <circle cx="200" cy="50" r="4" fill="rgb(234 179 8)" />
                <circle cx="300" cy="90" r="4" fill="rgb(234 179 8)" />
                <circle cx="350" cy="110" r="4" fill="rgb(239 68 68)" />
              </svg>

              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-muted-foreground py-1">
                <span>$8k</span>
                <span>$4k</span>
                <span className="text-red-500">$0</span>
              </div>

              {/* X-axis labels */}
              <div className="absolute bottom-0 left-8 right-0 flex justify-between text-[10px] text-muted-foreground">
                <span>Today</span>
                <span>Week 2</span>
                <span>Week 3</span>
                <span className="text-red-500">Mar 28</span>
              </div>
            </div>
          </div>

          {/* Upcoming obligations */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Calendar className="size-4" />
              Upcoming Obligations
            </h2>
            <div className="space-y-3">
              {UPCOMING.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.date}</p>
                  </div>
                  <span className={`font-semibold tabular-nums ${item.danger ? "text-red-600" : ""}`}>
                    ${item.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Active alerts */}
        <section>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <AlertTriangle className="size-4" />
            Active Alerts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ALERTS.map((alert) => (
              <AlertCard key={alert.headline} {...alert} />
            ))}
          </div>
        </section>

        {/* Recommended actions */}
        <section>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Zap className="size-4" />
            Recommended Actions
          </h2>
          <div className="space-y-3">
            {ACTIONS.map((action, i) => (
              <div
                key={i}
                className="flex items-start gap-4 rounded-xl border border-border bg-card p-4"
              >
                <span className="size-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{action.action}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{action.impact}</p>
                </div>
                {action.cta && (
                  <button className="shrink-0 text-xs px-4 py-2.5 min-h-[44px] rounded-lg border border-border hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    {action.cta}
                  </button>
                )}
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
  severity: "red" | "amber" | "green";
  headline: string;
  detail: string;
}) {
  const colors = {
    red: "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20",
    amber: "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20",
    green: "border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-950/20",
  };
  const dotColors = {
    red: "bg-red-500",
    amber: "bg-amber-400",
    green: "bg-green-500",
  };

  const isRed = severity === "red";

  return (
    <div className={`rounded-xl border p-4 ${colors[severity]} ${isRed ? "ring-1 ring-red-300 dark:ring-red-800" : ""}`}>
      <div className="flex items-center gap-2.5 mb-1.5">
        <span className={`size-3 rounded-full ${dotColors[severity]} ${isRed ? "animate-pulse" : ""}`} />
        <p className={`font-semibold ${isRed ? "text-base" : "text-sm"}`}>{headline}</p>
      </div>
      <p className="text-sm text-muted-foreground pl-5 max-w-prose">{detail}</p>
    </div>
  );
}
