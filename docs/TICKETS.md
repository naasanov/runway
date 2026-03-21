**Hacking window:** 3:00 PM Saturday → 10:30 AM Sunday · Judging: 12:30–2:00 PM Sunday

> **Layer ownership:** Each dev owns one technical layer end-to-end. No one is just testing or doing coordination work. Dev 2 and Dev 4 split the original AI/backend layer — Dev 2 owns the Gemini integration and forecast engine, Dev 4 owns all alert scenario logic and Twilio. Integration is everyone's responsibility at the milestone gates.
> 

---

## Layer Assignments

| Dev | Layer | Stack |
| --- | --- | --- |
| Dev 1 | Data | Supabase schema, mock Stripe API, mock banking API, seed data |
| Dev 2 | AI + Forecast Engine | Gemini categorization, cash flow forecast, runway calculation |
| Dev 3 | Frontend | Next.js app, dashboard UI, Recharts cash flow chart, alert cards, Connect flow |
| Dev 4 | Alert Scenarios + Notifications | All 4 alert scenario detectors, Twilio SMS, `/api/business/:id/alerts`, demo hardening |

---

## Integration Milestones

| Time | Milestone | Gate |
| --- | --- | --- |
| 5:00 PM | Supabase live, mock Stripe endpoint returning data | Dev 1 demos standalone |
| 7:00 PM | API route stubs deployed, frontend wired to stub responses | Dev 3 shows layout with fake data |
| 9:00 PM | Gemini categorization + forecast running against bakery seed data | Dev 2 demos from CLI |
| 10:00 PM | All 4 alert scenarios firing, Twilio SMS working | Dev 4 demos from CLI |
| 11:00 PM | Dashboard renders with real DB data, alerts visible | All devs verify together |
| 2:00 AM | Full end-to-end flow: Connect → Forecast → Alert → SMS | Dry run #1 |
| 8:00 AM | Demo script runs clean, 3 min, no crashes | Dry run #2 |
| 10:30 AM | Code freeze | All devs |

---

## Dev 1 — Data Layer

**Owns:** Supabase schema, mock Stripe API, mock banking API, transaction seed data

### TICKET D1-01: Supabase Schema + Migrations

**Time:** 3:00 PM – 5:00 PM

- Define and run migrations for `businesses`, `transactions`, `alerts`, `scenarios` tables
- `transactions` schema must include: `id`, `business_id`, `source`, `transaction_type` (`invoice` | `debit` | `credit`), `invoice_status` (`paid` | `unpaid` | null), `invoice_date`, `customer_id`, `amount`, `description`, `category`, `date`, `is_recurring`, `recurrence_pattern`
- Confirm connection string works from Next.js
- **Done when:** All tables created, `supabase.from('transactions').select()` returns without error

### TICKET D1-02: Mock Stripe Endpoint

**Time:** 5:00 PM – 7:00 PM

- Build `GET /api/mock/stripe/transactions`
- Seed 90 days of realistic bakery data: daily customer revenue ($15–$350, 3–8/day), bi-weekly payroll ($3,800), monthly rent ($2,400), King Arthur Flour supplier payments, Square POS + Canva + two scheduling tool subscriptions
- Stamp Durham Catering as `transaction_type: 'invoice'`, `invoice_status: 'unpaid'`, `invoice_date: today - 12`, `customer_id: 'cust-durham-catering'`, `amount: 3200`
- Durham Catering must appear across enough transactions over 90 days to account for >60% of total revenue (triggers the concentration alert)
- **Done when:** Endpoint returns 90+ transactions including the unpaid Durham Catering invoice

### TICKET D1-03: Mock Banking Endpoint + Payroll-Miss Validation

**Time:** 7:00 PM – 9:00 PM

- Build `GET /api/mock/banking/accounts`
- Include non-Stripe items: insurance ($1,200 quarterly, hits Mar 28), manual deposits, rent
- Validate that when Dev 2 runs the forecast, cash goes negative on payroll day ~9 days out
- **Done when:** Dev 2 confirms the forecast produces a negative cash position on the correct date

