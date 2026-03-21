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
