import {
  AlertTriangle,
  CreditCard,
  Users,
  ArrowRight,
  Send,
} from "lucide-react";

const alerts = [
  {
    severity: "critical" as const,
    icon: AlertTriangle,
    title: "Payroll shortfall in 7 days",
    detail:
      "Projected -$2,200 on Mar 28. You need $9,350 but will only have ~$7,150.",
    action: "Send invoice reminder",
    actionIcon: Send,
  },
  {
    severity: "warning" as const,
    icon: CreditCard,
    title: "Duplicate subscriptions",
    detail:
      "Toast POS & Square POS — $134/mo in overlapping charges detected.",
    action: "Review subscriptions",
    actionIcon: ArrowRight,
  },
  {
    severity: "warning" as const,
    icon: Users,
    title: "72% revenue concentration",
    detail:
      "Durham Catering Co. = 72% of wholesale revenue. $3,200 invoice is 14 days overdue.",
    action: "View details",
    actionIcon: ArrowRight,
  },
];

const styles = {
  critical: {
    border: "border-l-runway-danger",
    bg: "bg-runway-danger/5",
    icon: "text-runway-danger",
  },
  warning: {
    border: "border-l-runway-warning",
    bg: "bg-runway-warning/5",
    icon: "text-runway-warning",
  },
};

export function AlertsPanel() {
  return (
    <div className="bg-runway-card border border-runway-border rounded-xl p-4 flex flex-col h-full animate-fade-in stagger-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-runway-text font-display">
          Active Alerts
        </h3>
        <span className="px-2 py-0.5 rounded-full bg-runway-danger/15 text-runway-danger text-[11px] font-bold tabular-nums">
          3
        </span>
      </div>

      <div className="flex flex-col gap-2 flex-1 overflow-y-auto runway-scroll">
        {alerts.map((alert, i) => {
          const s = styles[alert.severity];
          return (
            <div
              key={i}
              className={`${s.bg} border-l-2 ${s.border} rounded-r-lg p-3 hover:bg-runway-card-hover transition-colors duration-200`}
            >
              <div className="flex items-start gap-2.5">
                <alert.icon
                  size={14}
                  className={`${s.icon} mt-0.5 shrink-0`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-runway-text leading-snug">
                    {alert.title}
                  </p>
                  <p className="text-[11px] text-runway-muted leading-relaxed mt-1">
                    {alert.detail}
                  </p>
                  <button className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-runway-accent hover:text-runway-accent/80 transition-colors">
                    {alert.action}
                    <alert.actionIcon size={10} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
