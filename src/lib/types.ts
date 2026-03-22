export const TRANSACTION_SOURCES = ["stripe", "banking", "manual"] as const;
export type TransactionSource = (typeof TRANSACTION_SOURCES)[number];

export const TRANSACTION_TYPES = ["invoice", "debit", "credit"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const INVOICE_STATUSES = ["paid", "unpaid"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const CATEGORIES = [
  "revenue",
  "payroll",
  "rent",
  "supplies",
  "subscriptions",
  "insurance",
  "taxes",
  "one-time",
  "unknown",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const RECURRENCE_PATTERNS = [
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
] as const;
export type RecurrencePattern = (typeof RECURRENCE_PATTERNS)[number];

export const ALERT_SCENARIOS = [
  "runway",
  "overdue_invoice",
  "subscription_waste",
  "revenue_concentration",
] as const;
export type AlertScenario = (typeof ALERT_SCENARIOS)[number];

export const SEVERITIES = ["red", "amber", "green"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SCENARIO_TYPES = [
  "new_hire",
  "price_increase",
  "cut_expense",
  "delay_payment",
] as const;
export type ScenarioType = (typeof SCENARIO_TYPES)[number];

export interface Transaction {
  id: string;
  business_id: string;
  source: TransactionSource;
  transaction_type: TransactionType;
  invoice_status: InvoiceStatus | null;
  invoice_date: string | null;
  customer_id: string | null;
  amount: number;
  description: string;
  category: Category | null;
  date: string;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  tags: string[];
}

export interface Alert {
  id: string;
  business_id: string;
  scenario: AlertScenario;
  severity: Severity;
  headline: string;
  detail: string;
  recommended_actions: RecommendedAction[];
  sms_sent: boolean;
  sms_sent_at: string | null;
  created_at: string;
}

export interface RecommendedAction {
  action: string;
  target: string;
  amount: number;
  impact: string;
}

export interface ForecastDay {
  date: string;
  projected_balance: number;
  is_danger: boolean;
  obligations: { description: string; amount: number }[];
  expected_revenue: number;
}

export interface Business {
  id: string;
  name: string;
  type: string;
  owner_phone: string;
  stripe_connected: boolean;
  banking_connected: boolean;
  current_balance: number;
  runway_days: number | null;
  runway_severity: Severity | null;
  created_at: string;
}

export interface ScenarioRequest {
  business_id: string;
  scenarios: ScenarioItem[];
}

export interface ScenarioItem {
  type: ScenarioType;
  params: Record<string, number | string>;
}

// --- API Response types ---

export interface MockStripeResponse {
  transactions: Transaction[];
  count: number;
}

export interface MockBankingResponse {
  account: {
    id: string;
    business_id: string;
    type: string;
    current_balance: number;
    as_of: string;
  };
  transactions: Transaction[];
  count: number;
}

export interface ConnectRequest {
  business_name: string;
  business_type: string;
  owner_phone: string;
}

export interface ConnectResponse {
  business: Business;
  transactions_imported: number;
}

export interface AnalyzeResponse {
  business_id: string;
  transactions_categorized: number;
  runway_days: number;
  runway_severity: Severity;
  alerts_created: {
    id: string;
    scenario: AlertScenario;
    severity: Severity;
    headline: string;
  }[];
  sms_sent: boolean;
}

export interface AnalyzeStreamTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  source: TransactionSource;
  invoice_status: InvoiceStatus | null;
  category: Category | null;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
}

export interface AnalyzeStartedEvent {
  type: "analysis_started";
  business_id: string;
  total_transactions: number;
  batch_size: number;
  total_batches: number;
}

export interface AnalyzeBatchStartedEvent {
  type: "batch_started";
  business_id: string;
  batch_number: number;
  batch_size: number;
  transactions: AnalyzeStreamTransaction[];
}

export interface AnalyzeBatchCompletedEvent {
  type: "batch_completed";
  business_id: string;
  batch_number: number;
  processed_count: number;
  transactions: AnalyzeStreamTransaction[];
}

export interface AnalyzeFallbackUsedEvent {
  type: "fallback_used";
  business_id: string;
  batch_number: number;
  fallback_count: number;
}

export interface AnalyzeCompletedEvent extends AnalyzeResponse {
  type: "analysis_completed";
}

export interface AnalyzeFailedEvent {
  type: "analysis_failed";
  code: string;
  message: string;
}

export type AnalyzeStreamEvent =
  | AnalyzeStartedEvent
  | AnalyzeBatchStartedEvent
  | AnalyzeBatchCompletedEvent
  | AnalyzeFallbackUsedEvent
  | AnalyzeCompletedEvent
  | AnalyzeFailedEvent;

export interface DashboardResponse {
  business: Pick<Business, "id" | "name" | "current_balance" | "runway_days" | "runway_severity">;
  alerts: Alert[];
  forecast_summary: {
    horizon_days: number;
    min_projected_balance: number;
    danger_dates: string[];
    days: ForecastDay[];
  };
  upcoming_obligations: {
    description: string;
    amount: number;
    due_date: string;
    category: Category;
    is_recurring: boolean;
  }[];
}

export interface ForecastResponse {
  business_id: string;
  generated_at: string;
  horizon_days: number;
  current_balance: number;
  avg_daily_net_burn: number;
  runway_days: number;
  first_negative_date: string | null;
  days: ForecastDay[];
}

export interface AlertsResponse {
  business_id: string;
  alerts: Alert[];
}

export interface SendSmsResponse {
  alert_id: string;
  sms_sent: boolean;
  sms_sent_at: string;
  to: string;
  message_preview: string;
}

export interface CallAlertResponse {
  success: boolean;
}

export interface SendReminderResponse {
  sent: boolean;
  sent_at: string;
  to: string;
  subject: string;
  message_preview: string;
}

export interface ScenarioResponse {
  business_id: string;
  baseline: {
    runway_days: number;
    first_negative_date: string | null;
  };
  modeled: {
    runway_days: number;
    first_negative_date: string | null;
    delta_days: number;
  };
  scenarios_applied: {
    type: ScenarioType;
    impact_days: number;
  }[];
}
