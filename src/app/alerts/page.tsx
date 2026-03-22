import { Nav } from "@/components/nav";
import { Bell, MessageSquare } from "lucide-react";

export default function AlertsPage() {
  return (
    <div className="min-h-screen bg-background pb-mobile-nav">
      <Nav businessId="sweet-grace-bakery" />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="size-5" />
            Alert History
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            All alerts sent for Sweet Grace Bakery
          </p>
        </div>

        <div className="space-y-3">
          {ALERT_HISTORY.map((alert, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 size-2.5 rounded-full shrink-0 ${
                      alert.severity === "red"
                        ? "bg-red-500"
                        : alert.severity === "amber"
                          ? "bg-amber-400"
                          : "bg-green-500"
                    }`}
                  />
                  <div>
                    <p className="font-medium text-sm">{alert.headline}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {alert.detail}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">{alert.date}</p>
                  {alert.smsSent && (
                    <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1 justify-end">
                      <MessageSquare className="size-3" />
                      SMS sent
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

const ALERT_HISTORY = [
  {
    severity: "red",
    headline: "Runway: 9 days — payroll at risk Mar 28",
    detail:
      "Projected cash shortfall of $2,200. Payroll ($3,800), insurance ($1,200), and rent ($2,400) all due same week.",
    date: "Mar 19, 2:14 AM",
    smsSent: true,
  },
  {
    severity: "red",
    headline: "Overdue invoice: Durham Catering — $3,200 (12 days overdue)",
    detail:
      "Invoice issued Mar 7. Payment not received. Collecting this resolves the March 28 shortfall.",
    date: "Mar 19, 2:14 AM",
    smsSent: false,
  },
  {
    severity: "amber",
    headline: "Subscription overlap detected: scheduling tools",
    detail:
      "Acuity Scheduling ($89/mo) and Calendly ($45/mo) serve the same purpose. Cancel one to save $1,068/year.",
    date: "Mar 19, 2:14 AM",
    smsSent: false,
  },
  {
    severity: "amber",
    headline: "Revenue concentration: Durham Catering at 68% of 90-day revenue",
    detail:
      "Single-client dependency above 60% threshold. High churn risk if this client churns.",
    date: "Mar 19, 2:14 AM",
    smsSent: false,
  },
  {
    severity: "amber",
    headline: "Runway below 60 days",
    detail:
      "Cash runway dropped to 47 days — amber threshold crossed. No immediate action required.",
    date: "Mar 12, 9:01 AM",
    smsSent: false,
  },
  {
    severity: "green",
    headline: "Wholesale payment received: Durham Catering — $2,800",
    detail: "Monthly wholesale payment received on time. Runway extended by 4 days.",
    date: "Mar 5, 11:42 AM",
    smsSent: false,
  },
];
