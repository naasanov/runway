import Link from "next/link";
import { Plane, TrendingDown, Bell, Zap, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <Plane className="size-4" />
            Runway
          </div>
          <Link
            href="/connect"
            className="text-sm px-4 py-2.5 bg-foreground text-background hover:bg-foreground/80 transition-colors font-medium inline-flex items-center"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <p className="text-[11px] font-mono text-muted-foreground tracking-[0.2em] uppercase mb-6">
          Financial Intelligence / 2026
        </p>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground max-w-3xl leading-[1.1]">
          Know before your
          <br />
          <span className="font-extrabold text-foreground">money runs out.</span>
        </h1>

        <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
          Runway is an AI-powered cash flow intelligence engine for small
          business owners. It tells you — in plain language, via text — when
          something is about to go wrong.{" "}
          <span className="text-foreground font-medium">9 days before it happens.</span>
        </p>

        <div className="mt-10 flex items-center gap-4 flex-wrap justify-center">
          <Link
            href="/connect"
            className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-semibold hover:bg-foreground/80 transition-colors text-sm"
          >
            Connect your Stripe
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/connect"
            className="inline-flex items-center gap-2 px-6 py-3 border border-border text-foreground font-semibold hover:bg-muted transition-colors text-sm"
          >
            View demo flow
          </Link>
        </div>

        {/* Alert preview */}
        <div className="mt-16 max-w-sm w-full mx-auto">
          <div className="border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 p-5 text-left">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 size-8 border border-red-200 dark:border-red-900/40 flex items-center justify-center shrink-0">
                <Bell className="size-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-[10px] font-mono text-red-500 uppercase tracking-[0.15em] mb-1">
                  {"// runway_alert"}
                </p>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  Sweet Grace Bakery
                </p>
                <p className="text-sm text-red-800 dark:text-red-300 mt-1 leading-snug">
                  Projected cash shortfall of $2,200 in{" "}
                  <strong>9 days</strong>. You may not make payroll on March 28.
                </p>
                <p className="text-[10px] font-mono text-red-500 dark:text-red-500 mt-2 tracking-wider">
                  SMS · 2:14 AM
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
            This text goes out automatically. No dashboard required.
          </p>
        </div>
      </section>

      {/* Stat credibility bar */}
      <section className="border-t border-b border-border">
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4">
          <StatCell value="82%" label="of business failures caused by poor cash flow" />
          <StatCell value="$150K+" label="annual cost of a full-time CFO" />
          <StatCell value="9 days" label="average lead time before a cash crisis" />
          <StatCell value="33M" label="small businesses with no forward-looking intelligence" last />
        </div>
      </section>

      {/* Features — border grid, no card backgrounds */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] uppercase mb-4">
            {"// what_we_do"}
          </p>
          <h2 className="text-2xl font-bold mb-1 tracking-tight">
            QuickBooks tells you what happened.
          </h2>
          <p className="text-muted-foreground mb-12">
            Runway tells you what&apos;s about to happen.
          </p>

          <div className="border border-border grid grid-cols-1 sm:grid-cols-3">
            <FeatureCell
              icon={<TrendingDown className="size-5" />}
              title="Cash Flow Forecast"
              body="Day-by-day projection of your cash position for the next 30/60/90 days. See the exact date your balance goes negative — before it does."
            />
            <FeatureCell
              icon={<Bell className="size-5" />}
              title="SMS Alerts"
              body="Plain-language warnings sent to your phone the moment risk is detected. No dashboard required. No jargon. Just what you need to know."
            />
            <FeatureCell
              icon={<Zap className="size-5" />}
              title="Actionable Fixes"
              body="Not just warnings — specific steps. Collect this invoice. Cancel that subscription. Delay this payment 5 days. With dollar-amount impact."
              last
            />
          </div>
        </div>
      </section>

      {/* Statement section */}
      <section className="border-t border-border py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] uppercase mb-8">
            {"// the_inflection_point"}
          </p>
          <h2 className="text-4xl sm:text-5xl font-display font-extrabold leading-[1.1] tracking-tight max-w-3xl">
            Know before the crisis.
            <br />
            Act before it&apos;s too late.
          </h2>
          <p className="mt-6 text-muted-foreground max-w-xl leading-relaxed">
            Every missed payroll, every overdraft, every emergency loan — they
            all had warning signs days in advance. Runway reads them for you.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border py-24 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] uppercase mb-2">
              {"// get_started"}
            </p>
            <p className="text-xl font-bold tracking-tight">
              See the payroll miss coming before it happens.
            </p>
          </div>
          <Link
            href="/connect"
            className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-semibold hover:bg-foreground/80 transition-colors text-sm shrink-0"
          >
            Connect Sweet Grace Bakery
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-6 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-xs font-mono text-muted-foreground tracking-wider">
            Runway · HackDuke 2026
          </span>
          <span className="text-xs text-muted-foreground">AI for Finance Track</span>
        </div>
      </footer>
    </div>
  );
}

function StatCell({
  value,
  label,
  last,
}: {
  value: string;
  label: string;
  last?: boolean;
}) {
  return (
    <div
      className={`py-8 px-8 ${!last ? "border-r border-border sm:border-r" : ""} border-b sm:border-b-0 border-border`}
    >
      <p className="text-3xl font-bold font-display tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{label}</p>
    </div>
  );
}

function FeatureCell({
  icon,
  title,
  body,
  last,
}: {
  icon: ReturnType<typeof Plane>;
  title: string;
  body: string;
  last?: boolean;
}) {
  return (
    <div
      className={`p-8 ${!last ? "border-b sm:border-b-0 sm:border-r border-border" : ""}`}
    >
      <div className="size-8 border border-border flex items-center justify-center mb-5 text-foreground">
        {icon}
      </div>
      <p className="text-[10px] font-mono text-muted-foreground tracking-[0.15em] uppercase mb-2">
        {title.toLowerCase().replace(/ /g, "_")}
      </p>
      <h3 className="font-semibold mb-2 tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}
