"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Sliders } from "lucide-react";
import { Nav } from "@/components/nav";
import { ApiError, runwayApi } from "@/lib/api";
import type { ScenarioRequest, ScenarioResponse } from "@/lib/types";

export default function ScenariosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams.get("b");
  const [newHire, setNewHire] = useState(0);
  const [priceIncrease, setPriceIncrease] = useState(0);
  const [cutExpense, setCutExpense] = useState(0);
  const [data, setData] = useState<ScenarioResponse | null>(null);
  const [baselineRunway, setBaselineRunway] = useState<number | null>(null);
  const [businessName, setBusinessName] = useState<string>("your business");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) {
      router.replace("/connect");
      return;
    }

    const selectedBusinessId = businessId;
    let cancelled = false;

    async function loadBaseline() {
      try {
        const dashboard = await runwayApi.getDashboard(selectedBusinessId);
        if (!cancelled) {
          setBaselineRunway(dashboard.business.runway_days);
          setBusinessName(dashboard.business.name);
        }
      } catch (baselineError) {
        if (!cancelled) {
          setError(
            baselineError instanceof ApiError
              ? baselineError.message
              : "We couldn't load the baseline runway."
          );
        }
      }
    }

    void loadBaseline();

    return () => {
      cancelled = true;
    };
  }, [businessId, router]);

  useEffect(() => {
    if (!businessId) {
      return;
    }

    const selectedBusinessId = businessId;
    let cancelled = false;

    async function runScenarioModel() {
      const scenarios: ScenarioRequest["scenarios"] = [];

      if (newHire > 0) {
        scenarios.push({
          type: "new_hire",
          params: { monthly_salary: newHire },
        });
      }

      if (priceIncrease > 0) {
        scenarios.push({
          type: "price_increase",
          params: { increase_pct: priceIncrease },
        });
      }

      if (cutExpense > 0) {
        scenarios.push({
          type: "cut_expense",
          params: { transaction_id: "txn-sub-calendly" },
        });
      }

      if (scenarios.length === 0) {
        setData(null);
        return;
      }

      try {
        setError(null);
        const response = await runwayApi.modelScenario({
          business_id: selectedBusinessId,
          scenarios,
        });

        if (!cancelled) {
          setData(response);
        }
      } catch (scenarioError) {
        if (!cancelled) {
          setError(
            scenarioError instanceof ApiError
              ? scenarioError.message
              : "We couldn't model that scenario."
          );
        }
      }
    }

    void runScenarioModel();

    return () => {
      cancelled = true;
    };
  }, [businessId, cutExpense, newHire, priceIncrease]);

  if (!businessId) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-3xl mx-auto px-6 py-16">
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="font-medium">No business selected.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Connect a business first so we can model scenarios against it.
            </p>
            <Link
              href="/connect"
              className="inline-flex mt-4 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium"
            >
              Go to connect
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const modeledRunway = data?.modeled.runway_days ?? baselineRunway ?? 0;
  const totalDelta =
    data?.modeled.delta_days ??
    (baselineRunway !== null ? modeledRunway - baselineRunway : 0);

  const runwayColor =
    modeledRunway < 30
      ? "text-red-600"
      : modeledRunway < 60
        ? "text-amber-600"
        : "text-green-600";

  return (
    <div className="min-h-screen bg-background pb-mobile-nav">
      <Nav businessId={businessId} />

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sliders className="size-5" />
            What-If Scenarios
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Model business decisions and see their impact on your cash runway in
            real time.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 mb-8 text-center">
          <p className="text-sm text-muted-foreground mb-1">Modeled Runway</p>
          <p className={`text-6xl font-bold mb-1 ${runwayColor}`}>
            {modeledRunway}
            <span className="text-2xl font-normal ml-1">days</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Baseline: {baselineRunway ?? "--"} days ·{" "}
            <span className={totalDelta >= 0 ? "text-green-600" : "text-red-600"}>
              {totalDelta >= 0 ? "+" : ""}
              {totalDelta} days from scenarios
            </span>
          </p>
        </div>

        <div className="space-y-6">
          <ScenarioSlider
            label="Hire someone"
            description="Monthly salary cost"
            value={newHire}
            min={0}
            max={8000}
            step={200}
            format={(value) => (value === 0 ? "No new hire" : `$${value.toLocaleString()}/mo`)}
            onChange={setNewHire}
          />

          <ScenarioSlider
            label="Raise prices"
            description="Revenue increase percentage"
            value={priceIncrease}
            min={0}
            max={30}
            step={1}
            format={(value) => (value === 0 ? "No change" : `+${value}%`)}
            onChange={setPriceIncrease}
          />

          <ScenarioSlider
            label="Cut expenses"
            description="Uses the shared cut-expense scenario route"
            value={cutExpense}
            min={0}
            max={1}
            step={1}
            format={(value) => (value === 0 ? "Keep current spend" : "Remove one recurring tool")}
            onChange={setCutExpense}
          />
        </div>

        {data && (
          <div className="mt-8 rounded-xl border border-border bg-card p-4 text-sm">
            <p className="font-medium mb-2">Scenario impact from `/api/scenario/model`</p>
            <div className="space-y-1 text-muted-foreground">
              {data.scenarios_applied.map((scenario) => (
                <p key={scenario.type}>
                  {scenario.type}: {scenario.impact_days >= 0 ? "+" : ""}
                  {scenario.impact_days} days
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 rounded-xl border border-border bg-muted/50 p-4 text-xs text-muted-foreground">
          {error
            ? error
            : `Estimates are currently coming from the backend scenario model for ${businessName}.`}
        </div>
      </main>
    </div>
  );
}

function ScenarioSlider({
  label,
  description,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-medium text-sm">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-sm">{format(value)}</p>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-foreground"
      />
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}
