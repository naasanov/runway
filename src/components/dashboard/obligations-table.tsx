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
    row: "bg-runway-danger/10 border-runway-danger/20",
    text: "text-runway-danger",
    amount: "text-runway-danger",
  },
  warning: {
    row: "bg-runway-warning/5 border-runway-warning/15",
    text: "text-runway-text",
    amount: "text-runway-warning",
  },
  normal: {
    row: "bg-runway-bg/40 border-runway-border/50",
    text: "text-runway-text",
    amount: "text-runway-text-secondary",
  },
};

export function ObligationsTable() {
  return (
    <div className="bg-runway-card border border-runway-border rounded-xl p-4 shrink-0 animate-fade-in stagger-4">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-semibold text-runway-text font-display">
            Upcoming Obligations
          </h3>
          <span className="text-[11px] text-runway-muted">Next 14 days</span>
        </div>
        <span className="text-xs text-runway-muted font-mono tabular-nums">
          ${total.toLocaleString()} total
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {obligations.map((item, i) => {
          const s = typeStyles[item.type];
          return (
            <div
              key={i}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border ${s.row}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {item.type === "danger" ? (
                  <AlertCircle
                    size={12}
                    className="text-runway-danger shrink-0"
                  />
                ) : (
                  <Calendar size={12} className="text-runway-muted shrink-0" />
                )}
                <span className={`text-xs font-medium truncate ${s.text}`}>
                  {item.name}
                </span>
                <span className="text-[10px] text-runway-muted shrink-0">
                  {item.date}
                </span>
              </div>
              <span
                className={`text-xs font-mono font-semibold tabular-nums ml-3 ${s.amount}`}
              >
                ${item.amount.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
