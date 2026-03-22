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
    tag: "mar_28",
    amount: "-$2,200",
    action: "Send invoice reminder",
    actionIcon: Send,
  },
  {
    severity: "warning" as const,
    icon: CreditCard,
    title: "Duplicate subscriptions",
    detail:
      "Toast POS & Square POS — $134/mo in overlapping charges detected.",
    tag: "recurring",
    amount: "-$134/mo",
    action: "Review subscriptions",
    actionIcon: ArrowRight,
  },
  {
    severity: "warning" as const,
    icon: Users,
    title: "72% revenue concentration",
    detail:
      "Durham Catering Co. = 72% of wholesale revenue. $3,200 invoice is 14 days overdue.",
    tag: "overdue_14d",
    amount: "$3,200",
    action: "View details",
    actionIcon: ArrowRight,
  },
];

const styles = {
  critical: {
    accent: "border-l-runway-danger",
    bg: "bg-runway-danger/5",
    icon: "text-runway-danger",
    iconBg: "bg-runway-danger/10 border border-runway-danger/20",
    tag: "text-runway-danger border-runway-danger/20 bg-runway-danger/5",
    dot: "bg-red-500 animate-pulse",
  },
  warning: {
    accent: "border-l-runway-warning",
    bg: "bg-runway-warning/5",
    icon: "text-runway-warning",
    iconBg: "bg-runway-warning/10 border border-runway-warning/20",
    tag: "text-runway-warning border-runway-warning/20 bg-runway-warning/5",
    dot: "bg-amber-400",
  },
};

export function AlertsPanel() {
  return (
    <div className="bg-runway-card border border-runway-border rounded-xl flex flex-col h-full animate-fade-in stagger-3">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-runway-border/50">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-runway-muted tracking-[0.15em]">#03 ·</span>
          <h3 className="text-xs font-semibold text-runway-text-secondary uppercase tracking-[0.1em]">
            Active Alerts
          </h3>
        </div>
        <span className="px-2 py-0.5 border border-runway-danger/20 bg-runway-danger/10 text-runway-danger text-[10px] font-mono font-bold tabular-nums">
          {alerts.length}
        </span>
      </div>

      <div className="flex flex-col flex-1 overflow-y-auto runway-scroll divide-y divide-runway-border/40">
        {alerts.map((alert, i) => {
          const s = styles[alert.severity];
          return (
            <div
              key={i}
              className={`${s.bg} border-l-4 ${s.accent} px-4 py-3.5 hover:bg-runway-card-hover transition-colors duration-200`}
            >
              <div className="flex items-start gap-3">
                {/* Icon square */}
                <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${s.iconBg}`}>
                  <alert.icon size={13} className={s.icon} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-xs font-semibold text-runway-text leading-snug">
                      {alert.title}
                    </p>
                    <span className={`text-xs font-mono font-bold tabular-nums shrink-0 ${s.icon}`}>
                      {alert.amount}
                    </span>
                  </div>
                  <p className="text-[11px] text-runway-muted leading-relaxed mb-2">
                    {alert.detail}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 border tracking-wider ${s.tag}`}>
                      {alert.tag}
                    </span>
                    <button className="inline-flex items-center gap-1 text-[11px] font-semibold text-runway-accent hover:text-runway-accent/80 transition-colors ml-auto">
                      {alert.action}
                      <alert.actionIcon size={10} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
