import Link from "next/link";
import { Plane } from "lucide-react";

export function Nav({ businessId }: { businessId?: string }) {
  return (
    <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
          <Plane className="size-4" />
          Runway
        </Link>

        {businessId && (
          <div className="flex items-center gap-1 text-sm">
            <Link
              href={`/dashboard?b=${businessId}`}
              className="px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href={`/alerts?b=${businessId}`}
              className="px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              Alerts
            </Link>
            <Link
              href={`/scenarios?b=${businessId}`}
              className="px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              Scenarios
            </Link>
          </div>
        )}

        {!businessId && (
          <Link
            href="/connect"
            className="text-sm px-4 py-1.5 rounded-lg bg-foreground text-background hover:bg-foreground/80 transition-colors font-medium"
          >
            Get started
          </Link>
        )}
      </div>
    </nav>
  );
}
