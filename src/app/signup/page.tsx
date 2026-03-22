"use client";

import { Plane, ArrowRight, TrendingDown, Bell, Zap, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const GREEN = "#166534";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    businessName: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function validate(): boolean {
    const next: Partial<Record<keyof typeof form, string>> = {};
    if (!form.name.trim()) next.name = "Required";
    if (!form.businessName.trim()) next.businessName = "Required";
    if (!form.phone.trim()) next.phone = "Required";
    if (form.password.length < 8) next.password = "At least 8 characters";
    if (form.password !== form.confirmPassword)
      next.confirmPassword = "Passwords don't match";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          businessName: form.businessName,
          phone: form.phone,
          password: form.password,
        }),
      });

      const data = await res.json() as { redirect?: string; error?: string };

      if (!res.ok || data.error) {
        setServerError(data.error ?? "Something went wrong. Please try again.");
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
          <Plane className="size-4" style={{ color: GREEN }} />
          <span style={{ color: GREEN }}>Runway</span>
        </div>

        <div className="mt-16 lg:mt-0 lg:flex-1 lg:flex lg:flex-col lg:justify-center">
          <p
            className="text-[10px] font-mono tracking-[0.2em] uppercase mb-5"
            style={{ color: GREEN }}
          >
            {"// financial_intelligence / 2026"}
          </p>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-[1.08] mb-6">
            Start knowing before
            <br />
            <span className="font-extrabold">your money runs out.</span>
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

      {/* ── Right panel: form ── */}
      <div className="lg:w-[45%] flex items-center justify-center px-8 py-12 lg:px-16 bg-background border-l border-border">
        <div className="w-full max-w-sm">
          <p
            className="text-[10px] font-mono tracking-[0.2em] uppercase mb-3"
            style={{ color: GREEN }}
          >
            {"// create_account"}
          </p>
          <h2 className="text-2xl font-bold tracking-tight mb-1">
            Create your account
          </h2>
          <p className="text-sm text-muted-foreground mb-8">
            Tell us about yourself to get started.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field
              label="Full Name"
              id="name"
              type="text"
              placeholder="Jane Smith"
              value={form.name}
              error={errors.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            />
            <Field
              label="Business Name"
              id="businessName"
              type="text"
              placeholder="Sweet Grace Bakery"
              value={form.businessName}
              error={errors.businessName}
              onChange={(v) => setForm((f) => ({ ...f, businessName: v }))}
            />
            <Field
              label="Phone Number"
              id="phone"
              type="tel"
              placeholder="+1 1234567890"
              value={form.phone}
              error={errors.phone}
              onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
            />
            <PasswordField
              label="Password"
              id="password"
              placeholder="At least 8 characters"
              value={form.password}
              error={errors.password}
              show={showPassword}
              onToggle={() => setShowPassword((s) => !s)}
              onChange={(v) => setForm((f) => ({ ...f, password: v }))}
            />
            <PasswordField
              label="Confirm Password"
              id="confirmPassword"
              placeholder="Repeat your password"
              value={form.confirmPassword}
              error={errors.confirmPassword}
              show={showPassword}
              onToggle={() => setShowPassword((s) => !s)}
              onChange={(v) => setForm((f) => ({ ...f, confirmPassword: v }))}
            />

            {serverError && (
              <p className="text-xs text-red-600 -mt-1">{serverError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full flex items-center justify-between px-5 py-3.5 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
              style={{ backgroundColor: GREEN }}
            >
              {submitting ? "Creating account…" : "Create account"}
              <ArrowRight className="size-4 shrink-0" />
            </button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground text-center">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium underline underline-offset-4"
              style={{ color: GREEN }}
            >
              Log in
            </Link>
          </p>
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
        style={{ borderColor: `${GREEN}50`, color: GREEN }}
      >
        {icon}
      </div>
      <p className="text-sm" style={{ color: "oklch(0.708 0 0)" }}>
        {label}
      </p>
    </div>
  );
}

function Field({
  label, id, type, placeholder, value, error, onChange,
}: {
  label: string; id: string; type: string; placeholder: string;
  value: string; error?: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium tracking-tight">
        {label}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 text-sm border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow"
        style={{ borderRadius: 0 }}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function PasswordField({
  label, id, placeholder, value, error, show, onToggle, onChange,
}: {
  label: string; id: string; placeholder: string;
  value: string; error?: string; show: boolean;
  onToggle: () => void; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium tracking-tight">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2.5 pr-10 text-sm border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow"
          style={{ borderRadius: 0 }}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          tabIndex={-1}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
