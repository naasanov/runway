"use client";

import { Plane, ArrowRight, TrendingDown, Bell, Zap, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const GREEN = "#166534";
const GREEN_LIGHT = "#4ade80";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ phone: "", password: "" });
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.password) return;

    setSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone, password: form.password }),
      });

      const data = await res.json() as { redirect?: string; error?: string };

      if (!res.ok || data.error) {
        setServerError(data.error ?? "Invalid email or password.");
        setSubmitting(false);
        return;
      }

      router.push(data.redirect ?? "/connect");
    } catch {
      setServerError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Left panel: dark brand panel ── */}
      <div
        className="lg:w-[55%] flex flex-col px-10 py-10 lg:px-16 lg:py-14"
        style={{ backgroundColor: "oklch(0.145 0 0)", color: "oklch(0.985 0 0)" }}
      >
        <div className="flex items-center gap-2 font-semibold mb-auto">
          <Plane className="size-4" style={{ color: GREEN_LIGHT }} />
          <span style={{ color: GREEN_LIGHT }}>Runway</span>
        </div>

        <div className="mt-16 lg:mt-0 lg:flex-1 lg:flex lg:flex-col lg:justify-center">
          <p
            className="text-[10px] font-mono tracking-[0.2em] uppercase mb-5"
            style={{ color: GREEN_LIGHT }}
          >
            {"// financial_intelligence / 2026"}
          </p>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-[1.08] mb-6">
            Know before your
            <br />
            <span className="font-extrabold">money runs out.</span>
          </h1>
          <p className="text-sm leading-relaxed mb-10" style={{ color: "oklch(0.708 0 0)" }}>
            AI-powered cash flow intelligence for small business owners.
            Plain-language alerts — 9 days before the crisis hits.
          </p>

          <div className="flex flex-col gap-4">
            <ValueProp icon={<TrendingDown className="size-4" />} label="30/60/90-day cash forecast" />
            <ValueProp icon={<Bell className="size-4" />} label="SMS alerts before you're in trouble" />
            <ValueProp icon={<Zap className="size-4" />} label="Actionable fixes with dollar impact" />
          </div>
        </div>

        <p
          className="mt-12 text-[10px] font-mono tracking-[0.2em] uppercase"
          style={{ color: "oklch(0.439 0 0)" }}
        >
          {"// Runway · HackDuke 2026"}
        </p>
      </div>

      {/* ── Right panel: login form ── */}
      <div className="lg:w-[45%] flex items-center justify-center px-8 py-12 lg:px-16 bg-background border-l border-border">
        <div className="w-full max-w-sm">
          <p
            className="text-[10px] font-mono tracking-[0.2em] uppercase mb-3"
            style={{ color: GREEN }}
          >
            {"// welcome_back"}
          </p>
          <h2 className="text-2xl font-bold tracking-tight mb-1">
            Log in to Runway
          </h2>
          <p className="text-sm text-muted-foreground mb-8">
            Your cash flow intelligence dashboard.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="text-xs font-medium tracking-tight">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="+1 1234567890"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow"
                style={{ borderRadius: 0 }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-medium tracking-tight">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Your password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full px-3 py-2.5 pr-10 text-sm border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow"
                  style={{ borderRadius: 0 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {serverError && (
              <p className="text-xs text-red-600">{serverError}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !form.phone || !form.password}
              className="mt-2 w-full flex items-center justify-between px-5 py-3.5 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
              style={{ backgroundColor: GREEN }}
            >
              {submitting ? "Logging in…" : "Log in"}
              <ArrowRight className="size-4 shrink-0" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-medium underline underline-offset-4"
                style={{ color: GREEN }}
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ValueProp({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="size-7 flex items-center justify-center border shrink-0"
        style={{ borderColor: `${GREEN_LIGHT}50`, color: GREEN_LIGHT }}
      >
        {icon}
      </div>
      <p className="text-sm" style={{ color: "oklch(0.708 0 0)" }}>
        {label}
      </p>
    </div>
  );
}
