# Round 2 devlog — Re-audit on pricing change

**Window:** 2026-05-20 10:00 → 2026-05-21 22:00 (36h)  
**Branch:** `round-2-reaudit` (preview deploy; do not merge to `main`)  
**Status at last update:** 2 of 4 core features shipped (storage + detection). Emails + diff UI not done yet.

---

## 2026-05-20 10:15 — Start

Read Round 2 brief. Goal: turn one-time audits into something that survives pricing changes. Mapped four must-haves: persist full audit, detect changes, email users (consolidated), side-by-side diff on re-run.

---

## 2026-05-20 10:45 — Plan (~30 min)

Decided to extend Round 1 `public_audits` instead of a new table — `share_id` already is the public audit ID. Pricing updates via editing `pricingCatalog.ts` / `engineRules.ts` + redeploy (documented in API comment). Detection via manual `POST /api/detect-changes` first; skip Vercel Cron for now to avoid Pro/plan risk and keep the PR testable with curl.

Four implementation commits in mind: (1) persist + snapshot, (2) detect-changes, (3) emails, (4) compare UI + submission docs.

---

## 2026-05-20 11:20 — Branch + schema direction

Checked out `round-2-reaudit` from latest Round 1 `main`. Listed columns to add: `email`, `input_stack`, `result` (already had result JSON), `pricing_snapshot`, `pricing_version`, `created_at`.

---

## 2026-05-20 14:10 — Mistake: pushed scaffold too early

Committed an early “schema + engineRules export” slice before the full persist flow was wired. Realized it duplicated work and looked like two parallel implementations. Stopped stacking more on top of that.

---

## 2026-05-20 15:30 — Commit 1 in progress

`buildPricingSnapshot()` from current catalog + `AUDIT_ENGINE_RULES_VERSION`. Extracted shared rules to `engineRules.ts` so detection and audit use the same math. Migration `20260520_round2_stored_audits.sql` drafted.

---

## 2026-05-20 17:00 — Blocker: Supabase columns

Local share/lead tests failed until migration applied in Supabase SQL editor (same issue as Round 1 — schema cache error until table updated). Added explicit API error text pointing at the migration file.

---

## 2026-05-20 19:27 — Commit 1 done

Shipped `feat: persist full audit record tied to share_id`: `POST /api/share` and `POST /api/leads` save `input_stack` + `pricing_snapshot`; `GET /api/audit/[shareId]`; homepage sends `input` + tracks `shareId`. Vitest for snapshot builder.

---

## 2026-05-20 19:42 — Commit 2 done

Shipped `feat: pricing snapshot compare and detect-changes API`: `detectChangesForStoredAudit()` compares stored snapshot vs live catalog/rules, re-runs engine, writes `last_change_payload` + `change_detected_at`. `POST /api/detect-changes` with `DETECT_CHANGES_SECRET` / `dryRun`. Second migration `20260521_round2_change_detection.sql`.

---

## 2026-05-20 20:10 — Git cleanup

Removed duplicate Round 2 commits from branch history (scaffold + separate plan doc) so GitHub only shows the two real feature commits. Accidentally picked up a screenshot in rebase once — removed from commit. Still need `git push --force-with-lease` if remote had old history.

---

## 2026-05-20 20:45 — Honest scope check

**Done:** Feature 1 (persistent storage), Feature 2 (detection + documented pricing update path).  
**Not done:** Feature 3 (consolidated notification emails), Feature 4 (diff compare page).  
**Cut for time (will document in PR):** Vercel Cron, bonus unsubscribe, public “what changed” page, admin dashboard.


