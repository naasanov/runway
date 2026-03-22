/**
 * Integration-style route tests across multiple API handlers.
 *
 * External services stay mocked, but route handlers share one in-memory
 * Supabase-like store so we can verify data flows across endpoints.
 */

import { NextRequest } from "next/server";

type BusinessRow = {
  id: string;
  name: string;
  type: string;
  owner_phone: string;
  stripe_connected: boolean;
  banking_connected: boolean;
  current_balance: number;
  runway_days?: number | null;
  runway_severity?: string | null;
};

type TransactionRow = {
  id: string;
  business_id: string;
  source: string;
  transaction_type: string;
  invoice_status: string | null;
  invoice_date: string | null;
  customer_id: string | null;
  amount: number;
  description: string;
  category: string | null;
  date: string;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  tags: string[];
};

type AlertRow = {
  id: string;
  business_id: string;
  scenario: string;
  severity: string;
  headline: string;
  detail: string;
  recommended_actions: unknown[];
  sms_sent: boolean;
  sms_sent_at: string | null;
  created_at: string;
};

type RowRecord = Record<string, unknown>;

const store = {
  businesses: [] as BusinessRow[],
  transactions: [] as TransactionRow[],
  alerts: [] as AlertRow[],
  failTransactionsInsert: false,
};

function resetStore() {
  store.businesses = [];
  store.transactions = [];
  store.alerts = [];
  store.failTransactionsInsert = false;
}

function matchesFilters<T extends Record<string, unknown>>(
  row: T,
  filters: Array<{ field: string; value: unknown; kind: "eq" | "is" | "not" }>,
) {
  return filters.every((filter) => {
    if (filter.kind === "eq") {
      return row[filter.field] === filter.value;
    }
    if (filter.kind === "not") {
      return row[filter.field] !== filter.value;
    }
    return row[filter.field] === filter.value;
  });
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function getTable(table: string): RowRecord[] {
  if (table === "businesses") {
    return store.businesses as RowRecord[];
  }
  if (table === "transactions") {
    return store.transactions as RowRecord[];
  }
  if (table === "alerts") {
    return store.alerts as RowRecord[];
  }
  throw new Error(`Unsupported table ${table}`);
}

function makeSelectBuilder(table: string) {
  const rows = getTable(table);
  const filters: Array<{ field: string; value: unknown; kind: "eq" | "is" | "not" }> =
    [];

  const builder = {
    data: clone(rows),
    error: null as unknown,
    eq(field: string, value: unknown) {
      filters.push({ field, value, kind: "eq" });
      builder.data = clone(rows.filter((row) => matchesFilters(row, filters)));
      return builder;
    },
    is(field: string, value: unknown) {
      filters.push({ field, value, kind: "is" });
      builder.data = clone(rows.filter((row) => matchesFilters(row, filters)));
      return builder;
    },
    not(field: string, operator: string, value: unknown) {
      if (operator !== "is") {
        throw new Error(`Unsupported not operator ${operator}`);
      }
      filters.push({ field, value, kind: "not" });
      builder.data = clone(rows.filter((row) => matchesFilters(row, filters)));
      return builder;
    },
    order(field: string, options?: { ascending?: boolean }) {
      const ascending = options?.ascending ?? true;
      builder.data = clone([...builder.data].sort((left, right) => {
        const leftValue = String(left[field as keyof typeof left] ?? "");
        const rightValue = String(right[field as keyof typeof right] ?? "");
        return ascending
          ? leftValue.localeCompare(rightValue)
          : rightValue.localeCompare(leftValue);
      }));
      return builder;
    },
    single() {
      const data = builder.data[0] ?? null;
      return Promise.resolve({ data, error: data ? null : new Error("Not found") });
    },
  };

  return builder;
}

function makeInsertBuilder(table: string, payload: Record<string, unknown> | Record<string, unknown>[]) {
  const rows = getTable(table);
  const inserted = Array.isArray(payload) ? payload : [payload];

  if (table === "transactions" && store.failTransactionsInsert) {
    return {
      error: new Error("Transaction insert failed"),
    };
  }

  rows.push(...clone(inserted));

  return {
    select() {
      return {
        single() {
          return Promise.resolve({
            data: clone(inserted[0] ?? null),
            error: null,
          });
        },
      };
    },
    error: null,
  };
}

function makeUpsertBuilder(
  table: string,
  payload: Record<string, unknown> | Record<string, unknown>[],
  options?: { onConflict?: string },
) {
  const rows = getTable(table);
  const records = clone(Array.isArray(payload) ? payload : [payload]);
  const conflictField = options?.onConflict ?? "id";

  records.forEach((record) => {
    const existingIndex = rows.findIndex(
      (row) => (row as RowRecord)[conflictField] === record[conflictField],
    );

    if (existingIndex >= 0) {
      rows[existingIndex] = {
        ...rows[existingIndex],
        ...record,
      };
      return;
    }

    rows.push(record);
  });

  return {
    select() {
      return Promise.resolve({
        data: clone(records),
        error: null,
      });
    },
    error: null,
  };
}

function makeDeleteBuilder(table: string) {
  const rows = getTable(table);

  return {
    eq(field: string, value: unknown) {
      for (let index = rows.length - 1; index >= 0; index -= 1) {
        if ((rows[index] as RowRecord)[field] === value) {
          rows.splice(index, 1);
        }
      }
      return { error: null };
    },
  };
}

function makeUpdateBuilder(
  table: string,
  payload: Record<string, unknown>,
) {
  const rows = getTable(table);
  const filters: Array<{ field: string; value: unknown; kind: "eq" | "is" }> =
    [];

  const builder = {
    data: null as unknown,
    error: null as unknown,
    eq(field: string, value: unknown) {
      filters.push({ field, value, kind: "eq" });
      const matching = rows.filter((row) => matchesFilters(row, filters));
      matching.forEach((row) => Object.assign(row, clone(payload)));
      builder.data = clone(matching[0] ?? null);
      return builder;
    },
    select() {
      return {
        single() {
          return Promise.resolve({
            data: clone(builder.data),
            error: builder.data ? null : new Error("Not found"),
          });
        },
      };
    },
  };

  return builder;
}

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn((table: string) => ({
      select: jest.fn(() => makeSelectBuilder(table)),
      insert: jest.fn((payload: Record<string, unknown> | Record<string, unknown>[]) =>
        makeInsertBuilder(table, payload),
      ),
      upsert: jest.fn((
        payload: Record<string, unknown> | Record<string, unknown>[],
        options?: { onConflict?: string },
      ) => makeUpsertBuilder(table, payload, options)),
      update: jest.fn((payload: Record<string, unknown>) =>
        makeUpdateBuilder(table, payload),
      ),
      delete: jest.fn(() => makeDeleteBuilder(table)),
    })),
  },
}));

