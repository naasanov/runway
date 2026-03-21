# Project Guidelines

- Use `env.X` from `src/lib/env.ts` instead of `process.env.X`. Always add new env vars to the zod schema in `src/lib/env.ts`.
- Reuse shared modules in `src/lib/` instead of reinitializing clients or redefining types:
  - `env.ts` — validated env vars (see above)
  - `supabase.ts` — Supabase client
  - `gemini.ts` — Gemini AI client
  - `sms.ts` — Azure SMS client and sender number
  - `api.ts` — typed fetch wrapper (`api.get`, `api.post`, `api.put`, `api.del`) and `ApiError`
  - `errors.ts` — API error response helpers (`badRequest`, `notFound`, `serverError`)
  - `utils.ts` — `cn()` for Tailwind class merging
  - `types.ts` — shared domain types, constants, and API response interfaces
- Use `date-fns` for date operations
- When adding or modifying API routes, always add or update corresponding tests in `src/__tests__/`. Mock external services (Supabase, Gemini, Azure SMS) — tests must run without real credentials. Follow the existing patterns in that directory (jest.mock factories, `makeRequest` helpers, testing validation + response shape + core logic separately).
