# Reflection

## 1) Hardest bug this week, and how I debugged it

The worst one was the **share link** button on the home page. I would click **“Create public share URL”** in `web/src/app/page.tsx`, the UI said something like it could not create the link, but the Network tab showed a POST going out with a normal body. I thought I broke the fetch or the JSON shape first. I re-read the handler and the `/api/share` route in `web/src/app/api/share/route.ts` maybe three times. Nothing obvious.

Then I logged the real Supabase error on the server side. Postgres was complaining about a **missing relation** — basically the **`public_audits`** table did not exist in the Supabase project yet. I had the SQL file on disk (`web/supabase/schema.sql`) but I had never pasted it into the Supabase SQL editor for that project. I felt dumb for maybe 10 minutes, but it was not a typo in the code. I ran the SQL in Supabase, tried the button again, and I got a real `shareId` and a working `/audit/...` URL.

Second smaller mess: **email**. The lead row saved in `audit_leads` but my inbox stayed empty. I checked Postmark (and later SendGrid) logs and saw domain / sender rules I did not fully understand at first. I changed the API so a failed email does not pretend the whole capture failed — `web/src/app/api/leads/route.ts` still returns success when the row is stored, and the JSON message tells you if the confirmation email part broke. That took me off the wrong path where I kept thinking “the route is broken” when really **storage worked** and **mail** was the flaky part.

Rough time lost on the share bug: maybe **45–60 minutes** of clicking and re-reading before I believed the database was the real problem.

## 2) A decision I reversed mid-week, and what made me reverse it

At the start I almost let an **LLM pick the savings math** — same inputs, “smart” paragraph, looked cool in a demo. I tried a few prompts where I passed the tool list and spend into the model and asked it to output recommended spend and savings per line.

I reversed it fast. Same fake stack twice gave **slightly different numbers** once, and another time it wrote a confident sentence that did not match the math I could do by hand from `PRICING_DATA.md`. I did not want a founder to screenshot a number they cannot defend in a budget meeting.

So I locked **all dollar math** into `web/src/lib/audit/engine.ts` with plain rules and tests in `web/src/lib/audit/engine.test.ts`. The only AI left is the **short summary** from `/api/summary` (Gemini) with a hard fallback string if the API key is missing or the call fails. That split felt boring on paper but it was the right call for trust.

## 3) What I would build in week 2 if I had it

Week 2 I would not chase more “AI magic.” I would chase **proof and spread**.

I would print next to each line item: **which rule fired** (right-size vs credits vs alt stack) and **which URL in `PRICING_DATA.md`** backs the list price part, so a finance person can scan it without asking me in DMs.

I would add a **PDF** or at least a clean print stylesheet so someone can drop the audit into Slack without a screenshot crop war. Right now people share PNGs and the text is not selectable — that is fine for marketing, bad for a finance thread.

I would wire simple **events** (audit finished, share created, lead saved) so I am not guessing which step people quit on. Even a cheap log table or Plausible-style counts would beat my gut.

I would try one boring growth loop: email the user a link to their **public share URL** after capture so they reopen it instead of losing the tab.

If one thing slips, I would still ship the **rule labels + PDF** first because they make the product feel serious when a stranger lands from Twitter.

## 4) How I used AI tools (and where it lied to me)

I used **Cursor** as my editor day to day — tab complete, jump to file, small refactors, “explain this error” when Supabase spat a wall of text.

I used **ChatGPT** sometimes for plain-English drafts of README bullets or to sanity-check an idea before I typed it into code.

I used **Gemini** only inside the product for the **one** allowed LLM feature: the paragraph summary in `/api/summary/route.ts`. The math is not from Gemini.

What I did **not** let AI do: pick final prices, pick final savings, touch `SUPABASE_SERVICE_ROLE_KEY`, or decide security rules. I typed those parts myself and re-read them.

One time Cursor’s suggestion was straight wrong for my app: it pushed a pattern where **any** failure in the lead POST returned a **500** and a scary message to the user, even when **Supabase insert already worked** and only **email** failed. That would make people think “capture failed” when the lead was actually in the table. I kept the insert path and the email path separate in `leads/route.ts` so the story matches reality.

So AI = fast typing and drafts. Me = merge button, tests, and checking the unhappy paths.

## 5) Self-rating on a 1–10 scale for each, with one-sentence reason

**Discipline — 8.** I kept a devlog even on light days and tried not to fake huge hour counts when I only did cleanup.

**Code quality — 7.** TypeScript and small files help, but the home page is still one big client file and I would split it if I had another pass.

**Design sense — 7.** It reads clear on desktop; mobile spacing could be tighter in a few stacks.

**Problem-solving — 8.** I got unblocked when I stopped blaming React and started reading the real server and DB errors.

**Entrepreneurial thinking — 7.** I thought about who would share a link and what “honest low savings” should say, but I did not run real paid experiments yet.

If I had to pick one score to push up first it would be **code quality** by splitting `page.tsx` and adding a couple more tests around the API routes, not by adding more features.
