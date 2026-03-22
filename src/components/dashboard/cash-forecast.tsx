"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { colors } from "@/lib/colors";

const forecastData = [
  { date: "Mar 21", balance: 6840 },
  { date: "Mar 22", balance: 7100 },
  { date: "Mar 23", balance: 7520 },
  { date: "Mar 24", balance: 7940 },
  { date: "Mar 25", balance: 7650 },
  { date: "Mar 26", balance: 7380 },
  { date: "Mar 27", balance: 7120 },
  { date: "Mar 28", balance: -2200 },
  { date: "Mar 29", balance: -1640 },
  { date: "Mar 30", balance: -1080 },
  { date: "Mar 31", balance: -520 },
  { date: "Apr 1", balance: -3120 },
  { date: "Apr 2", balance: -2740 },
  { date: "Apr 3", balance: -2360 },
  { date: "Apr 4", balance: -1980 },
  { date: "Apr 5", balance: -1400 },
  { date: "Apr 6", balance: -820 },
  { date: "Apr 7", balance: -440 },
  { date: "Apr 8", balance: -60 },
  { date: "Apr 9", balance: 320 },
  { date: "Apr 10", balance: 900 },
  { date: "Apr 11", balance: 1280 },
  { date: "Apr 12", balance: 1860 },
  { date: "Apr 13", balance: 2440 },
  { date: "Apr 14", balance: 2120 },
  { date: "Apr 15", balance: 1800 },
  { date: "Apr 16", balance: 2380 },
  { date: "Apr 17", balance: 2960 },
  { date: "Apr 18", balance: 3540 },
  { date: "Apr 19", balance: 4120 },
];

// Where $0 falls in the Y-axis gradient (domain: -4000 to 9000)
const ZERO_OFFSET = 9000 / (9000 + 4000); // ≈ 0.692

function formatYAxis(value: number): string {
  if (value === 0) return "$0";
  const abs = Math.abs(value);
  if (abs >= 1000)
    return `${value < 0 ? "-" : ""}$${(abs / 1000).toFixed(0)}K`;
  return `$${value}`;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  const negative = value < 0;

  return (
    <div className="bg-runway-card border border-runway-border rounded-lg px-3 py-2 shadow-2xl">
      <p className="text-[11px] text-runway-muted mb-0.5">{label}</p>
      <p
        className={`text-sm font-mono font-semibold tabular-nums ${
          negative ? "text-runway-danger" : "text-runway-positive"
        }`}
      >
        {negative ? "-" : ""}${Math.abs(value).toLocaleString()}
      </p>
    </div>
  );
}

export function CashForecast() {
  const offset = ZERO_OFFSET;

  return (
    <div className="bg-runway-card border border-runway-border rounded-xl p-4 flex flex-col h-full animate-fade-in stagger-2">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-runway-text font-display">
            30-Day Cash Forecast
          </h3>
          <p className="text-[11px] text-runway-muted mt-0.5">
            Projected daily closing balance
          </p>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-runway-positive" />
            <span className="text-runway-muted">Positive</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-runway-danger" />
            <span className="text-runway-muted">Negative</span>
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={forecastData}
            margin={{ top: 8, right: 12, bottom: 0, left: -4 }}
          >
            <defs>
              <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={colors.positive}
                  stopOpacity={0.2}
                />
                <stop
                  offset={`${offset * 100}%`}
                  stopColor={colors.positive}
                  stopOpacity={0.02}
                />
                <stop
                  offset={`${offset * 100}%`}
                  stopColor={colors.danger}
                  stopOpacity={0.02}
                />
                <stop
                  offset="100%"
                  stopColor={colors.danger}
                  stopOpacity={0.3}
                />
              </linearGradient>
              <linearGradient id="balanceLine" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset={`${offset * 100}%`}
                  stopColor={colors.positive}
                />
                <stop
                  offset={`${offset * 100}%`}
                  stopColor={colors.danger}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke={colors.border}
              strokeOpacity={0.5}
              vertical={false}
            />

            <XAxis
              dataKey="date"
              tick={{ fill: colors.muted, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              domain={[-4000, 9000]}
              ticks={[-3000, 0, 3000, 6000, 9000]}
              tick={{ fill: colors.muted, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatYAxis}
              width={40}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* $0 baseline */}
            <ReferenceLine
              y={0}
              stroke={colors.muted}
              strokeWidth={1}
              strokeOpacity={0.6}
              strokeDasharray="2 2"
            />

            {/* Today */}
            <ReferenceLine
              x="Mar 21"
              stroke={colors.accent}
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: "TODAY",
                position: "insideTopRight",
                fill: colors.accent,
                fontSize: 9,
                fontWeight: 600,
              }}
            />

            {/* DANGER: Payroll date */}
            <ReferenceLine
              x="Mar 28"
              stroke={colors.danger}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: "MAR 28 — PAYROLL",
                position: "insideTopRight",
                fill: colors.danger,
                fontSize: 9,
                fontWeight: 700,
              }}
            />

            <Area
              type="monotone"
              dataKey="balance"
              stroke="url(#balanceLine)"
              strokeWidth={2}
              fill="url(#balanceFill)"
              animationDuration={1500}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
