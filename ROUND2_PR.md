# Round 2 PR — Re-audit on pricing change

**Branch:** `round-2-reaudit` → `main` (do not merge)  
**Preview:** Vercel deployment URL from this PR (root directory `web/`)  
**Production (Round 1 only):** https://spendsignal-dm8a.vercel.app/

## Summary

Round 2 extends SpendSignal so saved audits stay useful when AI vendor pricing or our rule set changes. I kept the Round 1 stack (Next.js App Router, Supabase `public_audits`, Postmark email, deterministic audit engine) and added: full audit persistence tied to `share_id`, manual pricing-change detection, consolidated notification emails, and a public compare view for original vs re-run results.

## What I built

**1. Persistent audit storage** — On share and lead capture we store `email`, `input_stack`, `pricing_snapshot`, and `pricing_version` alongside the existing result JSON. Audit ID remains the public `share_id`. `GET /api/audit/[shareId]` returns the stored record for debugging and future UI.

**2. Pricing-change detection** — `POST /api/detect-changes` loads audits that have email + snapshot, diffs stored snapshot vs live `pricingCatalog` / `engineRules`, re-runs `runAudit`, and writes `last_change_payload` + `change_detected_at`. Pricing updates are documented in-code: edit catalog/rules, bump `AUDIT_ENGINE_RULES_VERSION`, redeploy, call the endpoint. I skipped Vercel Cron and used a manual API so reviewers can trigger with curl and a secret header in production.

**3. Notification emails** — After detection (unless `dryRun` or `skipEmail`), affected audits are grouped by email address so each user gets **one** message covering all their audits. The HTML includes pricing row changes, recommendation shifts, savings delta, and a link to the compare page.

**4. Compare diff view** — `/audit/[shareId]/compare` shows original saved results vs a fresh engine run on the same input. Changed tools appear side-by-side with highlights; unchanged tools are collapsed. Total savings delta is shown at the top.

**5. UI to trigger detection and emails (no curl required)** — `/admin/reaudit` runs the same job as `POST /api/detect-changes` via server actions (dry run / save only / save + email). On each compare page, **Send pricing-update email** re-detects that audit and mails the saved address if something changed. Local dev enables admin automatically; set `NEXT_PUBLIC_ENABLE_REAUDIT_ADMIN=true` on Vercel Preview.

## How to test (preview)

1. Run both SQL migrations in Supabase (`20260520_round2_stored_audits.sql` and `20260521_round2_change_detection.sql`).
2. Set Preview env vars: `SUPABASE_*`, `EMAIL_PROVIDER` + Postmark (or SendGrid), `DETECT_CHANGES_SECRET`, `NEXT_PUBLIC_ENABLE_REAUDIT_ADMIN=true`.
3. On preview: run an audit with real spend, **Create share URL**, **Capture report** with email (Round 1 confirmation email — expected).
4. Edit `pricingCatalog.ts` and/or bump `AUDIT_ENGINE_RULES_VERSION` in `engineRules.ts`, redeploy preview.
5. **UI (recommended):** open `/admin/reaudit` → **Send pricing-update emails**, or on `/audit/<shareId>/compare` → **Send pricing-update email**.
6. **API (optional):** `curl -X POST "https://<preview>/api/detect-changes" -H "x-detect-changes-secret: <secret>"`
7. Check inbox for **“Pricing update on your audit”** (not the Round 1 “audit is ready” subject); open compare page.

Local: `cd web && npm run dev` — `/admin/reaudit` works without extra env; detect-changes API works without secret in non-production.

## What I cut (and why)

- **Vercel Cron / GitHub Actions scheduler** — Manual endpoint is enough for 36h scope; documented in API comment and here.
- **Bonus:** unsubscribe, public “what changed this week”, admin dashboard.
- **Auto-updating `audit_payload` on detect** — Compare page re-runs engine live; stored payload stays the saved baseline.

## Known limits

- Email deliverability still depends on Postmark sender verification (same as Round 1).
- Detection can flag `engineRulesChanged` when rule JSON drifts without a version bump; bumping `AUDIT_ENGINE_RULES_VERSION` keeps demos clear.
- Supabase free tier pauses inactive projects; migrations must be re-applied after resume.

## AI tools (disclosure)

I used **Cursor** for navigation, refactors, and draft API/email HTML. I used **ChatGPT** occasionally for wording in docs. I did **not** let AI choose savings math, secrets, or migration contents — those were typed and tested (`vitest` on engine, snapshot diff, email grouping). I reviewed all Round 2 routes before commit.

## Round 1 continuity

No framework rewrite. `main` is unchanged; all Round 2 work is on `round-2-reaudit`. Reviewers can diff against Round 1 `main` to see only the re-audit layer.
