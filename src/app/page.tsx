import Link from "next/link";
import { Plane, TrendingDown, Bell, Zap, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Plane className="size-4" />
            Runway
          </div>
          <Link
            href="/connect"
            className="text-sm px-4 py-1.5 rounded-lg bg-foreground text-background hover:bg-foreground/80 transition-colors font-medium"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full border border-border bg-muted text-muted-foreground mb-8">
          <span className="size-1.5 rounded-full bg-green-500 inline-block" />
          AI for Finance · HackDuke 2026
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground max-w-3xl leading-tight">
          Know before your
          <br />
          <span className="text-red-500">money runs out.</span>
        </h1>

        <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
          Runway is an AI-powered cash flow intelligence engine for small
          business owners. It tells you — in plain language, via text — when
          something is about to go wrong. 9 days before it happens.
        </p>

        <div className="mt-10 flex items-center gap-4 flex-wrap justify-center">
          <Link
            href="/connect"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background font-semibold hover:bg-foreground/80 transition-colors text-sm"
          >
            Connect your Stripe
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/dashboard?demo=true"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-foreground font-semibold hover:bg-muted transition-colors text-sm"
          >
            View demo dashboard
          </Link>
        </div>

        {/* Alert preview */}
        <div className="mt-16 max-w-sm w-full mx-auto">
          <div className="rounded-2xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 p-5 text-left shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 size-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                <Bell className="size-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  Runway Alert · Sweet Grace Bakery
                </p>
                <p className="text-sm text-red-800 dark:text-red-300 mt-1 leading-snug">
                  Projected cash shortfall of $2,200 in{" "}
                  <strong>9 days</strong>. You may not make payroll on March 28.
                </p>
                <p className="text-xs text-red-500 dark:text-red-500 mt-2">
                  Sent via SMS · 2:14 AM
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
            This text goes out automatically. No dashboard required.
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-border bg-muted/50 py-10">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-3xl font-bold">82%</p>
            <p className="text-sm text-muted-foreground mt-1">
              of business failures caused by poor cash flow
            </p>
          </div>
          <div>
            <p className="text-3xl font-bold">$150K+</p>
            <p className="text-sm text-muted-foreground mt-1">
              cost of a CFO — per year
            </p>
          </div>
          <div>
            <p className="text-3xl font-bold">33M</p>
            <p className="text-sm text-muted-foreground mt-1">
              small businesses in the US with no forward-looking intelligence
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">
            QuickBooks tells you what happened.
            <br />
            <span className="text-muted-foreground font-normal">
              Runway tells you what&apos;s about to happen.
            </span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <FeatureCard
              icon={<TrendingDown className="size-5" />}
              title="Cash Flow Forecast"
              body="Day-by-day projection of your cash position for the next 30/60/90 days. See the exact date your balance goes negative — before it does."
            />
            <FeatureCard
              icon={<Bell className="size-5" />}
              title="SMS Alerts"
              body="Plain-language warnings sent to your phone the moment risk is detected. No dashboard required. No jargon. Just what you need to know."
            />
            <FeatureCard
              icon={<Zap className="size-5" />}
              title="Actionable Fixes"
              body="Not just warnings — specific steps. Collect this invoice. Cancel that subscription. Delay this payment 5 days. With dollar-amount impact."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24 px-6 text-center">
        <p className="text-muted-foreground text-sm mb-4">
          See the payroll miss coming before it happens.
        </p>
        <Link
          href="/connect"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background font-semibold hover:bg-foreground/80 transition-colors text-sm"
        >
          Connect Sweet Grace Bakery
          <ArrowRight className="size-4" />
        </Link>
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Runway · HackDuke 2026 · AI for Finance Track
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: ReturnType<typeof Plane>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border p-6 bg-card">
      <div className="size-9 rounded-lg bg-muted flex items-center justify-center mb-4 text-foreground">
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}
