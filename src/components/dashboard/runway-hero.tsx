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
      className="bg-runway-card border border-runway-border rounded-xl p-5 shrink-0 animate-fade-in stagger-1"
      style={{
        background:
          "radial-gradient(ellipse at 15% 50%, rgba(255, 176, 32, 0.04) 0%, transparent 50%), #0C1220",
      }}
    >
      <div className="flex items-center justify-between">
        {/* Left — runway counter */}
        <div className="flex items-baseline gap-3">
          <span className="text-[80px] leading-none font-display font-extrabold text-runway-warning tabular-nums tracking-tighter">
            {count}
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-runway-text tracking-wide uppercase font-display">
              Days of Cash
            </span>
            <span className="text-xs text-runway-muted mt-0.5">
              at current burn rate
            </span>
          </div>
        </div>

        {/* Right — key metrics */}
        <div className="flex items-center gap-5">
          <StatBlock
            icon={Wallet}
            label="Balance"
            value="$6,840"
            color="text-runway-positive"
          />
          <div className="w-px h-10 bg-runway-border" />
          <StatBlock
            icon={TrendingDown}
            label="Shortfall Mar 28"
            value="-$2,200"
            color="text-runway-danger"
          />
          <div className="w-px h-10 bg-runway-border" />
          <StatBlock
            icon={FileText}
            label="Unpaid Invoice"
            value="$3,200"
            color="text-runway-warning"
          />
        </div>
      </div>

      {/* Danger banner */}
      <div className="mt-3 flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-runway-danger/10 border border-runway-danger/20 animate-pulse-glow">
        <AlertTriangle
          size={14}
          className="text-runway-danger shrink-0 animate-subtle-pulse"
        />
        <span className="text-[13px] font-serif italic text-runway-danger">
          You will miss payroll in 7 days
        </span>
        <span className="text-xs text-runway-muted ml-0.5">
          — projected $2,200 shortfall on March 28
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
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <Icon size={11} className="text-runway-muted" />
        <span className="text-[10px] text-runway-muted uppercase tracking-wider font-medium">
          {label}
        </span>
      </div>
      <span className={`text-xl font-mono font-semibold tabular-nums ${color}`}>
        {value}
      </span>
    </div>
  );
}
