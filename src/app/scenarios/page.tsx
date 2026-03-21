"use client";

import { useState } from "react";
import { Nav } from "@/components/nav";
import { Sliders } from "lucide-react";

const BASE_RUNWAY = 47;

export default function ScenariosPage() {
  const [newHire, setNewHire] = useState(0);
  const [priceIncrease, setPriceIncrease] = useState(0);
  const [cutExpense, setCutExpense] = useState(0);

  // Rough runway impact calculation
  // New hire: $1,000/mo burns ~1.5 days of runway per $1k/mo
  // Price increase: 1% increase ≈ +2.5 days runway (based on $14k/mo revenue)
  // Cut expense: $1 saved = ~0.0015 days (per dollar per month)
  const hireDelta = -Math.round((newHire / 1000) * 1.5);
  const priceDelta = Math.round(priceIncrease * 2.5);
  const cutDelta = Math.round((cutExpense / 100) * 0.15);
  const totalDelta = hireDelta + priceDelta + cutDelta;
  const modeledRunway = Math.max(0, BASE_RUNWAY + totalDelta);

  const runwayColor =
    modeledRunway < 30
      ? "text-red-600 dark:text-red-400"
      : modeledRunway < 60
        ? "text-amber-600 dark:text-amber-400"
        : "text-green-600 dark:text-green-400";

  return (
    <div className="min-h-screen bg-background">
      <Nav businessId="sweet-grace-bakery" />

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

        {/* Runway display */}
        <div className="rounded-2xl border border-border bg-card p-6 mb-8 text-center">
          <p className="text-sm text-muted-foreground mb-1">Modeled Runway</p>
          <p className={`text-6xl font-bold mb-1 ${runwayColor}`}>
            {modeledRunway}
            <span className="text-2xl font-normal ml-1">days</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Baseline: {BASE_RUNWAY} days ·{" "}
            <span className={totalDelta >= 0 ? "text-green-600" : "text-red-600"}>
              {totalDelta >= 0 ? "+" : ""}
              {totalDelta} days from scenarios
            </span>
          </p>
        </div>

        {/* Sliders */}
        <div className="space-y-6">
          <ScenarioSlider
            label="Hire someone"
            description="Monthly salary cost"
            value={newHire}
            min={0}
            max={8000}
            step={200}
            format={(v) => (v === 0 ? "No new hire" : `$${v.toLocaleString()}/mo`)}
            impact={hireDelta}
            onChange={setNewHire}
          />

          <ScenarioSlider
            label="Raise prices"
            description="Revenue increase percentage"
            value={priceIncrease}
            min={0}
            max={30}
            step={1}
            format={(v) => (v === 0 ? "No change" : `+${v}%`)}
            impact={priceDelta}
            onChange={setPriceIncrease}
          />

          <ScenarioSlider
            label="Cut expenses"
            description="Monthly savings from cutting costs"
            value={cutExpense}
            min={0}
            max={3000}
            step={100}
            format={(v) => (v === 0 ? "No cuts" : `$${v.toLocaleString()}/mo saved`)}
            impact={cutDelta}
            onChange={setCutExpense}
          />
        </div>

        <div className="mt-8 rounded-xl border border-border bg-muted/50 p-4 text-xs text-muted-foreground">
          Estimates based on trailing 90-day averages for Sweet Grace Bakery.
          Actual impact depends on timing of obligations and revenue variability.
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
  impact,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  impact: number;
  onChange: (v: number) => void;
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
          {impact !== 0 && (
            <p
              className={`text-xs font-medium ${impact > 0 ? "text-green-600" : "text-red-600"}`}
            >
              {impact > 0 ? "+" : ""}
              {impact} days
            </p>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-foreground"
      />
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}
