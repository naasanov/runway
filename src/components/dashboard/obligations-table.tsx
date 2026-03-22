import { AlertCircle, Calendar } from "lucide-react";

const obligations = [
  { name: "Payroll", date: "Mar 28", amount: 9350, type: "danger" as const },
  { name: "Sysco Foods", date: "Mar 29", amount: 1240, type: "normal" as const },
  { name: "Durham Energy", date: "Mar 31", amount: 340, type: "normal" as const },
  {
    name: "Lease — W Main St",
    date: "Apr 1",
    amount: 2600,
    type: "warning" as const,
  },
  { name: "State Farm", date: "Apr 3", amount: 450, type: "normal" as const },
  {
    name: "Equipment lease",
    date: "Apr 5",
    amount: 285,
    type: "normal" as const,
  },
];

const total = obligations.reduce((s, o) => s + o.amount, 0);

const typeStyles = {
  danger: {
    accent: "border-l-runway-danger",
    bg: "bg-runway-danger/8",
    num: "text-runway-danger",
    amount: "text-runway-danger",
    date: "text-runway-danger/70",
  },
  warning: {
    accent: "border-l-runway-warning",
    bg: "bg-runway-warning/5",
    num: "text-runway-warning",
    amount: "text-runway-warning",
    date: "text-runway-muted",
  },
  normal: {
    accent: "border-l-transparent",
    bg: "",
    num: "text-runway-muted",
    amount: "text-runway-text-secondary",
    date: "text-runway-muted",
  },
};

export function ObligationsTable() {
  return (
    <div className="bg-runway-card border border-runway-border rounded-xl flex flex-col shrink-0 animate-fade-in stagger-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-runway-border/50">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-runway-muted tracking-[0.15em]">#04 ·</span>
          <h3 className="text-xs font-semibold text-runway-text-secondary uppercase tracking-[0.1em]">
            Upcoming Obligations
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-runway-muted">14 days</span>
          <span className="text-xs font-mono font-semibold text-runway-text tabular-nums">
            ${total.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="divide-y divide-runway-border/40">
        {obligations.map((item, i) => {
          const s = typeStyles[item.type];
          return (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-3 border-l-2 ${s.accent} ${s.bg} hover:bg-runway-card-hover transition-colors`}
            >
              {/* Rank number */}
              <span className={`text-[10px] font-mono tabular-nums w-4 shrink-0 ${s.num}`}>
                {String(i + 1).padStart(2, "0")}
              </span>

              {/* Icon */}
              {item.type === "danger" ? (
                <AlertCircle size={11} className="text-runway-danger shrink-0" />
              ) : (
                <Calendar size={11} className="text-runway-muted shrink-0" />
              )}

              {/* Name */}
              <span className="text-xs font-medium text-runway-text truncate flex-1">
                {item.name}
              </span>

              {/* Date badge */}
              <span className={`text-[10px] font-mono shrink-0 ${s.date}`}>
                {item.date}
              </span>

              {/* Amount */}
              <span className={`text-sm font-mono font-bold tabular-nums shrink-0 ${s.amount}`}>
                ${item.amount.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
