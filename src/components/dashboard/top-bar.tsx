import { Zap, Circle } from "lucide-react";

export function TopBar() {
  return (
    <header className="h-12 border-b border-runway-border bg-runway-bg/80 backdrop-blur-sm flex items-center justify-between px-5 shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-runway-text font-display tracking-wide">
          Sweet Grace Bakery
        </h1>
        <div className="w-px h-4 bg-runway-border" />
        <span className="text-xs text-runway-muted">Durham, NC</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-runway-muted">
          <Circle size={6} fill="#00D68F" stroke="none" />
          Synced 3m ago
        </div>

        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#635BFF]/10 border border-[#635BFF]/20 text-[#A29BFE] text-xs font-medium hover:bg-[#635BFF]/20 transition-colors">
          <Zap size={12} />
          Connect Stripe
        </button>

        <div className="w-7 h-7 rounded-full bg-runway-border flex items-center justify-center">
          <span className="text-[10px] font-semibold text-runway-text-secondary">
            SG
          </span>
        </div>
      </div>
    </header>
  );
}