### SLEEP BLOCK

**Time:** 9:00 PM – 12:30 AM

### TICKET D1-04: Date Math Utility + Seed Tuning

**Time:** 12:30 AM – 3:00 AM

- Build a date offset utility so all seed dates are relative to `today`, not hardcoded — the "9 days to miss payroll" must stay accurate whenever the demo runs
- Fix any seed data issues surfaced during dry run #1
- **Done when:** Forecast shows correct countdown on Sunday morning

### SLEEP BLOCK

**Time:** 3:00 AM – 7:00 AM

### TICKET D1-05: Final Seed Verification

**Time:** 7:00 AM – 10:30 AM

- Verify all 4 alert scenarios fire correctly against live data during dry run #2
- Adjust transaction amounts or dates if any scenario isn't landing
- **Done when:** Dev 4 signs off on all alerts during dry run #2

---

## Dev 2 — AI + Forecast Engine Layer

**Owns:** Gemini API integration, transaction categorization, cash flow forecast engine, runway calculation

### TICKET D2-01: Transaction Categorization (Gemini)

**Time:** 3:00 PM – 5:30 PM

- Build `POST /api/business/:id/analyze`
- Input: raw transactions from DB. Send batches to Gemini with a structured prompt requesting JSON output
- Each transaction gets back: `category` (Revenue | Payroll | Rent | Supplies | Subscriptions | Insurance | Taxes | One-time | Unknown) and `is_recurring` + `recurrence_pattern`
- Write categorized results back to the `transactions` table
- **Done when:** Bakery seed data returns fully categorized with correct recurrence flags on all expected transactions

### TICKET D2-02: Cash Flow Forecast Engine

**Time:** 5:30 PM – 8:00 PM

- Build `GET /api/business/:id/forecast`
- From categorized transactions, detect recurring obligations and project them forward day-by-day for 30/60/90 days
- Project revenue using trailing 30-day daily average
- For each day: compute `projected_balance`, list `obligations`, estimate `expected_revenue`, flag `is_danger` if balance goes negative
- Detect and return `first_negative_date`
- **Done when:** Running against bakery data returns a negative projection on payroll day with correct day-by-day breakdown

### TICKET D2-03: Runway Calculation

**Time:** 8:00 PM – 9:00 PM

- Compute `runway_days` as `current_balance / avg_daily_net_burn`
- Assign `runway_severity`: green ≥ 60 days, amber 30–59, red < 30
- Write both values to `businesses` table after every forecast run
- **Done when:** Runway counter on the dashboard reflects the correct value pulled from DB

### SLEEP BLOCK

**Time:** 9:00 PM – 12:30 AM

### TICKET D2-04: `/api/business/:id/dashboard` Aggregation Endpoint

**Time:** 12:30 AM – 3:30 AM

- Build the dashboard aggregation endpoint: assembles business record, active alerts (from DB), 30-day forecast summary, and upcoming obligations into a single response
- This is the only call Dev 3's dashboard page makes on load
- **Done when:** Dashboard loads with fully real data from a single API call

### SLEEP BLOCK

**Time:** 3:30 AM – 7:00 AM

### TICKET D2-05: Prompt Hardening + Integration Support

**Time:** 7:00 AM – 10:30 AM

- Fix any Gemini prompt edge cases surfaced in dry run #1 (miscategorized transactions, wrong recurrence detection)
- Ensure forecast recomputes correctly when seed data date offsets are applied
- **Done when:** Categorization and forecast are clean through dry run #2

---

## Dev 3 — Frontend Layer

**Owns:** Next.js app, dashboard UI, Recharts cash flow chart, alert cards, Connect Stripe flow, all client-side state

### TICKET D3-01: Next.js Scaffold + Vercel Deploy

**Time:** 3:00 PM – 4:30 PM

- Initialize Next.js 14 with Tailwind CSS + shadcn/ui
- Push to repo, confirm Vercel auto-deploys on merge to main
- Add Auth0 — minimal config, just enough for a demo login
- **Done when:** Live URL is up and accessible

