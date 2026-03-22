import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import "@testing-library/jest-dom";
import ConnectPage from "./page";
import type { AnalyzeCompletedEvent } from "@/lib/types";
import type { AnalyzeStreamHandlers } from "@/lib/api";

const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, prefetch: jest.fn() }),
}));

jest.mock("@/lib/api", () => ({
  __mockApi: {
    connectBusiness: jest.fn(),
    getDashboard: jest.fn(),
    getAlerts: jest.fn(),
    openAnalyzeStream: jest.fn(),
    getMe: jest.fn(),
    scheduleCall: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public code: string,
      public status: number,
    ) {
      super(message);
    }
  },
  runwayApi: {
    connectBusiness: jest.fn(),
    getDashboard: jest.fn(),
    getAlerts: jest.fn(),
    openAnalyzeStream: jest.fn(),
    getMe: jest.fn(),
    scheduleCall: jest.fn(),
  },
}));

const { __mockApi, runwayApi } = jest.requireMock("@/lib/api") as {
  __mockApi: {
    connectBusiness: jest.Mock;
    getDashboard: jest.Mock;
    getAlerts: jest.Mock;
    openAnalyzeStream: jest.Mock;
    getMe: jest.Mock;
    scheduleCall: jest.Mock;
  };
  runwayApi: {
    connectBusiness: jest.Mock;
    getDashboard: jest.Mock;
    getAlerts: jest.Mock;
    openAnalyzeStream: jest.Mock;
    getMe: jest.Mock;
    scheduleCall: jest.Mock;
  };
};

const mockApi = __mockApi;
runwayApi.connectBusiness = mockApi.connectBusiness;
runwayApi.getDashboard = mockApi.getDashboard;
runwayApi.getAlerts = mockApi.getAlerts;
runwayApi.openAnalyzeStream = mockApi.openAnalyzeStream;
runwayApi.getMe = mockApi.getMe;
runwayApi.scheduleCall = mockApi.scheduleCall;

