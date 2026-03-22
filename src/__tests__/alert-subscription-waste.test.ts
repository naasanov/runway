/**
 * Tests for D4-04: Alert Scenario 3 — Subscription Waste
 *
 * Tests the detectSubscriptionWasteAlerts function.
 * Gemini is mocked so tests run without external services.
 */

import { detectSubscriptionWasteAlerts } from "@/lib/alert-scenarios";
import type { Transaction } from "@/lib/types";

function makeTxn(overrides: Partial<Transaction>): Transaction {
  return {
    id: "txn-001",
    business_id: "biz-test",
    source: "stripe",
    transaction_type: "debit",
    invoice_status: null,
    invoice_date: null,
    customer_id: null,
    amount: -50,
    description: "Some subscription",
    category: "subscriptions",
    date: "2026-03-01",
    is_recurring: true,
    recurrence_pattern: "monthly",
    tags: [],
    ...overrides,
  };
}

const homebaseSub = makeTxn({
  id: "txn-sub-homebase",
  amount: -89,
  description: "Homebase Scheduling",
});

const whenIWorkSub = makeTxn({
  id: "txn-sub-wheniwork",
  amount: -45,
  description: "When I Work Scheduling",
});

const squareSub = makeTxn({
  id: "txn-sub-square",
  amount: -60,
  description: "Square POS",
});

const canvaSub = makeTxn({
  id: "txn-sub-canva",
  amount: -13,
  description: "Canva Pro",
});

function mockGemini(response: object) {
  return {
    generateContent: jest.fn().mockResolvedValue({
      response: { text: () => JSON.stringify(response) },
    }),
  };
}

describe("detectSubscriptionWasteAlerts", () => {
  it("returns empty array when fewer than 2 subscriptions", async () => {
    const gemini = mockGemini({ overlapping_groups: [] });
    const result = await detectSubscriptionWasteAlerts("biz-test", [squareSub], gemini);
    expect(result).toHaveLength(0);
    // Should not even call Gemini
    expect(gemini.generateContent).not.toHaveBeenCalled();
  });

  it("detects overlapping scheduling tools", async () => {
    const gemini = mockGemini({
      overlapping_groups: [
        {
          purpose: "employee scheduling",
          tools: [
            { description: "Homebase Scheduling", monthly_cost: 89 },
            { description: "When I Work Scheduling", monthly_cost: 45 },
          ],
          cancel_recommendation: "Homebase Scheduling",
          monthly_savings: 89,
        },
      ],
    });

    const result = await detectSubscriptionWasteAlerts(
      "biz-test",
      [homebaseSub, whenIWorkSub, squareSub, canvaSub],
      gemini
    );

    expect(result).toHaveLength(1);
    expect(result[0].scenario).toBe("subscription_waste");
    expect(result[0].severity).toBe("amber");
    expect(result[0].headline).toContain("134"); // $89 + $45
    expect(result[0].headline).toContain("2");
    expect(result[0].detail).toContain("Homebase");
    expect(result[0].detail).toContain("1,068"); // $89 * 12
  });

  it("includes cancel action with correct savings", async () => {
    const gemini = mockGemini({
      overlapping_groups: [
        {
          purpose: "employee scheduling",
          tools: [
            { description: "Homebase Scheduling", monthly_cost: 89 },
            { description: "When I Work Scheduling", monthly_cost: 45 },
          ],
          cancel_recommendation: "Homebase Scheduling",
          monthly_savings: 89,
        },
      ],
    });

    const result = await detectSubscriptionWasteAlerts(
      "biz-test",
      [homebaseSub, whenIWorkSub],
      gemini
    );

    const action = result[0].recommended_actions[0];
    expect(action.action).toContain("Cancel");
    expect(action.target).toBe("Homebase Scheduling");
    expect(action.amount).toBe(89);
    expect(action.impact).toContain("1,068");
  });

  it("returns empty array when Gemini finds no overlaps", async () => {
    const gemini = mockGemini({ overlapping_groups: [] });

    const result = await detectSubscriptionWasteAlerts(
      "biz-test",
      [squareSub, canvaSub],
      gemini
    );

    expect(result).toHaveLength(0);
  });

  it("handles Gemini returning markdown-fenced JSON", async () => {
    const gemini = {
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () =>
            "```json\n" +
            JSON.stringify({
              overlapping_groups: [
                {
                  purpose: "scheduling",
                  tools: [
                    { description: "Homebase Scheduling", monthly_cost: 89 },
                    { description: "When I Work Scheduling", monthly_cost: 45 },
                  ],
                  cancel_recommendation: "Homebase Scheduling",
                  monthly_savings: 89,
                },
              ],
            }) +
            "\n```",
        },
      }),
    };

    const result = await detectSubscriptionWasteAlerts(
      "biz-test",
      [homebaseSub, whenIWorkSub],
      gemini
    );

    expect(result).toHaveLength(1);
  });

  it("returns empty array when Gemini fails", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    const gemini = {
      generateContent: jest.fn().mockRejectedValue(new Error("API error")),
    };

    const result = await detectSubscriptionWasteAlerts(
      "biz-test",
      [homebaseSub, whenIWorkSub],
      gemini
    );

    expect(result).toHaveLength(0);
    consoleSpy.mockRestore();
  });

  it("sends subscription list to Gemini for analysis", async () => {
    const gemini = mockGemini({ overlapping_groups: [] });

    await detectSubscriptionWasteAlerts(
      "biz-test",
      [homebaseSub, whenIWorkSub, squareSub],
      gemini
    );

    expect(gemini.generateContent).toHaveBeenCalledTimes(1);
    const prompt = gemini.generateContent.mock.calls[0][0];
    expect(prompt[1]).toContain("Homebase Scheduling");
    expect(prompt[1]).toContain("When I Work Scheduling");
    expect(prompt[1]).toContain("Square POS");
  });

  it("deduplicates subscriptions by description", async () => {
    const gemini = mockGemini({ overlapping_groups: [] });

    // Same subscription appearing in multiple months
    const dupeHomebase = makeTxn({
      id: "txn-sub-homebase-2",
      amount: -89,
      description: "Homebase Scheduling",
      date: "2026-02-01",
    });

    await detectSubscriptionWasteAlerts(
      "biz-test",
      [homebaseSub, dupeHomebase, whenIWorkSub],
      gemini
    );

    const prompt = gemini.generateContent.mock.calls[0][0];
    const subscriptionData = JSON.parse(
      prompt[1].replace("Subscriptions:\n", "")
    );
    // Should only have 2 unique subscriptions, not 3
    expect(subscriptionData).toHaveLength(2);
  });
});