### TICKET D3-02: Dashboard Layout + Runway Counter

**Time:** 4:30 PM – 6:30 PM

- Build page layout: sidebar, main content area, business name header
- Headline "Runway: X days" counter — large, bold, color-coded by severity (green/amber/red)
- Wire to `GET /api/business/:id/dashboard` stub; render with hardcoded data until real API is ready
- **Done when:** Dashboard loads with correct layout and runway number visible

### TICKET D3-03: Cash Forecast Chart

**Time:** 6:30 PM – 8:30 PM

- 30-day projected cash position chart using Recharts AreaChart
- Red horizontal line at $0; area below zero filled red; danger zone dates marked
- Animate on load — the dip into negative territory should be visually dramatic
- **Done when:** Chart renders correctly with seeded data and the negative dip is unmissable

### TICKET D3-04: Alert Cards + Action Buttons

**Time:** 8:30 PM – 10:30 PM

- Alert card component: severity badge, headline, plain-English detail, recommended actions list
- "Send Reminder" button on the overdue invoice card (calls `POST /api/actions/send-reminder`, shows confirmation)
- **Done when:** All 4 alert types render correctly with their action items

### TICKET D3-05: Connect Stripe Onboarding Flow

**Time:** 10:30 PM – 12:00 AM

- "Connect Stripe" button triggers `POST /api/business/connect`
- Loading animation: transactions stream in as a live list (typewriter effect, line by line)
- Transitions to dashboard on completion
- **Done when:** Full connect-to-dashboard flow runs without manual page refresh

### SLEEP BLOCK

**Time:** 12:00 AM – 3:00 AM

### TICKET D3-06: What-If Scenario Panel (Stretch)

**Time:** 3:00 AM – 5:30 AM

- Scenario panel: salary input for new hire, pricing adjustment slider
- On change, calls `POST /api/scenario/model` and updates runway counter live
- **Done when:** Dragging the salary slider visibly changes the runway number in real time

### SLEEP BLOCK

**Time:** 5:30 AM – 8:30 AM

### TICKET D3-07: UI Polish + Resilience

**Time:** 8:30 AM – 10:30 AM

- Skeleton loading states for all data-fetched components
- Fallback to cached dashboard data if API is slow (pre-fetch and store on connect)
- Make the payroll-miss alert headline unmissable — largest text on the page, red, no competition
- **Done when:** App handles a slow API gracefully and passes Dev 4's dry run #2 check

---

## Dev 4 — Alert Scenarios + Notifications Layer

**Owns:** All 4 alert scenario detectors, Twilio SMS, `/api/business/:id/alerts`, `/api/scenario/model` what-if engine, dry runs

### TICKET D4-01: API Route Stubs + Vercel Config

**Time:** 3:00 PM – 5:00 PM

- Configure Vercel project, set all env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `CLERK_*`
- Create stub handlers for every route so Dev 3 can build against real endpoints from day one
- Routes: `/api/business/connect`, `/api/business/:id/dashboard`, `/api/business/:id/forecast`, `/api/business/:id/alerts`, `/api/business/:id/analyze`, `/api/alerts/send-sms/:alertId`, `/api/scenario/model`, `/api/actions/send-reminder`
- **Done when:** Every route is deployed and returns a valid hardcoded stub response; Dev 3 confirms they can wire to them

### TICKET D4-02: Alert Scenario 1 — Runway

**Time:** 5:00 PM – 5:45 PM

- Read `runway_days` and `runway_severity` from `businesses` table (written by Dev 2)
- Generate and write alert: green/amber/red based on severity thresholds
- Headline: "You have X days of cash remaining at current burn rate."
- **Done when:** Alert record written to DB with correct severity after `/analyze` runs

### TICKET D4-03: Alert Scenario 2 — Overdue Invoice

**Time:** 5:45 PM – 7:00 PM