describe("ConnectPage", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    push.mockReset();
    mockApi.connectBusiness.mockReset();
    mockApi.getDashboard.mockReset();
    mockApi.getAlerts.mockReset();
    mockApi.openAnalyzeStream.mockReset();
    mockApi.getMe.mockReset();
    mockApi.scheduleCall.mockReset();
    mockApi.getMe.mockResolvedValue({ name: "Grace", businessName: "Sweet Grace Bakery", phone: "+19195551234" });
    mockApi.scheduleCall.mockResolvedValue({ success: true, sentiment: "heavy" });

    mockApi.connectBusiness.mockResolvedValue({
      business: {
        id: "biz-test",
        name: "Sweet Grace Bakery",
        type: "bakery",
        owner_phone: "+19195551234",
        stripe_connected: true,
        banking_connected: true,
        current_balance: 3127.23,
        runway_days: null,
        runway_severity: null,
        created_at: "2026-03-22T10:00:00.000Z",
      },
      transactions_imported: 229,
    });

    mockApi.getDashboard.mockResolvedValue({
      business: {
        id: "biz-test",
        name: "Sweet Grace Bakery",
        current_balance: 3127.23,
        runway_days: 13,
        runway_severity: "red",
      },
      alerts: [
        {
          id: "alert-1",
          business_id: "biz-test",
          scenario: "runway",
          severity: "red",
          headline: "You have 13 days of cash remaining at current burn rate.",
          detail: "Critical runway warning.",
          recommended_actions: [],
          sms_sent: false,
          sms_sent_at: null,
          created_at: "2026-03-22T10:00:00.000Z",
        },
      ],
      forecast_summary: {
        horizon_days: 30,
        min_projected_balance: -1200,
        danger_dates: ["2026-03-30"],
        days: [],
      },
      upcoming_obligations: [
        {
          description: "ADP Payroll",
          amount: 3800,
          due_date: "2026-03-30",
          category: "payroll",
          is_recurring: true,
        },
      ],
    });
    mockApi.getAlerts.mockResolvedValue({
      business_id: "biz-test",
      alerts: [],
    });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("reveals categorized transactions progressively from the analyze stream", async () => {
    mockApi.openAnalyzeStream.mockImplementation(
      (_businessId: string, handlers: AnalyzeStreamHandlers) => {
        handlers.onAnalysisStarted?.({
          type: "analysis_started",
          business_id: "biz-test",
          total_transactions: 2,
          batch_size: 50,
          total_batches: 1,
        });
        handlers.onBatchStarted?.({
          type: "batch_started",
          business_id: "biz-test",
          batch_number: 1,
          batch_size: 2,
          transactions: [
            {
              id: "txn-002",
              date: "2026-03-18",
              description: "Stripe payment — bakery sale",
              amount: 150,
              source: "stripe",
              invoice_status: null,
              category: null,
              is_recurring: false,
              recurrence_pattern: null,
            },
            {
              id: "txn-001",
              date: "2026-03-15",
              description: "ADP Payroll",
              amount: -3800,
              source: "stripe",
              invoice_status: null,
              category: null,
              is_recurring: false,
              recurrence_pattern: null,
            },
          ],
        });
        window.setTimeout(() => {
          handlers.onBatchCompleted?.({
            type: "batch_completed",
            business_id: "biz-test",
            batch_number: 1,
            processed_count: 2,
            transactions: [
              {
                id: "txn-002",
                date: "2026-03-18",
                description: "Stripe payment — bakery sale",
                amount: 150,
                source: "stripe",
                invoice_status: null,
                category: "revenue",
                is_recurring: false,
                recurrence_pattern: null,
              },
              {
                id: "txn-001",
                date: "2026-03-15",
                description: "ADP Payroll",
                amount: -3800,
                source: "stripe",
                invoice_status: null,
                category: "payroll",
                is_recurring: true,
                recurrence_pattern: "biweekly",
              },
            ],
          });
        }, 10);
        window.setTimeout(() => {
          handlers.onAnalysisCompleted?.({
            type: "analysis_completed",
            business_id: "biz-test",
            transactions_categorized: 2,
            runway_days: 13,
            runway_severity: "red",
            alerts_created: [],
            sms_sent: false,
          } satisfies AnalyzeCompletedEvent);
        }, 20);

        return jest.fn();
      },
    );

    render(React.createElement(ConnectPage));

    // Fill in credentials before the button becomes active
    fireEvent.change(screen.getByLabelText("Stripe Account ID"), {
      target: { value: "88888888" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByText("Connect Stripe"));

    // Advance past the 750ms launch animation delay before handleConnect fires.
    await act(async () => {
      jest.advanceTimersByTime(750);
    });

    expect(await screen.findByText("ADP Payroll")).not.toBeNull();
    expect(screen.getAllByText("categorizing")).toHaveLength(2);

    await act(async () => {
      jest.advanceTimersByTime(1);
    });

    expect(screen.getByText("ADP Payroll")).not.toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    expect(screen.getByText("Stripe payment — bakery sale")).not.toBeNull();
    expect(screen.getByText("ADP Payroll")).not.toBeNull();
    expect(screen.getAllByText("categorizing")).toHaveLength(1);

    await act(async () => {
      jest.advanceTimersByTime(220);
    });

    expect(screen.getByText("ADP Payroll")).not.toBeNull();
    expect(screen.getByText("payroll")).not.toBeNull();
    expect(screen.queryByText("View dashboard →")).toBeNull();
    expect(screen.queryByText(/import complete — 229/i)).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(
      await screen.findByText(/import complete — 229/i),
    ).not.toBeNull();
    expect(screen.getByText("View dashboard")).not.toBeNull();
  });

  it("shows a connect-time error if the analysis stream fails", async () => {
    mockApi.openAnalyzeStream.mockImplementation(
      (_businessId: string, handlers: AnalyzeStreamHandlers) => {
        window.setTimeout(() => {
          handlers.onAnalysisFailed?.({
            type: "analysis_failed",
            code: "ANALYZE_FAILED",
            message: "AI categorization failed. Please try again.",
          });
        }, 10);

        return jest.fn();
      },
    );

    render(React.createElement(ConnectPage));

    // Fill in credentials before the button becomes active
    fireEvent.change(screen.getByLabelText("Stripe Account ID"), {
      target: { value: "88888888" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByText("Connect Stripe"));

    // Advance past the 750ms launch animation delay before handleConnect fires.
    await act(async () => {
      jest.advanceTimersByTime(750);
    });

    await act(async () => {
      jest.advanceTimersByTime(20);
    });

    expect(
      await screen.findByText("AI categorization failed. Please try again."),
    ).not.toBeNull();
  });
});
