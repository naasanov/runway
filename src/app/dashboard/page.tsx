import { Sidebar } from "@/components/dashboard/sidebar";
import { TopBar } from "@/components/dashboard/top-bar";
import { RunwayHero } from "@/components/dashboard/runway-hero";
import { CashForecast } from "@/components/dashboard/cash-forecast";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { ObligationsTable } from "@/components/dashboard/obligations-table";

export default function DashboardPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-runway-bg">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />

        <main className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
          {/* Hero — runway countdown + key metrics */}
          <RunwayHero />

          {/* Middle — forecast chart + active alerts */}
          <div className="flex gap-3 flex-1 min-h-0">
            <div className="flex-[3] min-w-0">
              <CashForecast />
            </div>
            <div className="flex-[2] min-w-0">
              <AlertsPanel />
            </div>
          </div>

          {/* Bottom — upcoming obligations */}
          <ObligationsTable />
        </main>
      </div>
    </div>
  );
}