- Query: `transaction_type = 'invoice'` AND `invoice_status != 'paid'` AND `invoice_date < today - 7`
- Link the outstanding amount to the nearest projected shortfall from the forecast
- Headline: "[Customer] owes $[X] and is [Y] days overdue. Collecting it by [date] covers your [obligation] shortfall."
- **Done when:** Durham Catering alert fires and correctly references the payroll-miss shortfall

### TICKET D4-04: Alert Scenario 3 — Subscription Waste

**Time:** 7:00 PM – 8:00 PM

- Find all transactions where `category = 'subscriptions'`; send the list to Gemini to identify overlapping tools
- Surface the higher-cost duplicate as the cancellation target; calculate annual savings
- Headline: "You're paying $[X]/month for [N] tools that do the same thing."
- **Done when:** Two scheduling tools ($89 + $45/mo) fire an amber alert with the correct savings figure

### TICKET D4-05: Alert Scenario 4 — Revenue Concentration

**Time:** 8:00 PM – 9:00 PM

- Aggregate revenue by `customer_id` over trailing 90 days
- Trigger when any single customer > 40% of total: amber at 40–60%, red above 60%
- Headline: "[X]% of your revenue in the last 90 days came from one client: [Customer]."
- **Done when:** Durham Catering concentration alert fires at the correct threshold with correct percentage

### TICKET D4-06: Twilio SMS Integration

**Time:** 9:00 PM – 10:30 PM

- Build `POST /api/alerts/send-sms/:alertId`
- Auto-trigger on any red-severity alert written to DB during `/analyze`
- Message format: "Runway Alert for [Business]: [headline]. Open dashboard: [link]"
- **Done when:** SMS arrives on a real phone within 5 seconds of a red alert being created

### SLEEP BLOCK

**Time:** 10:30 PM – 2:00 AM

### TICKET D4-07: `/api/scenario/model` What-If Engine

**Time:** 2:00 AM – 4:30 AM

- Build the what-if computation endpoint — takes the current forecast and applies a delta
- Supported types: `new_hire` (adds monthly debit), `price_increase` (scales daily revenue), `cut_expense` (removes recurring debit), `delay_payment` (shifts one-time payment forward N days)
- Returns `baseline.runway_days`, `modeled.runway_days`, `delta_days`, and per-scenario impact breakdown
- Does not persist anything — pure computation
- **Done when:** POSTing `{ new_hire_salary: 1800 }` returns a correctly reduced runway number; Dev 3 wires the slider to it

### SLEEP BLOCK

**Time:** 4:30 AM – 7:30 AM

### TICKET D4-08: Dry Runs + Demo Hardening

**Time:** 7:30 AM – 10:30 AM

- **Dry run #2** with full team — run the 3-min script start to finish, all 4 devs present
- Time every beat: hook (0:20), connect (0:50), payroll miss (1:30), SMS buzz (1:50), fix (2:30), close (3:00)
- Build fallback cached dashboard (pre-load and store full dashboard API response for offline demo)
- Record a fallback screen recording of the full 3-min flow
- **Done when:** Script runs clean twice in a row; fallback is ready on a second device

---

## Pre-Demo Checklist (10:30 AM Sunday)

- [ ]  Vercel deploy green on latest commit
- [ ]  Demo account logged in, bakery data pre-loaded
- [ ]  Runway counter shows correct value with correct color
- [ ]  All 4 alert cards visible on dashboard
- [ ]  Payroll-miss alert is red and at the top
- [ ]  Twilio SMS tested to demo phone — arrives within 5 seconds
- [ ]  Fallback cached dashboard verified
- [ ]  Screen recording fallback loaded on second device
- [ ]  Devpost submission complete with GitHub repo linked

## Pitch Slides (10:30–11:30 AM, split across team)

5 slides max. Each dev owns one:

- **Dev 1:** The stat — "82% of small businesses fail from cash flow problems"
- **Dev 2:** The problem — what happens without Runway
- **Dev 3:** Demo screenshots — payroll miss, the SMS, the fix
- **Dev 4:** The close — market size, what Runway is