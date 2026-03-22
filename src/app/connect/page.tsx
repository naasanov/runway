"use client";

import { ApiError, runwayApi } from "@/lib/api";
import type {
  AnalyzeCompletedEvent,
  AnalyzeStreamTransaction,
  ConnectResponse,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Building2, CreditCard, Loader2, Plane, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const DEFAULT_BUSINESS = {
  business_name: "Sweet Grace Bakery",
  business_type: "bakery",
  owner_phone: "+19195551234",
};
const POST_ANALYZE_RETRY_COUNT = 5;
const POST_ANALYZE_RETRY_DELAY_MS = 400;
const STREAM_REVEAL_DELAY_MS = 130;
const STREAM_MAX_VISIBLE = 60;

type ConnectStep = "idle" | "connecting" | "analyzing" | "done";

function formatAmount(amount: number): string {
  const absAmount = Math.abs(amount);
  return `${amount < 0 ? "-" : "+"}$${absAmount.toLocaleString()}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isHydratedDashboard(
  data: Awaited<ReturnType<typeof runwayApi.getDashboard>>
) {
  return (
    data.business.runway_days != null ||
    data.alerts.length > 0 ||
    data.upcoming_obligations.length > 0
  );
}

function sortTransactions(
  transactions: AnalyzeStreamTransaction[]
): AnalyzeStreamTransaction[] {
  return [...transactions].sort((left, right) => {
    const dateComparison = right.date.localeCompare(left.date);
    if (dateComparison !== 0) return dateComparison;
    return right.id.localeCompare(left.id);
  });
}

function upsertTransactions(
  current: AnalyzeStreamTransaction[],
  incoming: AnalyzeStreamTransaction[]
): AnalyzeStreamTransaction[] {
  const transactionsById = new Map(
    current.map((transaction) => [transaction.id, transaction])
  );

  for (const transaction of incoming) {
    transactionsById.set(transaction.id, transaction);
  }

  return sortTransactions(Array.from(transactionsById.values())).slice(
    0,
    STREAM_MAX_VISIBLE
  );
}

function categoryBadgeClass(
  category: AnalyzeStreamTransaction["category"]
): string {
  if (category === null) return "bg-slate-100 text-slate-500";
  if (category === "revenue") return "bg-green-100 text-green-700";
  if (category === "payroll") return "bg-red-100 text-red-700";
  if (category === "rent" || category === "insurance") {
    return "bg-amber-100 text-amber-700";
  }
  if (category === "subscriptions" || category === "supplies") {
    return "bg-blue-100 text-blue-700";
  }
  return "bg-slate-100 text-slate-700";
}

function formatRecurrence(
  transaction: AnalyzeStreamTransaction
): string | null {
  if (!transaction.is_recurring || !transaction.recurrence_pattern) {
    return null;
  }

  return transaction.recurrence_pattern;
}

export default function ConnectPage() {
  const router = useRouter();
  const streamCleanupRef = useRef<(() => void) | null>(null);
  const revealTimerRef = useRef<number | null>(null);
  const revealCompleteResolverRef = useRef<(() => void) | null>(null);
  const rowAnimationTimeoutsRef = useRef<Map<string, number>>(new Map());
  const queuedTransactionsRef = useRef<AnalyzeStreamTransaction[]>([]);
  const completionHandledRef = useRef(false);

  const [step, setStep] = useState<ConnectStep>("idle");
  const [business, setBusiness] = useState<ConnectResponse["business"] | null>(
    null
  );
  const [visibleTransactions, setVisibleTransactions] = useState<
    AnalyzeStreamTransaction[]
  >([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [streamStatus, setStreamStatus] = useState<string>(
    "Waiting to import transactions…"
  );

  useEffect(() => {
    return () => {
      streamCleanupRef.current?.();
      if (revealTimerRef.current) {
        window.clearInterval(revealTimerRef.current);
      }
      for (const timeoutId of Array.from(
        rowAnimationTimeoutsRef.current.values()
      )) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  const [animatedTransactionIds, setAnimatedTransactionIds] = useState<
    string[]
  >([]);

  function resetStreamState() {
    streamCleanupRef.current?.();
    streamCleanupRef.current = null;
    queuedTransactionsRef.current = [];
    completionHandledRef.current = false;
    revealCompleteResolverRef.current = null;
    if (revealTimerRef.current) {
      window.clearInterval(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    for (const timeoutId of Array.from(
      rowAnimationTimeoutsRef.current.values()
    )) {
      window.clearTimeout(timeoutId);
    }
    rowAnimationTimeoutsRef.current.clear();
    setAnimatedTransactionIds([]);
    setVisibleTransactions([]);
  }

  function markTransactionsAnimated(transactionIds: string[]) {
    if (transactionIds.length === 0) return;

    setAnimatedTransactionIds((current) =>
      Array.from(new Set([...current, ...transactionIds]))
    );

    for (const transactionId of transactionIds) {
      const existingTimeout =
        rowAnimationTimeoutsRef.current.get(transactionId);
      if (existingTimeout) {
        window.clearTimeout(existingTimeout);
      }

      const timeoutId = window.setTimeout(() => {
        setAnimatedTransactionIds((current) =>
          current.filter((id) => id !== transactionId)
        );
        rowAnimationTimeoutsRef.current.delete(transactionId);
      }, 850);

      rowAnimationTimeoutsRef.current.set(transactionId, timeoutId);
    }
  }

  function startRevealLoop() {
    if (revealTimerRef.current) return;

    revealTimerRef.current = window.setInterval(() => {
      const nextTransaction = queuedTransactionsRef.current.shift();

      if (!nextTransaction) {
        if (revealTimerRef.current) {
          window.clearInterval(revealTimerRef.current);
          revealTimerRef.current = null;
        }
        revealCompleteResolverRef.current?.();
        revealCompleteResolverRef.current = null;
        return;
      }

      setVisibleTransactions((current) =>
        upsertTransactions(current, [nextTransaction])
      );
      markTransactionsAnimated([nextTransaction.id]);
    }, STREAM_REVEAL_DELAY_MS);
  }

  function queueTransactions(transactions: AnalyzeStreamTransaction[]) {
    const sorted = sortTransactions(transactions);
    queuedTransactionsRef.current.push(...sorted);
    startRevealLoop();
  }

  async function waitForQueuedTransactionsToReveal() {
    if (
      queuedTransactionsRef.current.length === 0 &&
      revealTimerRef.current === null
    ) {
      return;
    }

    await new Promise<void>((resolve) => {
      revealCompleteResolverRef.current = resolve;
    });
  }

  async function hydratePostAnalyze(
    businessId: string,
    analyzeResponse: AnalyzeCompletedEvent
  ) {
    let hydratedDashboard = await runwayApi.getDashboard(businessId);
    let hydratedAlerts = await runwayApi.getAlerts(businessId);

    for (let attempt = 1; attempt < POST_ANALYZE_RETRY_COUNT; attempt += 1) {
      if (
        isHydratedDashboard(hydratedDashboard) ||
        hydratedAlerts.alerts.length > 0
      ) {
        break;
      }

      await sleep(POST_ANALYZE_RETRY_DELAY_MS);
      hydratedDashboard = await runwayApi.getDashboard(businessId);
      hydratedAlerts = await runwayApi.getAlerts(businessId);
    }

    const overdueInvoiceAlert = analyzeResponse.alerts_created.find(
      (alert) => alert.scenario === "overdue_invoice"
    );

    if (
      analyzeResponse.alerts_created.length === 0 &&
      hydratedDashboard.alerts.length === 0 &&
      hydratedAlerts.alerts.length === 0
    ) {
      throw new Error(
        `We categorized ${analyzeResponse.transactions_categorized} transactions, but your results still look empty.`
      );
    }

    setWarning(
      overdueInvoiceAlert?.headline ??
        hydratedAlerts.alerts[0]?.headline ??
        hydratedDashboard.alerts[0]?.headline ??
        `Analysis completed with ${analyzeResponse.alerts_created.length} alerts.`
    );
    setStep("done");
    setStreamStatus(
      `Categorized ${analyzeResponse.transactions_categorized} transactions. Runway is ${analyzeResponse.runway_days} days.`
    );
  }

  async function handleConnect() {
    try {
      resetStreamState();
      setBusiness(null);
      setImportedCount(0);
      setWarning(null);
      setError(null);
      setStreamStatus("Importing transactions from connected accounts…");
      setStep("connecting");

      const connectResponse = await runwayApi.connectBusiness(DEFAULT_BUSINESS);
      setBusiness(connectResponse.business);
      setImportedCount(connectResponse.transactions_imported);
      setStep("analyzing");
      setStreamStatus("Preparing your transactions…");

      await new Promise<void>((resolve, reject) => {
        let settled = false;

        const settle = (callback: () => void) => {
          if (settled) return;
          settled = true;
          callback();
        };

        streamCleanupRef.current = runwayApi.openAnalyzeStream(
          connectResponse.business.id,
          {
            onAnalysisStarted: (event) => {
              setStreamStatus(
                `Categorizing ${event.total_transactions} transactions…`
              );
            },
            onBatchStarted: (event) => {
              queueTransactions(event.transactions);
              setStreamStatus(
                `Categorizing ${event.batch_size} more transactions…`
              );
            },
            onBatchCompleted: (event) => {
              queueTransactions(event.transactions);
              setStreamStatus(
                `${event.processed_count} more transactions categorized.`
              );
            },
            onFallbackUsed: () => {
              setStreamStatus("Still categorizing your transactions…");
            },
            onAnalysisCompleted: (event) => {
              if (completionHandledRef.current) return;
              completionHandledRef.current = true;

              void waitForQueuedTransactionsToReveal()
                .then(() =>
                  hydratePostAnalyze(connectResponse.business.id, event)
                )
                .then(() => {
                  settle(resolve);
                })
                .catch((hydrationError) => {
                  settle(() => reject(hydrationError));
                });
            },
            onAnalysisFailed: (event) => {
              settle(() => reject(new Error(event.message)));
            },
            onError: (streamError) => {
              settle(() => reject(streamError));
            },
          }
        );
      });
    } catch (connectError) {
      resetStreamState();
      setStep("idle");
      setBusiness(null);
      setWarning(null);
      setError(
        connectError instanceof ApiError
          ? connectError.message
          : connectError instanceof Error
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
    <div className="h-dvh overflow-hidden bg-background flex flex-col">
      <nav className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-2 font-semibold">
          <Link href="/" className="flex items-center gap-2">
            <Plane className="size-4" />
            Runway
          </Link>
        </div>
      </nav>

      <main className="flex-1 min-h-0 overflow-hidden px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto flex h-full w-full max-w-xl items-center overflow-hidden">
          {step === "idle" && (
            <div className="w-full text-center">
              <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
                <Building2 className="size-6 text-foreground" />
              </div>
              <h1 className="text-2xl font-bold mb-2">
                Connect {DEFAULT_BUSINESS.business_name}
              </h1>
              <p className="text-muted-foreground text-sm mb-8 max-w-sm mx-auto">
                We&apos;ll import your seeded demo business, then categorize
                your transactions and surface what needs attention.
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
                      Import transaction history
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
                      Add your latest cash activity
                    </p>
                  </div>
                  <Zap className="size-4 text-muted-foreground ml-auto" />
                </button>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}

          {(step === "connecting" ||
            step === "analyzing" ||
            step === "done") && (
            <div className="flex h-full w-full flex-col overflow-hidden">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`size-2 rounded-full ${
                    step === "done"
                      ? "bg-green-500"
                      : "bg-amber-400 animate-pulse"
                  }`}
                />
                <p className="text-sm font-medium">
                  {step === "done"
                    ? `Import complete — ${importedCount} live items loaded`
                    : step === "connecting"
                      ? "Connecting sources…"
                      : "Categorizing transactions…"}
                </p>
              </div>
              <p className="mb-4 pl-4 text-xs text-muted-foreground">
                {business
                  ? `Stripe + banking connected for ${business.name}`
                  : "Connecting demo business"}
              </p>

              <div className="flex min-h-0 w-full flex-1 flex-col rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/50">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Transactions</p>
                      <p className="text-xs text-muted-foreground">
                        Recent transactions appear here as they&apos;re
                        categorized.
                      </p>
                    </div>
                    {(step === "connecting" || step === "analyzing") && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="size-3.5 animate-spin" />
                        Live
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-b border-border bg-background/70 px-4 py-3 text-xs text-muted-foreground transition-all duration-500 ease-out">
                  {streamStatus}
                </div>

                <div className="runway-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3 space-y-2 sm:p-4">
                  {visibleTransactions.length === 0 &&
                    (step === "connecting" || step === "analyzing") && (
                      <div className="animate-settle-in rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground flex items-center gap-3">
                        <Loader2 className="size-4 animate-spin" />
                        Your transactions are being categorized. The first ones
                        will appear here shortly.
                      </div>
                    )}

                  {visibleTransactions.map((transaction) => {
                    const recurrence = formatRecurrence(transaction);

                    return (
                      <div
                        key={transaction.id}
                        className={cn(
                          "rounded-xl border border-border bg-background px-3 py-2 transition-[transform,box-shadow,border-color,background-color] duration-500 ease-out",
                          animatedTransactionIds.includes(transaction.id) &&
                            "animate-settle-in animate-soft-highlight border-slate-300/70"
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2 text-xs sm:text-sm">
                          <p
                            className={`shrink-0 font-semibold ${
                              transaction.amount < 0
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {formatAmount(transaction.amount)}
                          </p>
                          <p className="min-w-0 flex-1 truncate text-foreground">
                            {transaction.description}
                          </p>
                          <div className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground sm:text-xs">
                            <span>{transaction.date}</span>
                            {transaction.invoice_status === "unpaid" && (
                              <span className="font-medium text-red-600">
                                UNPAID
                              </span>
                            )}
                            {recurrence && (
                              <span className="hidden sm:inline">
                                {recurrence}
                              </span>
                            )}
                            {transaction.category === null ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500 transition-colors duration-500 ease-out">
                                <Loader2 className="size-3 animate-spin" />
                                categorizing
                              </span>
                            ) : (
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2 py-1 text-[11px] font-medium transition-colors duration-500 ease-out",
                                  categoryBadgeClass(transaction.category)
                                )}
                              >
                                {transaction.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {warning && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <strong>Heads up:</strong> {warning}
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {step === "done" && business && (
                <div className="mt-4">
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