function categorizeTransactionsFromPrompt(prompt: string) {
  const jsonStart = prompt.indexOf("[");
  const payload = JSON.parse(prompt.slice(jsonStart)) as TransactionRow[];

  return payload.map((txn) => {
    const description = txn.description.toLowerCase();
    const tags = txn.tags.map((tag) => tag.toLowerCase());

    if (txn.transaction_type === "invoice" || txn.amount > 0) {
      return {
        id: txn.id,
        category: "revenue",
        is_recurring: false,
        recurrence_pattern: null,
      };
    }

    if (description.includes("payroll")) {
      return {
        id: txn.id,
        category: "payroll",
        is_recurring: true,
        recurrence_pattern: "biweekly",
      };
    }

    if (description.includes("rent")) {
      return {
        id: txn.id,
        category: "rent",
        is_recurring: true,
        recurrence_pattern: "monthly",
      };
    }

    if (description.includes("insurance")) {
      return {
        id: txn.id,
        category: "insurance",
        is_recurring: true,
        recurrence_pattern: "quarterly",
      };
    }

    if (tags.includes("subscription") || description.includes("canva") || description.includes("scheduling")) {
      return {
        id: txn.id,
        category: "subscriptions",
        is_recurring: true,
        recurrence_pattern: "monthly",
      };
    }

    if (description.includes("flour") || tags.includes("supplier")) {
      return {
        id: txn.id,
        category: "supplies",
        is_recurring: true,
        recurrence_pattern: "monthly",
      };
    }

    return {
      id: txn.id,
      category: "unknown",
      is_recurring: false,
      recurrence_pattern: null,
    };
  });
}

jest.mock("@/lib/gemini", () => ({
  gemini: {
    generateContent: jest.fn((parts: string[]) => {
      const prompt = Array.isArray(parts) ? parts[1] : String(parts);
      const categorizations = categorizeTransactionsFromPrompt(prompt);
      return Promise.resolve({
        response: {
          text: () => JSON.stringify(categorizations),
        },
      });
    }),
  },
}));

