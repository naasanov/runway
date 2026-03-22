"use client";

import { ApiError, runwayApi } from "@/lib/api";
import type {
  AnalyzeCompletedEvent,
  AnalyzeStreamTransaction,
  ConnectResponse,
} from "@/lib/types";
import { formatRunwayDaysPhrase } from "@/lib/runway-display";
import { cn } from "@/lib/utils";
import { CircuitBackground } from "@/components/circuit-background";
import { RunwayLogoIcon } from "@/components/runway-logo";
import { ArrowRight, Building2, CreditCard, Loader2, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const DEFAULT_BUSINESS_NAME = "Sweet Grace Bakery";
const DEFAULT_BUSINESS_TYPE = "bakery";
const CONCENTRATION_BUSINESS_NAME = "Apex Digital Consulting";
const CONCENTRATION_BUSINESS_TYPE = "agency";
const BAKERY_STRIPE_ID = "88888888";
const CONCENTRATION_STRIPE_ID = "77777777";
const DEMO_PASSWORD = "password";
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
  if (category === null) return "border border-border text-muted-foreground";
  if (category === "revenue") return "border border-green-600/30 text-green-700";
  if (category === "payroll") return "border border-red-500/30 text-red-600";
  if (category === "rent" || category === "insurance") {
    return "border border-amber-400/30 text-amber-700";
  }
  if (category === "subscriptions" || category === "supplies") {
    return "border border-border text-muted-foreground";
  }
  return "border border-border text-muted-foreground";
}

function formatRecurrence(
  transaction: AnalyzeStreamTransaction
): string | null {
  if (!transaction.is_recurring || !transaction.recurrence_pattern) {
    return null;
  }

  return transaction.recurrence_pattern;
}

function isSupportedDemoStripeAccount(accountId: string): boolean {
  return (
    accountId === BAKERY_STRIPE_ID || accountId === CONCENTRATION_STRIPE_ID
  );
}

function resolveScenarioBusiness(accountId: string): {
  businessName: string;
  businessType: string;
} {
  if (accountId === CONCENTRATION_STRIPE_ID) {
    return {
      businessName: CONCENTRATION_BUSINESS_NAME,
      businessType: CONCENTRATION_BUSINESS_TYPE,
    };
  }

  return {
    businessName: DEFAULT_BUSINESS_NAME,
    businessType: DEFAULT_BUSINESS_TYPE,
  };
}

