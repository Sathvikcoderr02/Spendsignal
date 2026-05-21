# Round 2 PR — Re-audit on pricing change

**Branch:** `round-2-reaudit` → `main` (do not merge)  
**Preview:** Vercel URL from this PR (`web/` folder)  
**Round 1 live site:** https://spendsignal-dm8a.vercel.app/

## What this PR does

Round 1 gave users one audit and a share link. Round 2 saves that audit properly (email, inputs, results, and a snapshot of prices at save time). When prices or rules change later, the app can find affected audits, send **one email per user** (not many), and show a **compare page**: old results on the left, new results on the right.

## Why

AI tool prices change all the time. An old audit can show wrong savings. People who already used SpendSignal should get an update without typing everything again. I built for the same user as Round 1: busy founder or EM who wants clear numbers and a simple email, not a spreadsheet.

## How it works

**Where the code lives**

- Save audit: `web/src/app/api/share/`, `web/src/app/api/leads/`
- Detect changes: `web/src/app/api/detect-changes/`, `web/src/lib/reaudit/detectChanges.ts`
- Emails: `web/src/lib/reaudit/pricingChangeEmail.ts`
- Compare page: `web/src/app/audit/[shareId]/compare/`
- Admin buttons: `web/src/app/admin/reaudit/`
- Database: two SQL files in `web/supabase/migrations/`

**Flow**

```
User runs audit → share link + email capture
        ↓
Saved in Supabase (share_id = public audit URL)
        ↓
You change prices in code + redeploy
        ↓
Run detection (API or /admin/reaudit)
        ↓
Email user (one mail per address) → link to compare page
        ↓
Compare: saved audit vs fresh run on same inputs
```

**How to change prices:** edit `pricingCatalog.ts` and/or `engineRules.ts`, bump `AUDIT_ENGINE_RULES_VERSION`, redeploy, then run detection. No cron in this PR.

**How to trigger detection:** `POST /api/detect-changes`, or `/admin/reaudit` on preview, or the button on the compare page for one audit.

## What I cut

- **Automatic cron** — reviewers run detection by hand; faster to ship and easier to test.
- **Bonus items** — unsubscribe link, public “what changed this week” page, admin stats dashboard.
- **Saving a second full result in the database** — the compare page runs the engine again instead.
- **Round 2 email on “Capture report”** — that button still sends the Round 1 “your audit is ready” mail only. Round 2 mail goes out after a price change is detected.

## How to test it manually

1. Run both Round 2 SQL files in Supabase (see `web/supabase/migrations/`).
2. On preview (or local `npm run dev`), set Supabase keys, email (Postmark), `DETECT_CHANGES_SECRET`, and `NEXT_PUBLIC_ENABLE_REAUDIT_ADMIN=true`.
3. Open the app. Add a tool with real spend (example: Cursor Pro, $40/mo, 2 seats). Run the audit.
4. Click **Create public share URL**, then **Capture report** with your email. You should get the Round 1 confirmation email.
5. In code, change a price you used (e.g. Cursor Pro in `pricingCatalog.ts`) and bump `AUDIT_ENGINE_RULES_VERSION` in `engineRules.ts`. Redeploy or restart dev.
6. Go to **`/admin/reaudit`** → click **Send pricing-update emails**.
7. Check email for **“AI pricing changed”** (not the Round 1 subject). Click the compare link.
8. On **`/audit/<shareId>/compare`**, check the savings delta at the top, any changed tools side by side, and unchanged tools in the collapsed list.

## What's tested

`npm run test` in `web/` covers the audit engine, pricing snapshot, change detection, email grouping, and compare helpers. CI runs lint + test on push.

Not automated yet: full flow with real Supabase + real email, and “do not send the same email twice.”

## Open questions / risks

- Email can still fail if Postmark sender/domain is not set up (same as Round 1).
- Supabase free tier can **pause**; you must wake the project and run migrations again.
- If you only change internal rules and not list prices, the email may say “no savings change” — for a clear demo, change a real price and bump the version string.

## AI tools (disclosure)

I used Cursor for speed on layout and boilerplate, and ChatGPT a little for doc wording. I did **not** use AI for savings math or secrets. Tests cover the math paths.
