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

      {/* Hero — split layout: headline left, CTAs right */}
      <section className="px-6 pt-16 pb-0 border-b border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 items-end pb-14">
            {/* Left: headline + copy */}
            <div>
              <p className="text-[11px] font-mono text-muted-foreground tracking-[0.2em] uppercase mb-5">
                Financial Intelligence / 2026
              </p>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.05]">
                Know before your
                <br />
                <span className="font-extrabold">money runs out.</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-md leading-relaxed">
                AI-powered cash flow intelligence for small business owners.
                Plain-language alerts via text —{" "}
                <span className="text-foreground font-semibold">9 days before the crisis hits.</span>
              </p>
            </div>

            {/* Right: CTAs stacked */}
            <div className="flex flex-row lg:flex-col gap-3 lg:items-stretch shrink-0">
              <Link
                href="/connect"
                className="inline-flex items-center justify-between gap-4 px-6 py-4 bg-foreground text-background font-semibold hover:bg-foreground/80 transition-colors text-sm whitespace-nowrap"
              >
                Connect your Stripe
                <ArrowRight className="size-4 shrink-0" />
              </Link>
              <Link
                href="/connect"
                className="inline-flex items-center justify-center px-6 py-4 border border-border text-foreground font-semibold hover:bg-muted transition-colors text-sm whitespace-nowrap"
              >
                View demo
              </Link>
            </div>
          </div>

          {/* QuickBooks / Runway tagline — visible above fold */}
          <div className="border-t border-border py-8 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-8">
            <p className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] uppercase shrink-0">
              {"// what_we_do"}
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-0">
              <span className="text-xl font-bold tracking-tight text-muted-foreground">
                QuickBooks tells you what happened.
              </span>
              <span className="hidden sm:inline text-xl font-bold text-muted-foreground/40 mx-4">
                /
              </span>
              <span className="text-xl font-bold tracking-tight text-[#166534]">
                Runway tells you what&apos;s about to happen.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Stat credibility bar */}
      <section className="border-b border-border">
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
            Connect your business
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