export default function ConnectPage() {
  const router = useRouter();
  const streamCleanupRef = useRef<(() => void) | null>(null);
  const revealTimerRef = useRef<number | null>(null);
  const revealCompleteResolverRef = useRef<(() => void) | null>(null);
  const rowAnimationTimeoutsRef = useRef<Map<string, number>>(new Map());
  const queuedTransactionsRef = useRef<AnalyzeStreamTransaction[]>([]);
  const completionHandledRef = useRef(false);

  const launchTimeRef = useRef<number>(0);
  const streamBodyRef = useRef<HTMLDivElement>(null);

  const [ownerPhone, setOwnerPhone] = useState<string | null>(null);
  const [step, setStep] = useState<ConnectStep>("idle");
  const [launching, setLaunching] = useState(false);
  const [dashboardLaunching, setDashboardLaunching] = useState(false);
  const [streamCollapsed, setStreamCollapsed] = useState(false);
  const [collapseBodyHeight, setCollapseBodyHeight] = useState<number | null>(null);
  const [stripeId, setStripeId] = useState("");
  const [stripePassword, setStripePassword] = useState("");
  const [stripeHovered, setStripeHovered] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
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

  const selectedDemoBusinessName = isSupportedDemoStripeAccount(stripeId)
    ? resolveScenarioBusiness(stripeId).businessName
    : "your business";

  useEffect(() => {
    void runwayApi.getMe().then((me) => setOwnerPhone(me.phone)).catch(() => null);
  }, []);

  // Prefetch dashboard page so navigation is instant
  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

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

  useEffect(() => {
    if (step === "done") {
      const timer = window.setTimeout(() => {
        if (!streamBodyRef.current) {
          setStreamCollapsed(true);
          return;
        }
        // Snapshot the body's current pixel height, then next frame animate to 0
        const h = streamBodyRef.current.offsetHeight;
        setCollapseBodyHeight(h);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setCollapseBodyHeight(0);
            setStreamCollapsed(true);
          });
        });
      }, 800);
      return () => window.clearTimeout(timer);
    } else {
      setStreamCollapsed(false);
      setCollapseBodyHeight(null);
    }
  }, [step]);

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
      `Categorized ${analyzeResponse.transactions_categorized} transactions. Runway is ${formatRunwayDaysPhrase(analyzeResponse.runway_days)}.`
    );
  }

  const stripeReady = stripeId.length > 0 && stripePassword.length > 0;
  const showStripeForm = stripeHovered || stripeId.length > 0 || stripePassword.length > 0;

  function handleStripeClick() {
    if (!stripeReady || launching) return;
    if (
      !isSupportedDemoStripeAccount(stripeId) ||
      stripePassword !== DEMO_PASSWORD
    ) {
      setStripeError(
        "Invalid Stripe credentials. Use account ID 88888888 or 77777777 with password 'password'."
      );
      return;
    }
    setStripeError(null);
    launchTimeRef.current = Date.now();
    setLaunching(true);
    setTimeout(() => void handleConnect(), 750);
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

      const {
        businessName: scenarioBusinessName,
        businessType: scenarioBusinessType,
      } = resolveScenarioBusiness(stripeId);

      const connectResponse = await runwayApi.connectBusiness({
        business_name: scenarioBusinessName,
        business_type: scenarioBusinessType,
        owner_phone: ownerPhone ?? "",
        stripe_account_id: stripeId || undefined,
      });
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
      if (connectError instanceof ApiError && connectError.status === 401) {
        // Let the plane animation finish before redirecting to the login page
        const elapsed = Date.now() - launchTimeRef.current;
        const remaining = Math.max(0, 1200 - elapsed);
        if (remaining > 0) await sleep(remaining);
        router.push("/login");
        return;
      }
      setLaunching(false);
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
    if (!business || dashboardLaunching) return;
    localStorage.setItem(
      `runway_scenario_${business.id}`,
      stripeId === CONCENTRATION_STRIPE_ID ? "concentration" : "bakery"
    );
    if (ownerPhone) {
      void runwayApi.scheduleCall(ownerPhone, business.id).catch(() => null);
    }
    setDashboardLaunching(true);
    setTimeout(() => router.push(`/dashboard?b=${business.id}`), 750);
  }

  return (
    <div className="h-dvh overflow-hidden bg-background flex flex-col relative">
      <CircuitBackground step={step} />
      <nav className="border-b border-border relative z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-2 font-semibold">
          <Link href="/" className="flex items-center gap-2">
            <RunwayLogoIcon className="size-8" />
            Runway
          </Link>
        </div>
      </nav>

      <main className="flex-1 min-h-0 overflow-hidden px-4 py-4 sm:px-6 sm:py-6 relative z-10">
        <div className="mx-auto flex h-full w-full max-w-xl items-center overflow-hidden">
          {step === "idle" && (
            <div className="w-full bg-background">
              <p className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] uppercase mb-5">
                {"// connect_business"}
              </p>
              <h1 className="text-2xl font-bold tracking-tight mb-2">
                Connect{" "}
                <span
                  className={cn(
                    "transition-all duration-200",
                    isSupportedDemoStripeAccount(stripeId)
                      ? "blur-0"
                      : "blur-[2px]"
                  )}
                >
                  {selectedDemoBusinessName}
                </span>
              </h1>
              <p className="text-muted-foreground text-sm mb-8 max-w-sm leading-relaxed">
                We&apos;ll import your transaction history, categorize
                your activity, and surface what needs attention.
              </p>

              <div className="flex flex-col mb-6 border border-border divide-y divide-border">
                {/* Stripe section: button + expandable credentials form */}
                <div
                  onMouseEnter={() => setStripeHovered(true)}
                  onMouseLeave={() => setStripeHovered(false)}
                >
                  <button
                    onClick={handleStripeClick}
                    className={cn(
                      "w-full flex items-center gap-3 px-5 py-4 bg-background transition-colors text-left",
                      stripeReady ? "hover:bg-muted" : "opacity-60 cursor-not-allowed"
                    )}
                  >
                    <div className="size-8 border border-border flex items-center justify-center shrink-0">
                      <CreditCard className="size-4 text-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Connect Stripe</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        Import transaction history
                      </p>
                    </div>
                    <div className="ml-auto relative size-6">
                      <Zap
                        className={`size-6 text-muted-foreground absolute inset-0 transition-all duration-200 ${launching ? "opacity-0 scale-50" : "opacity-100 scale-100"}`}
                      />
                      <RunwayLogoIcon
                        className={`size-6 text-foreground absolute inset-0 ${launching ? "animate-logo-launch" : "opacity-0"}`}
                      />
                    </div>
                  </button>

                  {/* Always in DOM — grid trick animates height, opacity fades */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateRows: showStripeForm ? "1fr" : "0fr",
                      opacity: showStripeForm ? 1 : 0,
                      transition:
                        "grid-template-rows 0.55s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease-out",
                    }}
                  >
                    <div className="overflow-hidden">
                      <div className="border-t border-border bg-muted/30 px-5 py-4 flex flex-col gap-3">
                        <div>
                          <label htmlFor="stripe-account-id" className="text-xs font-medium block mb-1.5">
                            Stripe Account ID
                          </label>
                          <input
                            id="stripe-account-id"
                            type="text"
                            placeholder="Your Stripe account ID"
                            value={stripeId}
                            onChange={(e) => { setStripeId(e.target.value); setStripeError(null); }}
                            className="w-full px-3 py-2 text-sm border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow"
                            style={{ borderRadius: 0 }}
                          />
                          <p className="text-[11px] text-muted-foreground font-mono mt-1">
                            Found in Stripe → Settings → Account details
                          </p>
                        </div>
                        <div>
                          <label htmlFor="stripe-password" className="text-xs font-medium block mb-1.5">
                            Password
                          </label>
                          <input
                            id="stripe-password"
                            type="password"
                            placeholder="••••••••"
                            value={stripePassword}
                            onChange={(e) => { setStripePassword(e.target.value); setStripeError(null); }}
                            className="w-full px-3 py-2 text-sm border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow"
                            style={{ borderRadius: 0 }}
                          />
                          <p className="text-[11px] text-muted-foreground font-mono mt-1">
                            The password you set when signing up
                          </p>
                        </div>
                        {stripeError && (
                          <p className="text-xs text-red-600 font-mono">{stripeError}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleConnect}
                  className="w-full flex items-center gap-3 px-5 py-4 bg-background hover:bg-muted transition-colors text-left"
                >
                  <div className="size-8 border border-border flex items-center justify-center shrink-0">
                    <Building2 className="size-4 text-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Connect Bank Account</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      Add your latest cash activity
                    </p>
                  </div>
                  <Zap className="size-4 text-muted-foreground ml-auto" />
                </button>
              </div>

              {error && <p className="text-sm text-red-600 font-mono">{error}</p>}
            </div>
          )}

          {(step === "connecting" ||
            step === "analyzing" ||
            step === "done") && (
            <div className="flex h-full w-full flex-col overflow-hidden bg-background">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`size-2 rounded-full shrink-0 ${
                    step === "done"
                      ? "bg-green-500"
                      : "bg-amber-400 animate-pulse"
                  }`}
                />
                <p className="text-xs font-mono font-semibold uppercase tracking-[0.1em] text-foreground">
                  {step === "done"
                    ? `import complete — ${importedCount} items`
                    : step === "connecting"
                      ? "connecting sources…"
                      : "categorizing transactions…"}
                </p>
              </div>
              <p className="mb-4 pl-4 text-xs text-muted-foreground font-mono">
                {business
                  ? `${business.name} · stripe + banking`
                  : "connecting business"}
              </p>

              <div
                className={cn(
                  "w-full flex-col border border-border bg-background overflow-hidden",
                  streamCollapsed ? "flex flex-none" : "flex min-h-0 flex-1"
                )}
              >
                {/* Header — always visible when collapsed */}
                <div className="shrink-0 px-4 py-3 border-b border-border">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Transactions</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        Appear here as they&apos;re categorized.
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

                {/* Body — height is snapshotted then animated to 0 on collapse */}
                <div
                  ref={streamBodyRef}
                  className="flex flex-col overflow-hidden"
                  style={{
                    transition: "height 0.7s ease-out",
                    ...(collapseBodyHeight !== null
                      ? { height: collapseBodyHeight, flexShrink: 0 }
                      : { flex: "1 1 0%", minHeight: 0 }),
                  }}
                >
                  <div className="shrink-0 border-b border-border bg-background/70 px-4 py-3 text-xs text-muted-foreground transition-all duration-500 ease-out">
                    {streamStatus}
                  </div>

                  <div className="runway-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3 space-y-2 sm:p-4">
                    {visibleTransactions.length === 0 &&
                      (step === "connecting" || step === "analyzing") && (
                        <div className="animate-settle-in border border-dashed border-border px-4 py-6 text-sm text-muted-foreground flex items-center gap-3 font-mono">
                          <Loader2 className="size-4 animate-spin shrink-0" />
                          Categorizing your transactions — first items appear shortly.
                        </div>
                      )}

                    {visibleTransactions.map((transaction) => {
                      const recurrence = formatRecurrence(transaction);

                      return (
                        <div
                          key={transaction.id}
                          className={cn(
                            "border border-border bg-background px-3 py-2 transition-[transform,box-shadow,border-color,background-color] duration-500 ease-out",
                            animatedTransactionIds.includes(transaction.id) &&
                              "animate-settle-in animate-soft-highlight border-border/80"
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
                                <span className="inline-flex items-center gap-1 border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground transition-colors duration-500 ease-out">
                                  <Loader2 className="size-3 animate-spin" />
                                  categorizing
                                </span>
                              ) : (
                                <span
                                  className={cn(
                                    "inline-flex px-1.5 py-0.5 text-[10px] font-mono transition-colors duration-500 ease-out",
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
              </div>

              {warning && (
                <div className="mt-4 border border-l-4 border-amber-400/40 border-l-amber-400 p-4 text-sm text-amber-700">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-600 block mb-1">heads_up</span>
                  {warning}
                </div>
              )}

              {error && (
                <div className="mt-4 border border-l-4 border-red-500/30 border-l-red-500 p-4 text-sm text-red-600">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-red-500 block mb-1">error</span>
                  {error}
                </div>
              )}

              {step === "done" && business && (
                <div className="mt-4">
                  <button
                    onClick={handleContinue}
                    className={cn(
                      "w-full flex items-center gap-3 px-5 bg-foreground text-background font-semibold text-sm hover:bg-foreground/80 transition-colors",
                      streamCollapsed ? "py-4 animate-pulse-green-glow" : "py-3"
                    )}
                  >
                    View dashboard
                    <div className="ml-auto relative size-6 shrink-0">
                      <ArrowRight
                        className={`size-4 text-background absolute inset-0 m-auto transition-all duration-200 ${dashboardLaunching || streamCollapsed ? "opacity-0 scale-50" : "opacity-100 scale-100"}`}
                      />
                      <RunwayLogoIcon
                        className={cn(
                          "size-6 text-background absolute inset-0",
                          dashboardLaunching
                            ? "animate-logo-launch"
                            : streamCollapsed
                              ? "opacity-100"
                              : "opacity-0"
                        )}
                      />
                    </div>
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
