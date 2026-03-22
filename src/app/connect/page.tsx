"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, CreditCard, Plane, Zap } from "lucide-react";
import { ApiError, runwayApi } from "@/lib/api";
import type { ConnectResponse, Transaction } from "@/lib/types";

const DEFAULT_BUSINESS = {
  business_name: "Sweet Grace Bakery",
  business_type: "bakery",
  owner_phone: "+19195551234",
};

function getStreamLines(transactions: Transaction[]): Transaction[] {
  return [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);
}

function formatAmount(amount: number): string {
  const absAmount = Math.abs(amount);
  return `$${absAmount.toLocaleString()}`;
}

function formatStreamLabel(transaction: Transaction): string {
  const status =
    transaction.invoice_status === "unpaid" ? " [UNPAID]" : "";

  return `${formatAmount(transaction.amount)} — ${transaction.description} (${transaction.source})${status}`;
}

export default function ConnectPage() {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "connecting" | "done">("idle");
  const [visibleLines, setVisibleLines] = useState<number[]>([]);
  const [business, setBusiness] = useState<ConnectResponse["business"] | null>(null);
  const [streamLines, setStreamLines] = useState<Transaction[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);

  async function handleConnect() {
    try {
      setError(null);
      setWarning(null);
      setVisibleLines([]);
      setStep("connecting");

      const connectResponse = await runwayApi.connectBusiness(DEFAULT_BUSINESS);
      setBusiness(connectResponse.business);
      setImportedCount(connectResponse.transactions_imported);

      const dashboardData = await runwayApi.getDashboard(connectResponse.business.id);

      const lines = getStreamLines([
        ...dashboardData.forecast_summary.days.flatMap((day) =>
          day.obligations.map<Transaction>((obligation, index) => ({
            id: `${day.date}-${obligation.description}-${index}`,
            business_id: connectResponse.business.id,
            source: "banking",
            transaction_type: "debit",
            invoice_status: null,
            invoice_date: null,
            customer_id: null,
            amount: -obligation.amount,
            description: obligation.description,
            category: null,
            date: day.date,
            is_recurring: true,
            recurrence_pattern: null,
            tags: [],
          }))
        ),
      ]);

      setStreamLines(lines);

      lines.forEach((_line, index) => {
        window.setTimeout(() => {
          setVisibleLines((current) => [...current, index]);
        }, 250 * (index + 1));
      });

      try {
        const analyzeResponse = await runwayApi.analyzeBusiness(connectResponse.business.id);
        const hydratedDashboard = await runwayApi.getDashboard(connectResponse.business.id);
        const hydratedAlerts = await runwayApi.getAlerts(connectResponse.business.id);
        const overdueInvoiceAlert = analyzeResponse.alerts_created.find(
          (alert) => alert.scenario === "overdue_invoice"
        );

        if (
          analyzeResponse.alerts_created.length === 0 &&
          hydratedDashboard.alerts.length === 0 &&
          hydratedAlerts.alerts.length === 0
        ) {
          throw new Error(
            `Analysis categorized ${analyzeResponse.transactions_categorized} transactions, but returned 0 alerts and the dashboard/alerts endpoints are both empty.`
          );
        }

        setWarning(
          overdueInvoiceAlert?.headline ??
            hydratedAlerts.alerts[0]?.headline ??
            hydratedDashboard.alerts[0]?.headline ??
            `Analysis completed with ${analyzeResponse.alerts_created.length} alerts.`
        );
      } catch (analyzeError) {
        setStep("idle");
        setVisibleLines([]);
        setWarning(null);
        setError(
          analyzeError instanceof ApiError
            ? `Analysis failed: ${analyzeError.message}`
            : analyzeError instanceof Error
              ? analyzeError.message
              : "Analysis completed with invalid dashboard data."
        );
        return;
      }

      window.setTimeout(() => {
        setStep("done");
      }, Math.max(lines.length, 1) * 250 + 300);
    } catch (connectError) {
      setStep("idle");
      setVisibleLines([]);
      setBusiness(null);
      setStreamLines([]);
      setWarning(null);
      setError(
        connectError instanceof ApiError
          ? connectError.message
          : "We couldn't connect the business right now."
      );
    }
  }

  function handleContinue() {
    if (!business) return;
    router.push(`/dashboard?b=${business.id}`);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
              <h1 className="text-2xl font-bold mb-2">Connect {DEFAULT_BUSINESS.business_name}</h1>
              <p className="text-muted-foreground text-sm mb-8 max-w-sm mx-auto">
                We&apos;ll import your seeded demo business, then load alerts and runway data
                from the backend routes defined in the TDD.
              </p>

              <div className="flex flex-col gap-3 mb-6">
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
                      Calls `POST /api/business/connect`
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
                      Loads dashboard and alert data from the API
                    </p>
                  </div>
                  <Zap className="size-4 text-muted-foreground ml-auto" />
                </button>
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </div>
          )}

          {(step === "connecting" || step === "done") && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`size-2 rounded-full ${
                    step === "done" ? "bg-green-500" : "bg-amber-400 animate-pulse"
                  }`}
                />
                <p className="text-sm font-medium">
                  {step === "done"
                    ? `Import complete — ${importedCount} live items loaded`
                    : "Importing transaction history…"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mb-5 pl-4">
                {business
                  ? `Stripe + banking connected for ${business.name}`
                  : "Connecting demo business"}
              </p>

              <div className="rounded-xl border border-border bg-card font-mono text-xs overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border bg-muted/50 text-muted-foreground">
                  Transaction stream
                </div>
                <div className="p-4 space-y-1.5 min-h-[200px]">
                  {streamLines.map((line, index) =>
                    visibleLines.includes(index) ? (
                      <div
                        key={line.id}
                        className={`flex items-center gap-2 ${
                          line.invoice_status === "unpaid"
                            ? "text-red-600 font-semibold"
                            : "text-foreground"
                        }`}
                      >
                        <span className="text-muted-foreground">→</span>
                        {formatStreamLabel(line)}
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

              {warning && (
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <strong>Heads up:</strong> {warning}
                </div>
              )}

              {step === "done" && business && (
                <div className="mt-6">
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
