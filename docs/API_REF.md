Complete input/output contracts for every API route in the Runway platform. All routes are Next.js API handlers. All request/response bodies are JSON. All routes return `{ error: string }` with an appropriate HTTP status code on failure.

---

## Data Models

Shared types referenced throughout the route contracts below.

### `Transaction`

```json
{
  "id": "txn-00482",
  "business_id": "biz-sweet-grace-001",
  "source": "stripe | banking | manual",
  "transaction_type": "invoice | debit | credit",
  "invoice_status": "paid | unpaid | null",
  "invoice_date": "2026-03-09",
  "customer_id": "cust-durham-catering | null",
  "amount": 3200.00,
  "description": "Durham Catering Co — Invoice #1021",
  "category": "revenue | payroll | rent | supplies | subscriptions | insurance | taxes | one-time | unknown",
  "date": "2026-03-09",
  "is_recurring": false,
  "recurrence_pattern": "weekly | biweekly | monthly | quarterly | null",
  "tags": ["catering", "wholesale"]
}
```

### `Alert`

```json
{
  "id": "alert-0091",
  "business_id": "biz-sweet-grace-001",
  "scenario": "runway | overdue_invoice | subscription_waste | revenue_concentration",
  "severity": "red | amber | green",
  "headline": "You will miss payroll on March 28",
  "detail": "Projected cash on 3/28: $1,600. Payroll amount: $3,800. Shortfall: $2,200.",
  "recommended_actions": [
    {
      "action": "Collect overdue invoice",
      "target": "Durham Catering Co",
      "amount": 3200,
      "impact": "Covers shortfall + $1,000 buffer"
    }
  ],
  "sms_sent": true,
  "sms_sent_at": "2026-03-19T02:00:00Z",
  "created_at": "2026-03-19T02:00:00Z"
}
```

### `ForecastDay`

```json
{
  "date": "2026-03-28",
  "projected_balance": -2200.00,
  "is_danger": true,
  "obligations": [
    { "description": "Payroll", "amount": 3800.00 },
    { "description": "Insurance", "amount": 1200.00 }
  ],
  "expected_revenue": 1400.00
}
```

### `Business`

```json
{
  "id": "biz-sweet-grace-001",
  "name": "Sweet Grace Bakery",
  "type": "bakery",
  "owner_phone": "+19195551234",
  "stripe_connected": true,
  "banking_connected": true,
  "current_balance": 4847.23,
  "runway_days": 47,
  "runway_severity": "amber",
  "created_at": "2026-03-22T15:00:00Z"
}
```

---

## Mock Data Routes

Serve seeded fixture data. No auth required. Used exclusively during development and demo.

---

### `GET /api/mock/stripe/transactions`

Returns 90 days of seeded Stripe-formatted transaction data for Sweet Grace Bakery.

**Request**

No body. No query params.

**Response `200`**

```json
{
  "transactions": [
    {
      "id": "txn-00482",
      "business_id": "biz-sweet-grace-001",
      "source": "stripe",
      "transaction_type": "invoice",
      "invoice_status": "unpaid",
      "invoice_date": "2026-03-09",
      "customer_id": "cust-durham-catering",
      "amount": 3200.00,
      "description": "Durham Catering Co — Invoice #1021",
      "category": null,
      "date": "2026-03-09",
      "is_recurring": false,
      "recurrence_pattern": null,
      "tags": ["catering", "wholesale"]
    }
  ],
  "count": 312
}
```

> `category` is `null` on mock responses — it gets populated after `/analyze` runs.
> 

---

### `GET /api/mock/banking/accounts`

Returns current balance and transaction history including non-Stripe items (rent, insurance, manual deposits).

**Request**

No body. No query params.

**Response `200`**

```json
{
  "account": {
    "id": "acct-sgb-checking",
    "business_id": "biz-sweet-grace-001",
    "type": "checking",
    "current_balance": 4847.23,
    "as_of": "2026-03-21"
  },
  "transactions": [
    {
      "id": "txn-bank-00109",
      "business_id": "biz-sweet-grace-001",
      "source": "banking",
      "transaction_type": "debit",
      "invoice_status": null,
      "invoice_date": null,
      "customer_id": null,
      "amount": 1200.00,
      "description": "Quarterly Insurance Payment",
      "category": null,
      "date": "2026-03-28",
      "is_recurring": true,
      "recurrence_pattern": "quarterly",
      "tags": ["insurance"]
    }
  ],
  "count": 88
}
```

---

## Business Routes

---

### `POST /api/business/connect`

Triggers a full data pull from the mock Stripe and banking endpoints, writes all transactions to the DB, and returns the initialized business record. This is the entry point — called when the user clicks "Connect Stripe".

**Request**

```json
{
  "business_name": "Sweet Grace Bakery",
  "business_type": "bakery",
  "owner_phone": "+19195551234"
}
```