import { POST as connectPOST } from "@/app/api/business/connect/route";
import { POST as analyzePOST } from "@/app/api/business/[id]/analyze/route";
import { GET as forecastGET } from "@/app/api/business/[id]/forecast/route";
import { GET as dashboardGET } from "@/app/api/business/[id]/dashboard/route";
import { GET as alertsGET } from "@/app/api/business/[id]/alerts/route";
import { POST as scenarioPOST } from "@/app/api/scenario/model/route";
import { POST as sendReminderPOST } from "@/app/api/actions/send-reminder/route";

function makeConnectRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/business/connect", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("integration flow: connect -> analyze -> dashboard", () => {
  beforeEach(() => {
    resetStore();
  });

  it("persists imported data, categorizes transactions, and exposes the aggregated dashboard", async () => {
    const connectRes = await connectPOST(
      makeConnectRequest({
        business_name: "Sweet Grace Bakery",
        owner_phone: "9195551234",
      }),
    );
    expect(connectRes.status).toBe(201);

    const connectBody = await connectRes.json();
    const businessId = connectBody.business.id as string;

    expect(store.businesses).toHaveLength(1);
    expect(store.transactions.length).toBeGreaterThan(0);
    expect(
      store.transactions.every((transaction) => transaction.category === null),
    ).toBe(true);

    const analyzeRes = await analyzePOST(
      new Request(`http://localhost/api/business/${businessId}/analyze`, {
        method: "POST",
      }),
      { params: { id: businessId } },
    );
    expect(analyzeRes.status).toBe(200);

    const analyzeBody = await analyzeRes.json();
    expect(analyzeBody.transactions_categorized).toBe(store.transactions.length);
    expect(
      store.transactions.some((transaction) => transaction.category === "payroll"),
    ).toBe(true);
    expect(
      store.transactions.some((transaction) => transaction.category === "subscriptions"),
    ).toBe(true);

    const dashboardRes = await dashboardGET(
      new Request(`http://localhost/api/business/${businessId}/dashboard`),
      { params: { id: businessId } },
    );
    expect(dashboardRes.status).toBe(200);

    const dashboardBody = await dashboardRes.json();
    expect(dashboardBody.business.id).toBe(businessId);
    expect(typeof dashboardBody.business.runway_days).toBe("number");
    expect(typeof dashboardBody.business.runway_severity).toBe("string");
    expect(dashboardBody.forecast_summary.horizon_days).toBe(30);
    expect(dashboardBody.forecast_summary.days).toHaveLength(30);
    expect(dashboardBody.upcoming_obligations.length).toBeGreaterThan(0);
  });
});

describe("integration flow: connect -> analyze -> forecast -> dashboard", () => {
  beforeEach(() => {
    resetStore();
  });

  it("keeps forecast persistence and dashboard runway data in sync", async () => {
    const connectRes = await connectPOST(
      makeConnectRequest({
        business_name: "Sweet Grace Bakery",
        owner_phone: "9195551234",
      }),
    );
    const connectBody = await connectRes.json();
    const businessId = connectBody.business.id as string;

    await analyzePOST(
      new Request(`http://localhost/api/business/${businessId}/analyze`, {
        method: "POST",
      }),
      { params: { id: businessId } },
    );

    const forecastUrl = new URL(
      `http://localhost/api/business/${businessId}/forecast?horizon=30`,
    );
    const forecastReq = Object.assign(
      new Request(forecastUrl.toString(), { method: "GET" }),
      { nextUrl: forecastUrl },
    );
    const forecastRes = await forecastGET(forecastReq as never, {
      params: { id: businessId },
    });
    expect(forecastRes.status).toBe(200);

    const forecastBody = await forecastRes.json();
    expect(forecastBody.horizon_days).toBe(30);
    expect(forecastBody.days).toHaveLength(30);

    const dashboardRes = await dashboardGET(
      new Request(`http://localhost/api/business/${businessId}/dashboard`),
      { params: { id: businessId } },
    );
    expect(dashboardRes.status).toBe(200);

    const dashboardBody = await dashboardRes.json();
    expect(dashboardBody.business.runway_days).toBe(forecastBody.runway_days);
    expect(dashboardBody.forecast_summary.horizon_days).toBe(30);
    expect(dashboardBody.forecast_summary.days).toHaveLength(30);

    if (forecastBody.first_negative_date) {
      expect(dashboardBody.forecast_summary.danger_dates[0]).toBe(
        forecastBody.first_negative_date,
      );
    }
  });
});

