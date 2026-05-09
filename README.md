# SpendSignal (Credex AI Spend Audit)

SpendSignal is a free web app for startup founders and engineering leads: enter AI tool plans, monthly spend, seats, and use case; get an instant savings audit, optional email capture, and a shareable public report link.

The Next.js application lives in the **`web/`** directory.

## Quick start

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy

Deploy the **`web`** folder to Vercel (or similar). Set environment variables from `web/.env.example` in the hosting dashboard—never commit `.env.local` or secret dumps.

## Live app

[https://spendsignal-dm8a.vercel.app](https://spendsignal-dm8a.vercel.app/)

## Repo layout

- `web/` — Next.js app (UI, audit engine, API routes)
- `PRICING_DATA.md`, `PROMPTS.md`, `DEVLOG.md` — assignment deliverables at repo root
- `.github/workflows/ci.yml` — runs `npm run lint` and `npm run test` on every push to `main`

## Decisions (preview)

1. **App in `web/`** — avoids conflicts with tooling at repo root and matches common monorepo layout.
2. **Postmark for transactional email** — works with current sender constraints; provider logic is isolated in `web/src/lib/email.ts`.
3. **Supabase for leads and public shares** — single backend for persistence and share IDs.
4. **Deterministic audit math** — LLM used only for the optional summary, not for savings numbers.
5. **CI on `main`** — keeps lint and the five audit-engine tests green for reviewers.

(Full “Decisions” section with five trade-offs will be expanded in the final README pass before submission.)
