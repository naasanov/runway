"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plane, Zap, Building2, CreditCard } from "lucide-react";
import Link from "next/link";

const DEMO_BUSINESS_ID = "sweet-grace-bakery";

const STREAM_LINES = [
  { label: "$847 — Wedding cake (Stripe)", delay: 300 },
  { label: "$2,400 — Rent (Banking)", delay: 700 },
  { label: "$312 — King Arthur Flour (Stripe)", delay: 1100 },
  { label: "$1,890 — Payroll (Banking)", delay: 1500 },
  { label: "$135 — Packaging supplies (Stripe)", delay: 1900 },
  { label: "$60 — Square POS subscription (Stripe)", delay: 2300 },
  { label: "$89 — Acuity Scheduling (Stripe)", delay: 2700 },
  { label: "$45 — Calendly (Stripe)", delay: 3100 },
  { label: "$1,200 — Insurance (Banking)", delay: 3500 },
  { label: "$3,200 — Durham Catering invoice [UNPAID]", delay: 3900, danger: true },
];

export default function ConnectPage() {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "connecting" | "done">("idle");
  const [visibleLines, setVisibleLines] = useState<number[]>([]);

  function handleConnect() {
    setStep("connecting");

    STREAM_LINES.forEach((line, i) => {
      setTimeout(() => {
        setVisibleLines((prev) => [...prev, i]);
      }, line.delay);
    });

    setTimeout(() => {
      setStep("done");
    }, 4800);
  }

  function handleContinue() {
    router.push(`/dashboard?b=${DEMO_BUSINESS_ID}`);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-2 font-semibold">
          <Link href="/" className="flex items-center gap-2">
            <Plane className="size-4" />
            Runway
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg">
          {step === "idle" && (
            <div className="text-center">
              <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
                <Building2 className="size-6 text-foreground" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Connect Sweet Grace Bakery</h1>
              <p className="text-muted-foreground text-sm mb-8 max-w-sm mx-auto">
                We&apos;ll pull your transaction history from Stripe and your bank to
                build your cash flow forecast.
              </p>

              <div className="flex flex-col gap-3 mb-8">
                <button
                  onClick={handleConnect}
                  className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-left"
                >
                  <div className="size-9 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                    <CreditCard className="size-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Connect Stripe</p>
                    <p className="text-xs text-muted-foreground">
                      Pull payment + invoice data
                    </p>
                  </div>
                  <Zap className="size-4 text-muted-foreground ml-auto" />
                </button>

                <button
                  onClick={handleConnect}
                  className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-left"
                >
                  <div className="size-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                    <Building2 className="size-4 text-green-700" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Connect Bank Account</p>
                    <p className="text-xs text-muted-foreground">
                      Pull balance + ACH / wire transfers
                    </p>
                  </div>
                  <Zap className="size-4 text-muted-foreground ml-auto" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                Demo mode — using seeded data for Sweet Grace Bakery, Durham NC
              </p>
            </div>
          )}

          {(step === "connecting" || step === "done") && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`size-2 rounded-full ${step === "done" ? "bg-green-500" : "bg-amber-400 animate-pulse"}`}
                />
                <p className="text-sm font-medium">
                  {step === "done"
                    ? "Import complete — 4 months of data"
                    : "Importing transaction history…"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mb-5 pl-4">
                Stripe + First Citizens Bank · Sweet Grace Bakery
              </p>

              <div className="rounded-xl border border-border bg-card font-mono text-xs overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border bg-muted/50 text-muted-foreground">
                  Transaction stream
                </div>
                <div className="p-4 space-y-1.5 min-h-[200px]">
                  {STREAM_LINES.map((line, i) =>
                    visibleLines.includes(i) ? (
                      <div
                        key={i}
                        className={`flex items-center gap-2 ${line.danger ? "text-red-600 font-semibold" : "text-foreground"}`}
                      >
                        <span className="text-muted-foreground">→</span>
                        {line.label}
                      </div>
                    ) : null
                  )}
                  {step === "connecting" && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>→</span>
                      <span className="animate-pulse">_</span>
                    </div>
                  )}
                </div>
              </div>

              {step === "done" && (
                <div className="mt-6">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 p-4 mb-4 text-sm text-amber-800 dark:text-amber-300">
                    <strong>Heads up:</strong> We detected a $3,200 invoice from Durham
                    Catering that&apos;s 12 days overdue. Running analysis…
                  </div>
                  <button
                    onClick={handleContinue}
                    className="w-full py-3 rounded-xl bg-foreground text-background font-semibold text-sm hover:bg-foreground/80 transition-colors"
                  >
                    View dashboard →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
