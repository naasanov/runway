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
  AnalyzeResponse,
  ConnectRequest,
  ConnectResponse,
  DashboardResponse,
  ScenarioRequest,
  ScenarioResponse,
  SendReminderResponse,
} from "./types";

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
  sendReminder: (body: {
    business_id: string;
    customer_id: string;
    invoice_transaction_id: string;
    amount_owed: number;
  }) => api.post<SendReminderResponse>("/api/actions/send-reminder", body),
};
