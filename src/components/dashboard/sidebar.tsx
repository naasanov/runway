import {
  LayoutDashboard,
  ArrowLeftRight,
  Bell,
  Layers,
  Settings,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: ArrowLeftRight, label: "Transactions" },
  { icon: Bell, label: "Alerts" },
  { icon: Layers, label: "Scenarios" },
];

export function Sidebar() {
  return (
    <aside className="w-14 h-screen bg-runway-card border-r border-runway-border flex flex-col items-center py-4 shrink-0">
      {/* Logo mark */}
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-runway-accent to-runway-positive flex items-center justify-center mb-8">
        <span className="text-[11px] font-extrabold text-white font-display tracking-tighter">
          R
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col items-center gap-1 flex-1">
        {navItems.map(({ icon: Icon, label, active }) => (
          <button
            key={label}
            className={`
              relative w-10 h-10 rounded-lg flex items-center justify-center
              transition-all duration-200
              ${
                active
                  ? "bg-runway-accent/10 text-runway-accent"
                  : "text-runway-muted hover:text-runway-text-secondary hover:bg-white/[0.03]"
              }
            `}
            title={label}
          >
            {active && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-runway-accent rounded-r-full" />
            )}
            <Icon size={18} strokeWidth={active ? 2 : 1.5} />
          </button>
        ))}
      </nav>

      {/* Settings */}
      <button
        className="w-10 h-10 rounded-lg flex items-center justify-center text-runway-muted hover:text-runway-text-secondary hover:bg-white/[0.03] transition-all duration-200"
        title="Settings"
      >
        <Settings size={18} strokeWidth={1.5} />
      </button>
    </aside>
  );
}
