# Reflection

## 1) Hardest bug this week and how I debugged it

The hardest bug was around share link creation. The UI said link creation failed, but the request body looked correct and the route was running. I first thought it was a frontend state bug, so I checked the request payload and response handling. That was fine. Then I tested the API route directly and printed error messages from Supabase. The error message showed a relation issue for `public_audits`. At first, I thought it was a typo in table name, but code and SQL were matching. Next I checked the Supabase project and realized the schema file had not actually been run there. After running `web/supabase/schema.sql`, the API call started working and returned a valid `shareId`.

I also hit a second issue: email API returned success but no email reached inbox. I checked provider logs and saw sender domain limitations. That helped me change error messaging so the UI still confirms lead storage separately from email status. The main lesson was simple: in full-stack work, many “code bugs” are really config or infra state bugs. Better error text made debugging much faster.

## 2) A decision I reversed mid-week

I reversed my first idea of using AI for the full audit recommendation logic. In my first pass, I considered passing tool data to an LLM and letting it decide the best plan and savings reasoning. I stopped that path after testing because outputs were not stable enough. The model could produce useful text, but savings math was not always exact and sometimes reason quality changed for the same input.

I switched to deterministic rule-based logic for all pricing and savings decisions. This made results reproducible, easier to test, and easier to defend to a finance person. Then I used AI only where it adds value safely: writing a personalized summary paragraph. I kept a strong fallback summary template if the LLM fails.

This reversal improved trust in the product. Users should never wonder if a savings number changed due to model randomness. By separating “math engine” from “text explanation,” I got better reliability and still kept the product personalized.

## 3) What I would build in week 2

If I had one more week, I would focus on three areas: stronger trust, stronger growth loops, and better data learning.

First, trust: I would add deeper audit transparency. For every recommendation, I would show source plan price, assumed usage-fit rule, and a “why this is safe” note. I would also add plan-specific warnings when switching might reduce capability. This would make it easier for finance and engineering managers to approve changes.

Second, growth: I would build PDF export and an embed widget. Many founders like sharing reports in investor updates or team Slack channels. A clean export gives more share moments. An embed script on blogs or newsletters could bring organic traffic.

Third, learning: I would build analytics around conversion funnel steps (audit complete, summary generated, share created, lead captured, consult booked). Then I would run two copy experiments on CTA text for high-savings users. I would also add benchmark mode (“spend per developer vs similar team size”) to make the insight more sticky and more discussable.

## 4) How I used AI tools

I used AI tools as a coding assistant, not as an autopilot. Main use cases were: writing first drafts for UI copy, generating TypeScript scaffold patterns, checking API route edge cases, and improving wording in docs. I also used AI to quickly compare alternative code structures when I got stuck on route organization.

I did not trust AI for final pricing numbers, final business assumptions, or final rule logic decisions. Those were always manually verified. I also did not trust AI for security-sensitive config. I checked environment variable handling and backend behavior directly.

One specific case where AI was wrong: it suggested a fallback flow that treated all API failures as 500 hard errors in lead capture. That would have blocked useful conversions if only email failed. I changed it so lead storage success and email status are separated. Now users still get success when lead capture works, with a clear message if email delivery has an issue.

Overall, AI helped speed, but manual judgment and testing decided final code.

## 5) Self-rating (1-10) with reason

- **Discipline: 8/10** — I worked in daily chunks, tracked progress in devlog, and kept moving even when infra issues slowed me down.
- **Code quality: 7/10** — code is readable and typed, with clear route separation; I still want stronger test coverage beyond engine helpers.
- **Design sense: 7/10** — result page is clean and share-ready, but I can improve visual hierarchy and mobile spacing further.
- **Problem-solving: 8/10** — I debugged across frontend, API, and infra and fixed blockers with better logging and fallback behavior.
- **Entrepreneurial thinking: 7/10** — I focused on honest savings and lead flow, but I want deeper benchmark and distribution experiments in week 2.
