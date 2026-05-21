## Day 1 — 2026-05-06
**Hours worked:** 2.4  
**What I did:** Set up the project foundation and shipped core audit functionality reflected in  typed data models, deterministic audit engine, baseline UI, test coverage, and defensible pricing logic updates with `PRICING_DATA.md`.  
**What I learned:** The strongest audit output comes from explicit scenario math (baseline vs right-size vs alternative vs credits) rather than generic recommendations.  
**Blockers / what I'm stuck on:** Initial hydration mismatch and test alias issues slowed iteration until state-loading and import paths were stabilized.  
**Plan for tomorrow:** Improve visual polish, add AI summary generation, and continue with backend capture flow.

## Day 2 — 2026-05-07
**Hours worked:** 2.1  
**What I did:** Completed today’s commits by redesigning the UI, improving result readability, adding LLM-based personalized summaries with fallback behavior, and switching the summary provider path to Gemini.  
**What I learned:** Reliability matters as much as intelligence for user-facing AI features, so deterministic fallback is mandatory for demo and production trust.  
**Blockers / what I'm stuck on:** Remaining work is backend persistence, transactional email wiring, abuse protection, and shareable public result URLs.  
**Plan for tomorrow:** Implement Part 5 end-to-end and connect lead capture form to a real database and email flow.

## Day 3 — 2026-05-08
**Hours worked:** 2.6  
**What I did:** Implemented backend lead capture with Supabase + Resend integration, added abuse protection (honeypot and rate limiting), shipped shareable public audit URLs with dynamic Open Graph/Twitter metadata, and polished UI hierarchy and styling for a cleaner product-quality presentation.  
**What I learned:** End-to-end reliability depends on infrastructure setup as much as application code; clearer API error messages made debugging much faster when Supabase tables were missing.  
**Blockers / what I'm stuck on:** Share link creation initially failed due to missing `public_audits` table in Supabase schema cache, and email delivery still depends on completing verified sender-domain setup in Resend and it failed silently and gave 200 ok response
**Plan for tomorrow:** Finalize CI workflow, complete remaining required root documentation files, run deploy + Lighthouse checks, and do an end-to-end submission readiness pass.

## Day 4 — 2026-05-09
**Hours worked:** 1  
**What I did:** Removed a tracked `Untitled` file that contained secrets (GitHub push protection blocked `main`), added a root `.gitignore` for env dumps and local secrets, amended history so the branch is clean to push, added `.github/workflows/ci.yml` to run `npm run lint` and `npm run test` in `web/` on every push to `main`, and added a root `README.md` with quick start, deploy notes, and repo layout.  
**What I learned:** Treat any scratch env file as dangerous—use only `.env.local` (gitignored) and Vercel env vars; push protection is strict and catches mistakes before reviewers see the repo.  
**Blockers / what I'm stuck on:** None today.  
**Plan for tomorrow:** Finish remaining required root deliverables (`ARCHITECTURE.md`, `REFLECTION.md`, `TESTS.md`, GTM/economics/interviews/metrics/landing copy), run Lighthouse on the deployed URL, and verify CI is green on the latest `main` commit.

## Day 5 — 2026-05-10
**Hours worked:** 1.7  
**What I did:** Completed all required root documentation files in clear language: architecture, tests, reflection, GTM, economics, interviews, landing copy, and metrics. Also expanded README decisions to reflect real implementation choices and deployment setup.  
**What I learned:** Writing clear docs forced me to simplify technical ideas into practical user/business outcomes, which made weak assumptions easier to catch.  
**Blockers / what I'm stuck on:** None.  
**Plan for tomorrow:** Capture README screenshots, add YouTube demo link, run mobile Lighthouse on the deployed URL, then do a final README and submission checklist pass.

## Day 6 — 2026-05-11
**Hours worked:** 1.2  
**What I did:** Submission polish: saved three screenshots under `web/docs/screenshots/` (`01-input.png`, `02-results.png`, `03-share.png`), embedded them in `README.md`, and linked the screen recording at [https://youtu.be/Lox-3u4IIjM](https://youtu.be/Lox-3u4IIjM). Ran **Lighthouse (mobile)** on the live deploy `https://spendsignal-dm8a.vercel.app/` (verified 2026-05-10) — Performance **99**, Accessibility **90**, Best Practices **100** (meets the brief: ≥85 / ≥90 / ≥90).  
**What I learned:** Mobile Lighthouse can still score very high on a mostly static page if assets and JS stay lean; having a public URL early makes screenshot and audit checks repeatable.  
**Blockers / what I'm stuck on:** None.  
**Plan for tomorrow:** Final submission checklist and final commit organization.

## Day 7 — 2026-05-12
**Hours worked:** 1.5  
**What I did:** Final submission pass (docs + small product fixes only) `USER_INTERVIEWS.md` interviews 2 and 3 so each section has enough depth; wired **Book Credex consultation** to `NEXT_PUBLIC_CREDEX_CONSULT_URL` (defaults to `https://credex.rocks`) in `web/src/app/page.tsx`; added `web/.env.example`; documented **honeypot + IP rate limit** for `/api/leads` in `README.md` and `ARCHITECTURE.md`; added **audit engine assumption** table to `PRICING_DATA.md` (right-size targets, use-case benchmarks, 20% credits line) so finance readers see what is vendor list price vs MVP rule. README already has Lighthouse CLI note for extension-free runs.  
**What I learned:** Small “last day” items (consult URL, abuse write-up, pricing trace) are easy to skip but they are exactly what a rubric checks line by line.  
**Blockers / what I'm stuck on:** None.

---

## Round 2 — Re-audit on pricing change

Round 2 uses a **timestamped** log (assignment format, 10–15 entries). Full log: **[ROUND2_DEVLOG.md](./ROUND2_DEVLOG.md)**.

**Summary:** Round 2 on `round-2-reaudit` — persist, detect-changes, consolidated emails, compare UI, admin/compare UI to send Round 2 mail (not only curl), `ROUND2_PR.md` / `ROUND2_REFLECTION.md`. See [ROUND2_DEVLOG.md](./ROUND2_DEVLOG.md).

