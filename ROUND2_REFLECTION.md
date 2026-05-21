# Round 2 reflection

## 1) Hardest part under the 36h clock

The messiest hour was **duplicate commits** early — I shipped a thin schema slice before the full persist flow and had to rewrite branch history so GitHub only showed real feature commits. That cost time but matched the “extend cleanly, don’t hide it” rule; I logged it in `ROUND2_DEVLOG.md`.

Second: **Supabase paused** overnight. DNS failed until I resumed the project and ran migrations in the SQL editor — same class of bug as Round 1 (schema on disk ≠ schema in the cloud).

## 2) Decision I’d defend to a senior engineer

**Manual `POST /api/detect-changes` instead of Vercel Cron.** Cron needs Pro/scheduling setup and is harder for a reviewer to replay. A documented curl path plus `dryRun` / `skipEmail` flags makes the PR testable in five minutes.

**One email per user, many audits inside.** The brief explicitly said not to spam. Grouping by normalized email in `pricingChangeEmail.ts` was simpler than a queue and good enough for MVP.

**Compare page re-runs the engine live** instead of storing a second full result row. Less schema churn; the “new” side is always current catalog/rules.

**UI for emails after curl-only testing.** I added `/admin/reaudit` and a compare-page button so reviewers are not stuck on terminal commands. Lead capture still sends the Round 1 mail; Round 2 mail is intentional after pricing changes.

## 3) What I’d do with another day

Add **idempotent email** (don’t resend if `last_change_payload` unchanged). Add **PDF export** on the compare page for finance threads. Wire a **weekly cron** once deploy env is stable.

## 4) How I used AI tools

**Cursor** — boilerplate for `detectChanges`, email HTML, compare layout; jumping between `web/src/lib` and API routes.  
**ChatGPT** — light edits on PR/devlog sentences.  
**Not AI** — `engineRules.ts` numbers, Supabase SQL, env/secrets, and whether lead capture should succeed when only email fails (kept Round 1 split behavior).

I disclosed AI in this file and `ROUND2_PR.md`. I removed `Co-authored-by` trailer commits from the branch history so attribution stays in prose I wrote.

## 5) Self-rating (Round 2 only)

| Area | Score | Reason |
|------|-------|--------|
| Speed under constraint | 7 | Core 4 shipped; cron and bonuses cut openly |
| Extending existing codebase | 8 | Same tables, engine, email stack |
| Engineering judgment | 8 | Clear cuts documented; deterministic math preserved |
| Communication | 7 | PR + devlog honest; compare UI could use one more screenshot |
| Honest debugging | 9 | Pause, migrations, duplicate commits all logged |

## 6) AI-generated content in submission

Product copy and emails are partly AI-drafted; **all savings numbers** come from `runAudit` / tests. If a reviewer sees `$1436/mo` in an email, that trace goes to `engine.ts`, not an LLM.
