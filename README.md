# Runway

> **🏆 MLH Best Use of ElevenLabs — HackDuke 2026**

***HackDuke 2026 · AI for Finance Track***

**Nicolas Asanov · Abhimanyu Agashe · Vidur Shah · Arya Venkatesan**

---

**AI-powered cash flow intelligence for small business owners.**
Runway connects to your business data, forecasts your cash position, and calls you with a custom AI voice the moment a crisis is on the horizon — before it hits.

> QuickBooks tells you what happened.
> **Runway tells you what's about to happen.**

---

## What it does

- **Cash Flow Forecast** — day-by-day projection of your cash position for the next 30/60/90 days, flagging the exact date your balance goes negative
- **AI Voice Call Alerts** — when risk is detected, Runway calls you using an ElevenLabs AI voice matched to the severity of the alert (light / medium / heavy) — no app required, no jargon
- **AI Transaction Categorization** — Gemini AI categorizes every transaction, detects recurring obligations, and surfaces waste
- **Actionable Fixes** — not just warnings; specific steps with dollar-amount impact (collect this invoice, cancel that subscription, delay this payment 5 days)
- **Scenario Modeling** — model the impact of hypothetical changes (new hire, price increase, cut expense, delay payment) before committing

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database & Storage | Supabase |
| AI / Categorization | Google Gemini |
| Voice TTS | **ElevenLabs** |
| Phone Calls | Twilio |
| SMS | Azure Communication Services |
| Auth | Auth0 |
| Charts | Recharts |
| Tests | Jest |

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.template .env.local
```

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key |
| `GEMINI_MODEL` | Gemini model name (e.g. `gemini-2.5-flash`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `SUPABASE_ALERT_AUDIO_BUCKET` | Supabase storage bucket name for call audio |
| `ELEVENLABS_API_KEY` | ElevenLabs API key |
| `ELEVENLABS_VOICE_ID_LIGHT` | Voice ID for low-severity alerts |
| `ELEVENLABS_VOICE_ID_MEDIUM` | Voice ID for medium-severity alerts |
| `ELEVENLABS_VOICE_ID_HEAVY` | Voice ID for high-severity alerts |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_FROM_NUMBER` | Twilio outbound phone number |
| `ALERT_PHONE_NUMBER` | Default fallback number to call |
| `FALLBACK_AUDIO_URL` | (Optional) Static backup MP3 URL if TTS generation fails |
| `AUTH0_DOMAIN` | Auth0 domain |
| `AUTH0_CLIENT_ID` | Auth0 client ID |
| `AUTH0_CLIENT_SECRET` | Auth0 client secret |
| `AZURE_COMMUNICATION_CONNECTION_STRING` | Azure SMS connection string |
| `AZURE_SMS_FROM_NUMBER` | Azure SMS sender number |

### 3. Run

```bash
npm run dev
```

Open `http://localhost:3000`.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Lint |
| `npm run format` | Prettier on `src/**/*.{ts,tsx}` |
| `npm test` | Run Jest tests |
| `npm run test:watch` | Jest watch mode |

---

## Project structure

```
src/
├── app/
│   ├── api/          # API routes (alerts, auth, business, forecast, scenarios)
│   ├── connect/      # Onboarding / data intake page
│   ├── dashboard/    # Main dashboard
│   ├── login/        # Auth0 login
│   └── signup/       # Auth0 signup
├── components/       # Shared UI components
├── lib/              # Shared modules (env, supabase, gemini, api, types, etc.)
├── scripts/          # Standalone scripts (alert-call.ts)
└── __tests__/        # Jest test suite
```