describe("integration flow: analyze repeat run", () => {
  beforeEach(() => {
    resetStore();
  });

  it("does not re-categorize already categorized transactions on a second analyze run", async () => {
    const connectRes = await connectPOST(
      makeConnectRequest({
        business_name: "Sweet Grace Bakery",
        owner_phone: "9195551234",
      }),
    );
    const connectBody = await connectRes.json();
    const businessId = connectBody.business.id as string;

    const firstAnalyzeRes = await analyzePOST(
      new Request(`http://localhost/api/business/${businessId}/analyze`, {
        method: "POST",
      }),
      { params: { id: businessId } },
    );
    expect(firstAnalyzeRes.status).toBe(200);

    const firstAnalyzeBody = await firstAnalyzeRes.json();
    expect(firstAnalyzeBody.transactions_categorized).toBeGreaterThan(0);

    const secondAnalyzeRes = await analyzePOST(
      new Request(`http://localhost/api/business/${businessId}/analyze`, {
        method: "POST",
      }),
      { params: { id: businessId } },
    );
    expect(secondAnalyzeRes.status).toBe(200);

    const secondAnalyzeBody = await secondAnalyzeRes.json();
    expect(secondAnalyzeBody.transactions_categorized).toBe(0);
    expect(secondAnalyzeBody.runway_days).toBe(firstAnalyzeBody.runway_days);
  });
});

describe("integration flow: connect rollback on import failure", () => {
  beforeEach(() => {
    resetStore();
  });

  it("deletes the just-created business if transaction import fails", async () => {
    store.failTransactionsInsert = true;

    const connectRes = await connectPOST(
      makeConnectRequest({
        business_name: "Sweet Grace Bakery",
        owner_phone: "9195551234",
      }),
    );
    expect(connectRes.status).toBe(500);

    const body = await connectRes.json();
    expect(body.code).toBe("DB_INSERT_FAILED");
    expect(store.businesses).toHaveLength(0);
    expect(store.transactions).toHaveLength(0);
  });
});

describe("integration smoke: stubbed Dev 4 routes", () => {
  beforeEach(() => {
    resetStore();
  });

  it("alerts route returns a valid alerts payload shape", async () => {
    store.businesses.push({
      id: "biz-test",
      name: "Sweet Grace Bakery",
      type: "bakery",
      owner_phone: "+19195551234",
      stripe_connected: true,
      banking_connected: true,
      current_balance: 4847.23,
      runway_days: 22,
      runway_severity: "red",
    });
    store.alerts.push({
      id: "alert-1",
      business_id: "biz-test",
      scenario: "runway",
      severity: "red",
      headline: "You have 22 days of cash remaining at current burn rate.",
      detail: "Critical runway warning.",
      recommended_actions: [],
      sms_sent: false,
      sms_sent_at: null,
      created_at: "2026-03-21T10:00:00Z",
    });

    const alertsUrl = new URL("http://localhost/api/business/biz-test/alerts");
    const alertsReq = Object.assign(
      new Request(alertsUrl.toString(), { method: "GET" }),
      { nextUrl: alertsUrl },
    );
    const res = await alertsGET(alertsReq as never, {
      params: { id: "biz-test" },
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(typeof body.business_id).toBe("string");
    expect(Array.isArray(body.alerts)).toBe(true);
    expect(body.alerts[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        business_id: expect.any(String),
        scenario: expect.any(String),
        severity: expect.any(String),
        headline: expect.any(String),
      }),
    );
  });

  it("scenario model route returns baseline and modeled runway data", async () => {
    const res = await scenarioPOST();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.baseline).toEqual(
      expect.objectContaining({
        runway_days: expect.any(Number),
      }),
    );
    expect(body.modeled).toEqual(
      expect.objectContaining({
        runway_days: expect.any(Number),
        delta_days: expect.any(Number),
      }),
    );
    expect(Array.isArray(body.scenarios_applied)).toBe(true);
  });

  it("send reminder route returns a valid reminder confirmation payload", async () => {
    const res = await sendReminderPOST();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual(
      expect.objectContaining({
        sent: true,
        sent_at: expect.any(String),
        to: expect.any(String),
        subject: expect.any(String),
        message_preview: expect.any(String),
      }),
    );
  });
});