**Response `201`**

```json
{
  "business": {
    "id": "biz-sweet-grace-001",
    "name": "Sweet Grace Bakery",
    "type": "bakery",
    "owner_phone": "+19195551234",
    "stripe_connected": true,
    "banking_connected": true,
    "current_balance": 4847.23,
    "runway_days": null,
    "runway_severity": null,
    "created_at": "2026-03-22T15:00:00Z"
  },
  "transactions_imported": 400
}
```

> `runway_days` is `null` until `/analyze` is called.
> 

---

### `POST /api/business/:id/analyze`

Runs the full AI analysis pipeline: categorizes all uncategorized transactions, detects recurrence patterns, runs all 4 alert scenarios, writes alert records to DB, fires Twilio SMS for any red-severity alerts, and updates `businesses.runway_days`.

**Request**

No body. Business ID in path param.

**Response `200`**

```json
{
  "business_id": "biz-sweet-grace-001",
  "transactions_categorized": 400,
  "runway_days": 47,
  "runway_severity": "amber",
  "alerts_created": [
    {
      "id": "alert-0091",
      "scenario": "runway",
      "severity": "amber",
      "headline": "You have 47 days of cash remaining at current burn rate."
    },
    {
      "id": "alert-0092",
      "scenario": "overdue_invoice",
      "severity": "red",
      "headline": "Durham Catering Co owes $3,200 and is 12 days overdue."
    },
    {
      "id": "alert-0093",
      "scenario": "subscription_waste",
      "severity": "amber",
      "headline": "You're paying $134/month for two scheduling tools that overlap."
    },
    {
      "id": "alert-0094",
      "scenario": "revenue_concentration",
      "severity": "red",
      "headline": "62% of your revenue in the last 90 days came from one client."
    }
  ],
  "sms_sent": true
}
```

---

### `GET /api/business/:id/dashboard`

Single aggregation call that returns everything the dashboard page needs on load: business record, active alerts, 30-day forecast summary, and upcoming obligations. Dev 3 calls only this endpoint on page load.

**Request**

No body. Business ID in path param.

**Response `200`**

```json
{
  "business": {
    "id": "biz-sweet-grace-001",
    "name": "Sweet Grace Bakery",
    "current_balance": 4847.23,
    "runway_days": 47,
    "runway_severity": "amber"
  },
  "alerts": [
    {
      "id": "alert-0091",
      "scenario": "runway",
      "severity": "amber",
      "headline": "You have 47 days of cash remaining at current burn rate.",
      "detail": "Average daily net burn: $102.07. At this rate, cash runs out around May 7.",
      "recommended_actions": [
        {
          "action": "Collect overdue invoice",
          "target": "Durham Catering Co",
          "amount": 3200,
          "impact": "Extends runway to 78 days"
        }
      ]
    }
  ],
  "forecast_summary": {
    "horizon_days": 30,
    "min_projected_balance": -2200.00,
    "danger_dates": ["2026-03-28"],
    "days": [
      {
        "date": "2026-03-22",
        "projected_balance": 4847.23,
        "is_danger": false,
        "obligations": [],
        "expected_revenue": 480.00
      }
    ]
  },
  "upcoming_obligations": [
    {
      "description": "Payroll",
      "amount": 3800.00,
      "due_date": "2026-03-28",
      "category": "payroll",
      "is_recurring": true
    },
    {
      "description": "Quarterly Insurance",
      "amount": 1200.00,
      "due_date": "2026-03-28",
      "category": "insurance",
      "is_recurring": true
    }
  ]
}
```

---

### `GET /api/business/:id/forecast`

Returns the full day-by-day cash position forecast. Called separately when the user navigates to the forecast detail view or when the what-if panel needs the base forecast.

**Request**

Query params:

| Param | Type | Default | Description |  |  |
| --- | --- | --- | --- | --- | --- |
| `horizon` | `30 \ | 60 \ | 90` | `30` | Number of days to forecast |

**Response `200`**

```json
{
  "business_id": "biz-sweet-grace-001",
  "generated_at": "2026-03-21T18:00:00Z",
  "horizon_days": 30,
  "current_balance": 4847.23,
  "avg_daily_net_burn": 102.07,
  "runway_days": 47,
  "first_negative_date": "2026-03-28",
  "days": [
    {
      "date": "2026-03-22",
      "projected_balance": 4847.23,
      "is_danger": false,
      "obligations": [],
      "expected_revenue": 480.00
    },
    {
      "date": "2026-03-28",
      "projected_balance": -2200.00,
      "is_danger": true,
      "obligations": [
        { "description": "Payroll", "amount": 3800.00 },
        { "description": "Insurance", "amount": 1200.00 }
      ],
      "expected_revenue": 1400.00
    }
  ]
}
```

---

### `GET /api/business/:id/alerts`

