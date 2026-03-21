**AI-Powered Cash Flow Intelligence for Small Businesses**

Version 1.1 · HackDuke 2026 · Track: AI for Finance · Team: 4 developers

Hacking window: 3:00 PM Saturday → 10:30 AM Sunday (19.5 hours build + 30 min demo prep)

---

## 1. Executive Summary

> "82% of small businesses that die, die because they couldn't see the money running out. Not because it wasn't there — because nobody told them it was leaving."
> 

Runway is an AI-powered cash flow intelligence engine for small business owners who can't afford a CFO, a bookkeeper, or a financial advisor. It connects to a business's payment and banking data, analyzes transaction patterns, and tells the owner — in plain language, via text message — when something is about to go wrong.

"You will not be able to make payroll on March 28th." Not a chart. Not a dashboard buried in a tab. A sentence. Sent to your phone at 2am, 9 days before it happens.

Runway then tells you how to fix it: collect this invoice, cut this subscription, delay this payment by 5 days. And when you want to grow — hire someone, raise prices, open a second location — Runway models the scenario in real time so you make decisions with data, not gut feeling.

---

## 2. Problem Statement

Small businesses don't fail because they're bad businesses. They fail because the owner can't see the financial cliff until they're already over it.

- **Cash flow kills.** 82% of business failures are caused by poor cash flow management. A US Bank study found this is the single largest cause of small business death — ahead of bad products, bad markets, and bad teams.
- **Profitable businesses still die.** A bakery making $14,000/month in revenue can be 9 days from missing payroll because three large expenses land the same week and a catering invoice is 12 days overdue. The P&L says "profitable." The bank account says "overdraft."
- **Owners don't know what they don't know.** 61% of small businesses globally struggle with cash flow. Most owners track revenue obsessively but have no visibility into the timing of obligations — when rent, payroll, supplier invoices, insurance, and loan payments actually hit relative to when revenue actually arrives.
- **Tools exist but aren't accessible.** QuickBooks, Xero, and Wave exist for bookkeeping. But bookkeeping is backward-looking — it tells you what happened. Small business owners need forward-looking intelligence: what's *about* to happen. A CFO provides this, but CFOs cost $150K+/year. A fractional CFO costs $3-5K/month. A bookkeeper costs $500-2,000/month. The bakery owner making $14K/month can't afford any of these.
- **The equity gap is real.** First-generation entrepreneurs, immigrant business owners, and owners in underserved communities are least likely to have financial literacy training, family networks with business experience, or access to professional financial advice. They're the ones who need forward-looking cash flow intelligence the most and have access to it the least.

---

## 3. Solution Overview

Runway connects to a business's financial data and provides three things no existing tool gives small business owners:

| Layer | Technology | Role |
| --- | --- | --- |
| Data Ingestion | Mock Stripe + Banking APIs | Pulls real transaction data: revenue, expenses, transfers, recurring charges |
| Cash Flow Intelligence | Gemini API (LLM) + forecasting logic | Categorizes transactions, projects future cash position, detects danger zones |
| Alert & Action Engine | Twilio SMS + Dashboard | Sends plain-language warnings and actionable fix recommendations |
| Scenario Modeling | Interactive frontend | "What if I hire someone? Raise prices? Cut this expense?" with live runway impact |

The core insight: **the gap between "how much did I make" and "can I pay my bills next week" is the gap that kills businesses.** QuickBooks answers the first question. Runway answers the second.

---

## 4. System Architecture

