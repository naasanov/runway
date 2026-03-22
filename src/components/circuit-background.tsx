"use client";

// Circuit trace background — connect/streaming screen only.
// Connected full-width paths. Outward pulse via SVG SMIL radial gradient:
// a wave centered at x=50% expands its rx from 0→full, so the inner wing
// edges light first and the outer edges illuminate last.
// Two patterns: idle ↔ analyzing, fading through blank on step change.

type ConnectStep = "idle" | "connecting" | "analyzing" | "done";

const STROKE = "#166534";
const VIEW = "0 0 1440 900";

// Three mask layers (all intersected):
//   1. Top nav guard — hides the first 56px (h-14 nav)
//   2. Center cutout — fades circuit before it reaches the content column
//   3. Outer edge fade — dissolves at viewport edges
const MASK = [
  "linear-gradient(to bottom, transparent 56px, black 88px)",
  "linear-gradient(to right, transparent 0%, black 10%, black 22%, transparent 33%, transparent 67%, black 78%, black 90%, transparent 100%)",
].join(", ");

// ── Shared paths component (renders both base and pulse layers) ──────────────

function Paths({ id }: { id: string }) {
  const maskId = `waveM-${id}`;
  const gradId = `pulseWave-${id}`;

  return (
    <>
      <defs>
        {/* Radial gradient: white at center, fades to transparent at edges.
            rx animates 0 → 0.62 → 0, creating an outward wave. */}
        <radialGradient
          id={gradId}
          cx="0.5"
          cy="0.5"
          ry="1"
          fx="0.5"
          fy="0.5"
          gradientUnits="objectBoundingBox"
        >
          {/* @ts-ignore — SVG SMIL */}
          <animate
            attributeName="rx"
            values="0;0.62;0"
            dur="3.6s"
            repeatCount="indefinite"
            calcMode="spline"
            keyTimes="0;0.5;1"
            keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
          />
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="65%" stopColor="white" stopOpacity="0.7" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>

        <mask id={maskId}>
          <rect width="100%" height="100%" fill={`url(#${gradId})`} />
        </mask>
      </defs>

      {/* Base layer — constant faint traces */}
      <g stroke={STROKE} strokeWidth="1" fill="none" strokeLinecap="square" opacity="0.11">
        <Traces />
      </g>

      {/* Pulse layer — same traces, revealed by expanding radial mask */}
      <g
        stroke={STROKE}
        strokeWidth="1"
        fill="none"
        strokeLinecap="square"
        opacity="0.38"
        mask={`url(#${maskId})`}
      >
        <Traces />
      </g>
    </>
  );
}

// ── Pattern 1: Idle traces (horizontal tiers + branches) ────────────────────

function Traces() {
  return (
    <>
      {/* Tier 1 · y ~80–180 */}
      <path d="M 0,120 H 260 V 80 H 460 V 120 H 660 V 160 H 820 V 120 H 1020 V 80 H 1200 V 120 H 1440" />
      <path d="M 360,80 V 40 H 520" />
      <path d="M 860,160 H 980 V 200 H 1120" />
      <path d="M 180,120 V 160 H 300" />
      <path d="M 1260,120 V 80 H 1380 V 40" />

      {/* Tier 2 · y ~320–440 */}
      <path d="M 0,380 H 200 V 340 H 420 V 380 H 620 V 420 H 800 V 380 H 1000 V 340 H 1180 V 380 H 1440" />
      <path d="M 140,340 V 280 H 320 V 240" />
      <path d="M 700,420 H 840 V 460 H 960" />
      <path d="M 520,380 V 340 H 640" />
      <path d="M 1100,340 V 300 H 1260 V 260" />
      <path d="M 1360,380 V 420 H 1440" />

      {/* Tier 3 · y ~580–700 */}
      <path d="M 0,640 H 180 V 600 H 400 V 640 H 620 V 680 H 800 V 640 H 1020 V 600 H 1220 V 640 H 1440" />
      <path d="M 280,600 V 560 H 460 V 520" />
      <path d="M 860,680 V 720 H 1060 V 760" />
      <path d="M 100,640 V 680 H 240" />
      <path d="M 1300,600 V 560 H 1440" />

      {/* Vertical connectors */}
      <path d="M 260,160 V 280 H 380 V 340" />
      <path d="M 700,160 V 240 H 840 V 340" />
      <path d="M 1120,200 V 340" />
      <path d="M 340,460 V 540 H 460 V 600" />
      <path d="M 740,460 V 520 H 600 V 560" />
      <path d="M 1060,460 V 540 H 1180 V 600" />

      {/* Detail segments */}
      <path d="M 480,240 H 600 V 280 H 720" />
      <path d="M 920,260 H 1040 V 300" />
      <path d="M 200,780 H 400 V 820 H 560" />
      <path d="M 880,800 H 1060 V 760 H 1180" />
    </>
  );
}

