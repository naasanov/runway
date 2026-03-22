# Runway

***HACK DUKE 2026: Finance Track***

Nicolas Asanov, Abhimanyu Agashe, Vidur Shah, Arya Venkatesan
---

**AI-powered cash flow intelligence for small business owners.**  
Runway connects to your business data, forecasts your cash position, and sends *plain‑language* alerts via SMS so you can act **before** a cash crunch hits.

> QuickBooks tells you what happened.  
> **Runway tells you what’s about to happen.**

## What it does

- **Cash Flow Forecast**: Day-by-day projection of your cash position for the next 30/60/90 days, including the date you go negative.
- **SMS Alerts**: Clear, actionable warnings sent to your phone (no dashboard required).
- **Actionable Fixes**: Suggested next steps with impact (e.g., collect an invoice, delay a payment, cancel a subscription).

## Tech stack

- **Next.js** (App Router) + **React** + **TypeScript**
- **Tailwind CSS**
- **Supabase** (data/auth/storage depending on configuration)
- **Auth0** (authentication)
- **Gemini** (AI analysis)
- **Azure Communication Services (SMS)** (text alerts)
- **Jest** (tests)

## Getting started

### 1) Install dependencies

This repo uses npm (includes `package-lock.json`):

```bash
npm install
```

### 2) Configure environment variables

Copy the template and fill in values:

```bash
cp .env.template .env.local
```

Required variables (from `.env.template`):

#### Supabase
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)

#### Gemini AI
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (default: `gemini-2.5-flash`)

#### Azure Communication Services (SMS)
- `AZURE_COMMUNICATION_CONNECTION_STRING`
- `AZURE_SMS_FROM_NUMBER`

#### Auth0
- `AUTH0_SECRET`
- `AUTH0_BASE_URL` (default: `http://localhost:3000`)
- `AUTH0_ISSUER_BASE_URL`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`

### 3) Run the app

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Scripts

- `npm run dev` — start Next.js dev server
- `npm run build` — production build
- `npm run start` — start production server
- `npm run lint` — lint
- `npm run format` — run Prettier on `src/**/*.{ts,tsx}`
- `npm test` — run Jest tests
- `npm run test:watch` — watch mode

## API (high level)

Routes live under `src/app/api`.

Currently discovered endpoints include:

- `POST /api/actions/send-reminder`  
  Returns a mocked “payment reminder” response (placeholder implementation).

Example response shape:

```json
{
  "sent": true,
  "sent_at": "2026-03-21T18:32:00Z",
  "to": "Durham Catering Co",
  "subject": "Payment Reminder: Invoice #1021 — $3,200.00 overdue",
  "message_preview": "Hi Durham Catering, this is a friendly reminder that Invoice #1021 for $3,200.00 is 12 days past due. Please remit payment at your earliest convenience."
}
```

## Project structure (partial)

- `src/app` — Next.js App Router pages (landing, dashboard, login, signup, etc.)
- `src/app/api` — API route handlers
- `src/lib` — shared modules (env, API helpers, Supabase/Gemini/SMS clients, domain types)

## Notes

This project was built for **HackDuke 2026** (AI for Finance track).