Returns all active alerts for a business, ordered by severity (red first).

**Request**

No body. Business ID in path param.

Query params:

| Param | Type | Default | Description |  |  |
| --- | --- | --- | --- | --- | --- |
| `severity` | `red \ | amber \ | green` | none | Filter by severity |

**Response `200`**

```json
{
  "business_id": "biz-sweet-grace-001",
  "alerts": [
    {
      "id": "alert-0092",
      "scenario": "overdue_invoice",
      "severity": "red",
      "headline": "Durham Catering Co owes $3,200 and is 12 days overdue.",
      "detail": "If not collected by March 25, you will not cover the $2,200 payroll shortfall on March 28.",
      "recommended_actions": [
        {
          "action": "Send payment reminder",
          "target": "Durham Catering Co",
          "amount": 3200,
          "impact": "Covers payroll shortfall with $1,000 buffer"
        }
      ],
      "sms_sent": true,
      "sms_sent_at": "2026-03-21T02:00:00Z",
      "created_at": "2026-03-21T02:00:00Z"
    }
  ]
}
```

---

## Alert Routes

---

### `POST /api/alerts/send-sms/:alertId`

Manually triggers a Twilio SMS for a specific alert. Also called automatically by `/analyze` for all red-severity alerts.

**Request**

No body. Alert ID in path param.

**Response `200`**

```json
{
  "alert_id": "alert-0092",
  "sms_sent": true,
  "sms_sent_at": "2026-03-21T18:30:00Z",
  "to": "+19195551234",
  "message_preview": "Runway Alert for Sweet Grace Bakery: Durham Catering Co owes $3,200 and is 12 days overdue. Open dashboard: https://runway.vercel.app/dashboard/biz-sweet-grace-001"
}
```

---

## Action Routes

---

### `POST /api/actions/send-reminder`

Mock-sends a payment reminder to an overdue invoice customer. Logs the action and returns a confirmation. No real email is sent.

**Request**

```json
{
  "business_id": "biz-sweet-grace-001",
  "customer_id": "cust-durham-catering",
  "invoice_transaction_id": "txn-00482",
  "amount_owed": 3200.00
}
```

**Response `200`**

```json
{
  "sent": true,
  "sent_at": "2026-03-21T18:32:00Z",
  "to": "Durham Catering Co",
  "subject": "Payment Reminder: Invoice #1021 — $3,200.00 overdue",
  "message_preview": "Hi Durham Catering, this is a friendly reminder that Invoice #1021 for $3,200.00 is 12 days past due. Please remit payment at your earliest convenience."
}
```

---

## Scenario Routes

---

### `POST /api/scenario/model`

Applies a what-if parameter delta to the current forecast and returns an updated runway figure. Does not persist anything — pure computation.

**Request**

```json
{
  "business_id": "biz-sweet-grace-001",
  "scenarios": [
    {
      "type": "new_hire",
      "params": {
        "monthly_salary": 1800
      }
    },
    {
      "type": "price_increase",
      "params": {
        "increase_pct": 12
      }
    },
    {
      "type": "cut_expense",
      "params": {
        "transaction_id": "txn-sub-calendly"
      }
    }
  ]
}
```

Supported `type` values:

| Type | Required params | Description |
| --- | --- | --- |
| `new_hire` | `monthly_salary: number` | Adds a recurring monthly debit to the forecast |
| `price_increase` | `increase_pct: number` | Scales projected daily revenue by `1 + (increase_pct / 100)` |
| `cut_expense` | `transaction_id: string` | Removes the recurring expense matching that transaction from the forecast |
| `delay_payment` | `transaction_id: string`, `delay_days: number` | Shifts a one-time upcoming payment forward by N days |

**Response `200`**

```json
{
  "business_id": "biz-sweet-grace-001",
  "baseline": {
    "runway_days": 47,
    "first_negative_date": "2026-03-28"
  },
  "modeled": {
    "runway_days": 39,
    "first_negative_date": "2026-04-29",
    "delta_days": -8
  },
  "scenarios_applied": [
    { "type": "new_hire", "impact_days": -25 },
    { "type": "price_increase", "impact_days": +14 },
    { "type": "cut_expense", "impact_days": +3 }
  ]
}
```

> `delta_days` is negative when runway shrinks, positive when it grows.
> 

---

## Error Shape

All routes return this shape on failure:

```json
{
  "error": "Human-readable description of what went wrong.",
  "code": "BUSINESS_NOT_FOUND | ANALYZE_FAILED | SMS_FAILED | ..."
}
```

| HTTP Status | When |
| --- | --- |
| `400` | Missing or invalid request body fields |
| `404` | Business or alert ID not found |
| `422` | Analysis ran but produced no results (empty transaction set) |
| `500` | Unexpected server error (AI provider down, Supabase unreachable, Twilio failed) |