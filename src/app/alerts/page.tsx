"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Bell, MessageSquare } from "lucide-react";
import { Nav } from "@/components/nav";
import { ApiError, runwayApi } from "@/lib/api";
import type { Alert, AlertsResponse } from "@/lib/types";

export default function AlertsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams.get("b");
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [businessName, setBusinessName] = useState<string>("Business");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) {
      router.replace("/connect");
      return;
    }

    const selectedBusinessId = businessId;
    let cancelled = false;

    async function loadAlerts() {
      try {
        setError(null);
        const [alertsResponse, dashboardResponse] = await Promise.all([
          runwayApi.getAlerts(selectedBusinessId),
          runwayApi.getDashboard(selectedBusinessId),
        ]);

        if (!cancelled) {
          setData(alertsResponse);
          setBusinessName(dashboardResponse.business.name);
        }
      } catch (alertsError) {
        if (!cancelled) {
          setError(
            alertsError instanceof ApiError
              ? alertsError.message
              : "We couldn't load alert history."
          );
        }
      }
    }

    void loadAlerts();

    return () => {
      cancelled = true;
    };
  }, [businessId, router]);

  if (!businessId) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-3xl mx-auto px-6 py-16">
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="font-medium">No business selected.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Connect a business first so we know which alerts to load.
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

  return (
    <div className="min-h-screen bg-background pb-mobile-nav">
      <Nav businessId={businessId} />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="size-5" />
            Alert History
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {data ? `All alerts sent for ${businessName}` : "Loading alert history..."}
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
            {error}
          </div>
        )}

        {!error && !data && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-24 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {data && (
          <div className="space-y-3">
            {data.alerts.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function AlertRow({ alert }: { alert: Alert }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 size-2.5 rounded-full shrink-0 ${
              alert.severity === "red"
                ? "bg-red-500"
                : alert.severity === "amber"
                  ? "bg-amber-400"
                  : "bg-green-500"
            }`}
          />
          <div>
            <p className="font-medium text-sm">{alert.headline}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{alert.detail}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground">
            {format(parseISO(alert.created_at), "MMM d, h:mm a")}
          </p>
          {alert.sms_sent && (
            <div className="flex items-center gap-1 text-xs text-green-600 mt-1 justify-end">
              <MessageSquare className="size-3" />
              SMS sent
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
