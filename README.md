# SpendSignal (Credex AI Spend Audit)

SpendSignal is a free tool for startup founders and engineering managers who want to reduce AI tool costs. Users enter their current tools, plans, spend, seats, team size, and use case, then instantly get a clear savings report with action steps.

It is built as a Next.js app in `web/` and includes an audit engine, AI summary generation, lead capture, and public share links.

## Screenshots

Home + input form:

![SpendSignal home and input form](web/docs/screenshots/01-input.png)

Audit results + per-tool actions:

![SpendSignal audit results](web/docs/screenshots/02-results.png)

Public share page:

![SpendSignal public shared audit](web/docs/screenshots/03-share.png)

**Demo (screen recording):** [YouTube — SpendSignal walkthrough](https://youtu.be/Lox-3u4IIjM)

## Quick start

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy

Deploy the `web/` folder to Vercel, Netlify, or Render.

Set these environment variables in your host dashboard:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL`
- `GEMINI_API_KEY` (optional, summary fallback works without it)
- Email provider vars (`POSTMARK_*` or `SENDGRID_*` or `TWILIO_*`)

Never commit `.env.local` or secret files.

## Live URL

[https://spendsignal-dm8a.vercel.app](https://spendsignal-dm8a.vercel.app/)

## Repo layout

- `web/` — Next.js app (UI, engine, API, share pages)
- `web/supabase/schema.sql` — required DB tables
- `.github/workflows/ci.yml` — lint + test on push to `main`
- Root docs (`ARCHITECTURE.md`, `DEVLOG.md`, `REFLECTION.md`, etc.) — assignment deliverables

## Decisions (5 trade-offs)

1. **Deterministic rules for audit math, not AI**
   - Why: savings logic must be finance-defensible and repeatable.
   - Trade-off: less flexible than an AI-only engine, but much safer.

2. **AI only for personalized summary**
   - Why: summary tone can benefit from LLM writing, but numbers must stay rule-based.
   - Trade-off: added API dependency, handled with strong fallback.

3. **Supabase for both leads and shared audits**
   - Why: one backend for two data paths keeps setup simple.
   - Trade-off: tighter coupling to Supabase in MVP stage.

4. **Local storage for form persistence**
   - Why: best UX for no-login flow; users can refresh and keep work.
   - Trade-off: stored state is per browser/device, not cross-device.

5. **Simple anti-abuse (rate limit + honeypot)**
   - Why: enough for MVP and fast to ship.
   - Trade-off: not as strong as CAPTCHA, but less friction for real users.