// ── Pattern 2: Analyzing traces (more vertical / channeled feel) ─────────────

function AnalyzingPaths({ id }: { id: string }) {
  const maskId = `waveM-${id}`;
  const gradId = `pulseWave-${id}`;

  return (
    <>
      <defs>
        <radialGradient
          id={gradId}
          cx="0.5"
          cy="0.5"
          ry="1"
          fx="0.5"
          fy="0.5"
          gradientUnits="objectBoundingBox"
        >
          {/* @ts-ignore — SVG SMIL */}
          <animate
            attributeName="rx"
            values="0;0.62;0"
            dur="2.8s"
            repeatCount="indefinite"
            calcMode="spline"
            keyTimes="0;0.5;1"
            keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
          />
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="65%" stopColor="white" stopOpacity="0.7" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id={maskId}>
          <rect width="100%" height="100%" fill={`url(#${gradId})`} />
        </mask>
      </defs>

      <g stroke={STROKE} strokeWidth="1" fill="none" strokeLinecap="square" opacity="0.11">
        <AnalyzingTraces />
      </g>
      <g
        stroke={STROKE}
        strokeWidth="1"
        fill="none"
        strokeLinecap="square"
        opacity="0.38"
        mask={`url(#${maskId})`}
      >
        <AnalyzingTraces />
      </g>
    </>
  );
}

function AnalyzingTraces() {
  return (
    <>
      {/* Long vertical channels with horizontal crossbars */}
      <path d="M 0,100 H 120 V 200 H 60 V 400 H 200 V 320 H 380 V 480 H 240 V 620 H 420 V 720 H 180 V 820" />
      <path d="M 0,300 H 80 V 450 H 160 V 560 H 80 V 680" />
      <path d="M 280,140 V 280 H 440 V 440 H 340 V 580 H 480 V 700" />

      <path d="M 1440,100 H 1320 V 200 H 1380 V 400 H 1240 V 320 H 1060 V 480 H 1200 V 620 H 1020 V 720 H 1260 V 820" />
      <path d="M 1440,300 H 1360 V 450 H 1280 V 560 H 1360 V 680" />
      <path d="M 1160,140 V 280 H 1000 V 440 H 1100 V 580 H 960 V 700" />

      {/* Horizontal crosslinks in center-ish area */}
      <path d="M 440,200 H 580 V 160 H 700 V 200 H 840" />
      <path d="M 480,480 H 620 V 520 H 760 V 480 H 960" />
      <path d="M 380,720 H 560 V 760 H 720 V 720 H 880" />

      {/* Detail branches */}
      <path d="M 560,160 V 100 H 680" />
      <path d="M 760,520 V 600 H 880 V 560" />
    </>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function CircuitBackground({ step }: { step: ConnectStep }) {
  const isIdle = step === "idle";

  const svgBase = {
    viewBox: VIEW,
    preserveAspectRatio: "xMidYMid slice" as const,
    xmlns: "http://www.w3.org/2000/svg",
    className: "absolute inset-0 h-full w-full",
    style: {
      maskImage: MASK,
      WebkitMaskImage: MASK,
      maskComposite: "intersect" as const,
      WebkitMaskComposite: "source-in" as const,
    },
  };

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden hidden md:block"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* Pattern 1: Idle */}
      <svg
        {...svgBase}
        style={{
          ...svgBase.style,
          opacity: isIdle ? 1 : 0,
          transition: "opacity 550ms ease-in-out",
        }}
      >
        <Paths id="idle" />
      </svg>

      {/* Pattern 2: Analyzing — fades in after P1 is gone */}
      <svg
        {...svgBase}
        style={{
          ...svgBase.style,
          opacity: isIdle ? 0 : 1,
          transition: isIdle
            ? "opacity 400ms ease-in-out"
            : "opacity 650ms ease-in-out 520ms",
        }}
      >
        <AnalyzingPaths id="analyzing" />
      </svg>
    </div>
  );
}