```jsx
┌─────────────────────────────────────────────────────────┐
│                    Runway Platform                       │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │   Owner       │  │   Alert      │  │  SMS/Phone    │  │
│  │   Dashboard   │  │   History    │  │  (Twilio)     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘  │
│         └─────────────────┼─────────────────┘           │
│                    ┌──────▼───────┐                      │
│                    │  Next.js API │                      │
│                    └──────┬───────┘                      │
│           ┌───────────────┼───────────────┐              │
│     ┌─────▼──────┐  ┌────▼─────┐  ┌──────▼──────┐      │
│     │ Mock Stripe │  │ Gemini   │  │  Scenario   │      │
│     │ + Banking  │  │ API      │  │  Engine     │      │
│     │ APIs       │  │ (analysis│  │  (what-if)  │      │
│     └────────────┘  │ + alerts)│  └─────────────┘      │
│                     └──────────┘                        │
│     ┌─────────────────────────────────────────────┐     │
│     │         PostgreSQL (Supabase)                │     │
│     │  businesses | transactions | alerts | scenarios│   │
│     └─────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Mock API Strategy (Critical for Feasibility)

We are NOT integrating with real Stripe or Plaid. We are building mock APIs that behave identically to the real ones but serve seeded data. This is the key feasibility decision that makes the 19-hour build window possible.

### 5.1 Mock Stripe API

A Next.js API route at `/api/mock/stripe/transactions` that returns realistic Stripe-formatted transaction objects. Seeded with 3-4 months of data for "Sweet Grace Bakery" — a fictional Durham bakery.

Transaction types seeded:

- **Revenue:** Stripe payments from customers ($15-$350 range, 3-8 per day, higher on weekends)
- **Recurring revenue:** Two wholesale accounts paying monthly ($1,200 and $2,800)
- **Payroll:** Bi-weekly, $3,800 per cycle
- **Rent:** Monthly, $2,400, hits on the 1st
- **Suppliers:** King Arthur Flour ($900-$2,100, Net 15), packaging supplier ($400, monthly)
- **Subscriptions:** Square POS ($60/mo), Canva ($13/mo), scheduling tool ($45/mo), second scheduling tool ($89/mo) — deliberately overlapping
- **Insurance:** Quarterly, $1,200, hits Mar 28
- **The trap:** A $3,200 catering invoice issued 12 days ago, unpaid. Without it, payroll + insurance + rent on the same week = shortfall

### 5.2 Mock Banking API

A Next.js API route at `/api/mock/banking/accounts` that returns a current balance and transaction history. Mirrors the Stripe data but includes non-Stripe transactions (rent, insurance, manual deposits).

### 5.3 Why mock, not real

- Stripe OAuth requires a verified business account to test → days of setup
- Plaid sandbox exists but has a learning curve and rate limits
- Mock APIs give us full control over the demo narrative — we seed the exact data that creates the "miss payroll in 9 days" moment
- The architecture is identical to production — swapping mock for real Stripe/Plaid is a config change, not a rewrite

---

## 6. Core Features (Must Ship)

These are the features that MUST be working by 10:30 AM for the demo.

### 6.1 Transaction Ingestion + Categorization

Pull transactions from mock Stripe + Banking APIs. Gemini categorizes each transaction into: Revenue, Payroll, Rent, Supplies, Subscriptions, Insurance, Taxes, One-time, Unknown. Output: structured transaction ledger with categories, amounts, dates, and recurrence patterns detected.

### 6.2 Cash Flow Forecast Engine

The core intelligence. Takes the categorized transaction history and projects forward 30/60/90 days:

- Identifies recurring expenses and their cadence (weekly, bi-weekly, monthly, quarterly)
- Projects revenue based on trailing patterns
- Maps upcoming obligations against projected cash position day-by-day
- Detects the exact date (if any) when projected cash goes negative
- Output: a day-by-day cash position forecast with danger dates highlighted

### 6.3 Pre-Built Alert Scenarios

Rather than fully generative alerts, we code specific high-value detection scenarios that Gemini evaluates against the data:

**Scenario 1 — Runway (the demo hero)**

"At your current burn rate, you have [X] days of cash remaining." Computed as `current_balance / avg_daily_net_burn`. Shown as the headline metric on the dashboard and recalculated every time new transactions are ingested. Triggers a red alert when runway drops below 30 days, amber below 60.

**Scenario 2 — Overdue Invoice Detection**

"[Customer] owes you $[amount] and it's [X] days overdue. If not collected by [date], you'll miss [obligation]." Detection logic: query transactions where `transaction_type = 'invoice'` AND `invoice_status != 'paid'` AND `invoice_date < today - 7`. Links the outstanding receivable to the nearest upcoming cash shortfall in the forecast.

**Scenario 3 — Subscription Waste**

"You're paying $[amount]/month for [N] tools that overlap in functionality." Detects transactions where two or more entries share the same `category = 'subscription'` and Gemini identifies them as serving the same purpose (e.g., two scheduling tools, two design tools). Surfaces the lower-cost duplicate as the cancellation target and calculates annual savings.

**Scenario 4 — Revenue Concentration Risk**

"[X]% of your revenue over the last 90 days came from a single client: [Customer]." Triggered when any one `customer_id` accounts for more than 40% of total revenue in the trailing 90-day window. Alert severity scales with concentration: amber at 40–60%, red above 60%. Recommended action: identify the next two largest revenue sources and flag the gap if the concentrated client churned.

### 6.4 Twilio SMS Alerts

When any scenario triggers a red-level alert, Twilio sends an SMS to the owner's phone number:

📱 *"Runway Alert for Sweet Grace Bakery: Projected cash shortfall of $2,200 in 9 days. You may not make payroll on March 28. Open your dashboard: [link]"*

The demo moment: the text arrives on a real phone sitting on the demo table while judges are watching.

### 6.5 Dashboard

One-page dashboard showing:

- **Headline metric:** "Runway: 47 days" (how many days of cash you have at current burn rate)
- **Cash forecast chart:** 30-day projected cash position, with a red line at $0
- **Active alerts:** Cards for each triggered scenario with severity (red/amber/green)
- **Recommended actions:** For each alert, 2-3 specific things the owner can do right now
- **Upcoming obligations:** Calendar-style view of what's due in the next 30 days

---

## 7. Good-to-Have Features (If Time Allows)

These add demo polish but are NOT required for the core pitch.

### 7.1 "What If" Scenario Slider

Interactive panel: "What if I hire someone at $[X]/month?" The runway counter updates live. Drag a pricing slider and watch it recover. This is the growth-modeling feature that makes judges think "this is a real product."

### 7.2 Multi-Business Type Support

Dropdown to switch between pre-seeded personas: bakery, salon, food truck. Each has different transaction patterns and triggers different alert scenarios. Shows the product isn't a one-trick demo.

### 7.3 AI-Generated Financial Summary

A plain-English paragraph at the top of the dashboard: "Sweet Grace Bakery made $14,200 in the last 30 days. After all expenses, you kept $2,100. Your biggest cost is payroll (42% of revenue). Your most concerning trend is supplier costs rising 8% month-over-month while your prices haven't changed."

### 7.4 Invoice Reminder Button

One-click button on the overdue invoice alert that "sends" (mock) a payment reminder email to the client. Visual confirmation in the dashboard.

---

## 8. Technical Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 14, Tailwind CSS, shadcn/ui, Recharts (for cash flow chart) |
| Backend API | Next.js API Routes (serverless) |
| AI / LLM | Gemini API (gemini-2.0-flash for transaction analysis + alert generation) |
| Database | PostgreSQL (Supabase — free tier) |
| SMS Alerts | Twilio API (trial account — verified numbers only) |
| Auth | Clerk (free tier) — minimal, just for demo login |
| Mock APIs | Next.js API routes serving seeded JSON data |
| Hosting | Vercel |

Single repo. Single deploy target. No Docker. No Redis. No exotic infra.

---

## 9. Data Models

→ Full field-level schemas with JSON examples are in the **API Reference** page.

---

## 10. API Endpoints

→ Full route contracts with input/output JSON are in the **API Reference** page.

---

## 11. Demo Script (3 Minutes)

### [0:00–0:20] The hook

"Raise your hand if you know someone who runs a small business." Pause. "82% of the ones that fail, fail because they couldn't see the money running out. Not because they're bad at what they do. Because nobody told them what was coming. We built the thing that tells them."

### [0:20–0:50] Connect the data

"This is Sweet Grace Bakery. She sells cakes in Durham. She uses Stripe." Hit 'Connect Stripe.' Transactions stream in — real line items populating live: `$847 Wedding cake`, `$2,400 Rent`, `$312 King Arthur Flour`, `$1,890 Payroll`. "That's 4 months of transaction history pulled from her payment provider. No spreadsheets. No data entry."

### [0:50–1:30] The oh-shit moment

Dashboard loads. Top of screen, large red text:

🔴 **"You will miss payroll in 9 days."**

Let it sit 2 seconds. "She made $14,000 last month. She thinks she's fine. She's not." Click into the breakdown: the AI summary explains — payroll, insurance, and rent all hit the same week, and there's a $3,200 unpaid invoice. "Without us, she finds out March 28 when the direct deposit bounces."

### [1:30–1:50] The phone buzzes

"She doesn't even need to open the dashboard." On cue, the phone on the table buzzes. Pick it up, show it: 📱 "Runway Alert: Projected shortfall of $2,200 in 9 days. You may not make payroll March 28. Open dashboard for details." "That went out through Twilio the second our system detected the risk."

### [1:50–2:30] The fix

"We don't just warn. We tell you what to do." Scroll to Recommended Actions:

1. Collect $3,200 overdue invoice from Durham Catering — "Send reminder" button, click it.
2. You're paying for two scheduling tools ($89 + $45/mo) — cancel one, save $1,068/year.
3. Delay flour order by 5 days — supplier allows Net 30, you're paying Net 15.

"Three actions. 90 seconds to understand. A CFO would catch this — next month. We caught it 9 days early and sent a text."

### [2:30–2:50] The growth scenario (if what-if is built)

"She wants to hire a decorator." Type $1,800/mo. Runway counter drops from 47 → 22 days. Drag pricing slider up 12%. Counter climbs to 39. "Now she's deciding with data, not gut."

### [2:50–3:00] Close

"33 million small businesses. Most have never seen a cash flow forecast. Most can't afford a CFO. We give them one that texts at 2am when something's wrong. This is Runway."

---

## 12. Developer Assignments

→ Full ticket schedule with times, tasks, and done criteria are in the **Dev Ticket Schedule** page.

---

## 13. Track & Prize Alignment