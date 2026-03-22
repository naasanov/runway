import { RunwayLogoIcon } from "@/components/runway-logo";
import Link from "next/link";
import { Bell, LayoutDashboard, Sliders } from "lucide-react";

export function Nav({ businessId }: { businessId?: string }) {
  return (
    <>
      {/* Desktop/tablet nav - top bar */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-foreground min-h-[44px] px-2 -ml-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <RunwayLogoIcon className="size-8" />
            Runway
          </Link>

          {/* Desktop navigation links */}
          {businessId && (
            <div className="hidden md:flex items-center gap-1 text-sm">
              <Link
                href={`/dashboard?b=${businessId}`}
                className="px-4 py-2.5 min-h-[44px] flex items-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Dashboard
              </Link>
              <Link
                href={`/alerts?b=${businessId}`}
                className="px-4 py-2.5 min-h-[44px] flex items-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Alerts
              </Link>
              <Link
                href={`/scenarios?b=${businessId}`}
                className="px-4 py-2.5 min-h-[44px] flex items-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Scenarios
              </Link>
            </div>
          )}

          {!businessId && (
            <Link
              href="/connect"
              className="text-sm px-4 py-2.5 min-h-[44px] flex items-center rounded-lg bg-foreground text-background hover:bg-foreground/80 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Get started
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      {businessId && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm safe-area-pb">
          <div className="flex items-stretch justify-around h-16">
            <Link
              href={`/dashboard?b=${businessId}`}
              className="flex-1 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <LayoutDashboard className="size-5" />
              <span className="text-[10px] font-medium">Dashboard</span>
            </Link>
            <Link
              href={`/alerts?b=${businessId}`}
              className="flex-1 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <Bell className="size-5" />
              <span className="text-[10px] font-medium">Alerts</span>
            </Link>
            <Link
              href={`/scenarios?b=${businessId}`}
              className="flex-1 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <Sliders className="size-5" />
              <span className="text-[10px] font-medium">Scenarios</span>
            </Link>
          </div>
        </nav>
      )}
    </>
  );
}
