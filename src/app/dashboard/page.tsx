import { Nav } from "@/components/nav";
import { AlertTriangle, TrendingDown, Calendar, Zap } from "lucide-react";

export default function DashboardPage() {
  // businessId will be read from searchParams when wired up
  return (
    <div className="min-h-screen bg-background">
      <Nav businessId="sweet-grace-bakery" />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Headline metric */}
        <section className="rounded-2xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 p-6">
          <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
            Cash Runway
          </p>
          <p className="text-5xl font-bold text-red-700 dark:text-red-300 mb-2">
            9 days
          </p>
          <p className="text-red-800 dark:text-red-200 font-semibold text-lg">
            You will miss payroll on March 28th.
          </p>
          <p className="text-sm text-red-700/70 dark:text-red-300/70 mt-1">
            Current balance: $4,200 · Projected shortfall: $2,200
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cash forecast chart placeholder */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold flex items-center gap-2">
                  <TrendingDown className="size-4" />
                  30-Day Cash Forecast
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Projected balance day-by-day
                </p>
              </div>
            </div>
            {/* Chart will be implemented here */}
            <div className="h-48 rounded-lg bg-muted/50 flex items-center justify-center text-sm text-muted-foreground">
              Chart component — coming soon
            </div>
          </div>

          {/* Upcoming obligations */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
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
                  <span className={`font-semibold ${item.danger ? "text-red-600" : ""}`}>
                    ${item.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Active alerts */}
        <section>
          <h2 className="font-semibold flex items-center gap-2 mb-4">
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
          <h2 className="font-semibold flex items-center gap-2 mb-4">
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
                  <button className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
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

  return (
    <div className={`rounded-xl border p-4 ${colors[severity]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`size-2 rounded-full ${dotColors[severity]}`} />
        <p className="text-sm font-semibold">{headline}</p>
      </div>
      <p className="text-sm text-muted-foreground pl-4">{detail}</p>
    </div>
  );
}

const UPCOMING = [
  { label: "Payroll", date: "Mar 28", amount: 3800, danger: true },
  { label: "Insurance (quarterly)", date: "Mar 28", amount: 1200, danger: true },
  { label: "Rent", date: "Apr 1", amount: 2400, danger: false },
  { label: "King Arthur Flour", date: "Apr 3", amount: 1600, danger: false },
  { label: "Packaging", date: "Apr 5", amount: 400, danger: false },
];

const ALERTS = [
  {
    severity: "red" as const,
    headline: "Runway: 9 days",
    detail:
      "At current burn rate, projected balance goes negative on Mar 28. Payroll + insurance + rent hit the same week.",
  },
  {
    severity: "red" as const,
    headline: "Overdue invoice: $3,200",
    detail:
      "Durham Catering owes $3,200 — 12 days overdue. Collecting this resolves the shortfall.",
  },
  {
    severity: "amber" as const,
    headline: "Subscription waste: $134/mo",
    detail:
      "You're paying for Acuity ($89) and Calendly ($45) — both scheduling tools. Cancel one, save $1,068/year.",
  },
  {
    severity: "amber" as const,
    headline: "Revenue concentration: 68%",
    detail:
      "Durham Catering accounts for 68% of revenue in the last 90 days. High churn risk if this client leaves.",
  },
];

const ACTIONS = [
  {
    action: "Collect $3,200 from Durham Catering — invoice is 12 days overdue",
    impact: "Resolves the Mar 28 shortfall entirely",
    cta: "Send reminder",
  },
  {
    action: "Cancel Calendly ($45/mo) — you already pay for Acuity",
    impact: "Saves $540/year with no functionality loss",
    cta: undefined,
  },
  {
    action: "Delay King Arthur Flour order by 5 days",
    impact: "Supplier allows Net 30 — you've been paying Net 15. Saves $1,600 cash buffer this cycle.",
    cta: undefined,
  },
];
