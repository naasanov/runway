"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, TrendingDown, FileText, Wallet } from "lucide-react";

export function RunwayHero() {
  const targetDays = 47;
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const startTime = performance.now();

    function step(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * targetDays));
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }, []);

  return (
    <div
      className="bg-runway-card border border-runway-border rounded-xl p-5 shrink-0 animate-fade-in stagger-1 border-l-4 border-l-runway-warning"
      style={{
        background:
          "radial-gradient(ellipse at 15% 50%, rgba(255, 176, 32, 0.10) 0%, transparent 55%), #0C1220",
      }}
    >
      {/* Label */}
      <p className="text-[10px] font-mono text-runway-muted tracking-[0.2em] uppercase mb-3">
        #01 · cash_runway
      </p>

      <div className="flex items-start justify-between gap-4">
        {/* Left — runway counter */}
        <div className="flex items-baseline gap-3">
          <span className="text-[80px] leading-none font-display font-extrabold text-runway-warning tabular-nums tracking-tighter">
            {count}
          </span>
          <div className="flex flex-col pb-2">
            <span className="text-sm font-semibold text-runway-text tracking-wide uppercase font-display">
              Days of Cash
            </span>
            <span className="text-xs text-runway-muted mt-0.5">
              at current burn rate
            </span>
            <span className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 border border-runway-warning/30 bg-runway-warning/10 w-fit">
              <span className="text-[10px] font-mono font-bold text-runway-warning uppercase tracking-wider">
                warning
              </span>
            </span>
          </div>
        </div>

        {/* Right — key metrics */}
        <div className="flex items-stretch gap-0 border border-runway-border divide-x divide-runway-border">
          <StatBlock
            icon={Wallet}
            label="Balance"
            value="$6,840"
            color="text-runway-positive"
          />
          <StatBlock
            icon={TrendingDown}
            label="Shortfall Mar 28"
            value="-$2,200"
            color="text-runway-danger"
          />
          <StatBlock
            icon={FileText}
            label="Unpaid Invoice"
            value="$3,200"
            color="text-runway-warning"
          />
        </div>
      </div>

      {/* Danger banner */}
      <div className="mt-4 flex items-center gap-2.5 px-3.5 py-2.5 border border-runway-danger/20 bg-runway-danger/10 animate-pulse-glow">
        <AlertTriangle
          size={14}
          className="text-runway-danger shrink-0 animate-subtle-pulse"
        />
        <span className="text-[13px] font-serif italic text-runway-danger">
          You will miss payroll in 7 days
        </span>
        <span className="text-[10px] font-mono text-runway-muted ml-1 tracking-wider">
          — projected $2,200 shortfall · Mar 28
        </span>
      </div>
    </div>
  );
}

function StatBlock({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-end gap-1.5 px-4 py-3">
      <div className="flex items-center gap-1.5">
        <Icon size={10} className="text-runway-muted" />
        <span className="text-[9px] text-runway-muted uppercase tracking-[0.15em] font-mono">
          {label}
        </span>
      </div>
      <span className={`text-2xl font-mono font-bold tabular-nums ${color}`}>
        {value}
      </span>
    </div>
  );
}
