export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

import type {
  AlertsResponse,
  CallAlertResponse,
  MeResponse,
  AnalyzeBatchCompletedEvent,
  AnalyzeBatchStartedEvent,
  AnalyzeCompletedEvent,
  AnalyzeFailedEvent,
  AnalyzeFallbackUsedEvent,
  AnalyzeResponse,
  AnalyzeStartedEvent,
  ConnectRequest,
  ConnectResponse,
  DashboardResponse,
  ScenarioRequest,
  ScenarioResponse,
  SendReminderResponse,
} from "./types";

export interface AnalyzeStreamHandlers {
  onAnalysisStarted?: (event: AnalyzeStartedEvent) => void;
  onBatchStarted?: (event: AnalyzeBatchStartedEvent) => void;
  onBatchCompleted?: (event: AnalyzeBatchCompletedEvent) => void;
  onFallbackUsed?: (event: AnalyzeFallbackUsedEvent) => void;
  onAnalysisCompleted?: (event: AnalyzeCompletedEvent) => void;
  onAnalysisFailed?: (event: AnalyzeFailedEvent) => void;
  onError?: (error: Error) => void;
}

async function request<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(path, {
    method,
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText, code: "UNKNOWN" }));
    throw new ApiError(err.error || `Request failed: ${res.status}`, err.code || "UNKNOWN", res.status);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};

export const runwayApi = {
  connectBusiness: (body: ConnectRequest) =>
    api.post<ConnectResponse>("/api/business/connect", body),
  analyzeBusiness: (businessId: string) =>
    api.post<AnalyzeResponse>(`/api/business/${businessId}/analyze`),
  getDashboard: (businessId: string) =>
    api.get<DashboardResponse>(`/api/business/${businessId}/dashboard`),
  getAlerts: (businessId: string) =>
    api.get<AlertsResponse>(`/api/business/${businessId}/alerts`),
  modelScenario: (body: ScenarioRequest) =>
    api.post<ScenarioResponse>("/api/scenario/model", body),
  getMe: () => api.get<MeResponse>('/api/auth/me'),
  triggerCall: (message: string, toNumber?: string) =>
    api.post<CallAlertResponse>('/api/alerts/call', { message, toNumber }),
  scheduleCall: (toNumber: string, businessId: string) =>
    api.post<CallAlertResponse>('/api/alerts/scheduled-call', { toNumber, businessId }),
  sendReminder: (body: {
    business_id: string;
    customer_id: string;
    invoice_transaction_id: string;
    amount_owed: number;
  }) => api.post<SendReminderResponse>("/api/actions/send-reminder", body),
  openAnalyzeStream: (
    businessId: string,
    handlers: AnalyzeStreamHandlers,
  ): (() => void) => {
    const source = new EventSource(`/api/business/${businessId}/analyze/stream`);
    let closed = false;
    let completed = false;

    const close = () => {
      if (closed) return;
      closed = true;
      source.close();
    };

    const attach = <T>(
      eventName: string,
      handler: ((event: T) => void) | undefined,
      terminal = false,
    ) => {
      source.addEventListener(eventName, (event) => {
        if (!handler) {
          if (terminal) {
            completed = true;
            close();
          }
          return;
        }

        try {
          handler(JSON.parse((event as MessageEvent<string>).data) as T);
          if (terminal) {
            completed = true;
            close();
          }
        } catch (error) {
          close();
          handlers.onError?.(
            error instanceof Error
              ? error
              : new Error("Failed to parse analysis stream event."),
          );
        }
      });
    };

    attach<AnalyzeStartedEvent>(
      "analysis_started",
      handlers.onAnalysisStarted,
    );
    attach<AnalyzeBatchStartedEvent>(
      "batch_started",
      handlers.onBatchStarted,
    );
    attach<AnalyzeBatchCompletedEvent>(
      "batch_completed",
      handlers.onBatchCompleted,
    );
    attach<AnalyzeFallbackUsedEvent>(
      "fallback_used",
      handlers.onFallbackUsed,
    );
    attach<AnalyzeCompletedEvent>(
      "analysis_completed",
      handlers.onAnalysisCompleted,
      true,
    );
    attach<AnalyzeFailedEvent>(
      "analysis_failed",
      handlers.onAnalysisFailed,
      true,
    );

    source.onerror = () => {
      if (closed || completed) return;
      close();
      handlers.onError?.(new Error("Analysis stream disconnected."));
    };

    return close;
  },
};
