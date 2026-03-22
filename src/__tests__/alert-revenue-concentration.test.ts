import { detectRevenueConcentrationAlert } from "@/lib/alert-scenarios";
import type { Transaction } from "@/lib/types";

function makeRevenueTxn(
  id: string,
  customerId: string | null,
  amount: number
): Transaction {
  return {
    id,
    business_id: "biz-test",
    source: "stripe",
    transaction_type: "invoice",
    invoice_status: "paid",
    invoice_date: "2026-03-01",
    customer_id: customerId,
    amount,
    description: "Invoice",
    category: "revenue",
    date: "2026-03-05",
    is_recurring: false,
    recurrence_pattern: null,
    tags: [],
  };
}

describe("detectRevenueConcentrationAlert", () => {
  it("returns red when top customer share is >75%", () => {
    const txns = [
      makeRevenueTxn("1", "cust-techcorp", 112000),
      makeRevenueTxn("2", "cust-small-a", 7000),
      makeRevenueTxn("3", "cust-small-b", 7000),
    ];

    const alert = detectRevenueConcentrationAlert("biz-test", txns);
    expect(alert).not.toBeNull();
    expect(alert?.severity).toBe("red");
    expect(alert?.scenario).toBe("revenue_concentration");
  });

  it("returns amber when top customer share is >60% and <=75%", () => {
    const txns = [
      makeRevenueTxn("1", "cust-top", 7000),
      makeRevenueTxn("2", "cust-other-a", 2000),
      makeRevenueTxn("3", "cust-other-b", 1000),
    ];

    const alert = detectRevenueConcentrationAlert("biz-test", txns);
    expect(alert).not.toBeNull();
    expect(alert?.severity).toBe("amber");
  });

  it("returns null when concentration is <=60%", () => {
    const txns = [
      makeRevenueTxn("1", "cust-a", 4000),
      makeRevenueTxn("2", "cust-b", 3000),
      makeRevenueTxn("3", "cust-c", 3000),
    ];

    const alert = detectRevenueConcentrationAlert("biz-test", txns);
    expect(alert).toBeNull();
  });

  it("returns null when there are no customer IDs", () => {
    const txns = [
      makeRevenueTxn("1", null, 5000),
      makeRevenueTxn("2", null, 4000),
    ];

    const alert = detectRevenueConcentrationAlert("biz-test", txns);
    expect(alert).toBeNull();
  });
});
