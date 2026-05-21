# Round 2 reflection

## 1. What uncomfortable trade-off did you make because of the time pressure?

I shipped **manual** price checks instead of a scheduled job. Reviewers (and I) have to run `/admin/reaudit` or the API after changing prices. That felt weak for a “live” system, but cron setup and Supabase pausing ate time I did not have. I also shipped a compare page that **re-runs the math** instead of storing a second saved result in the database — less work, slightly harder to explain. I was okay being less flashy if the numbers stayed trustworthy.

## 2. If the deadline were extended by 24 hours, what is the FIRST thing you would do?

I would stop duplicate emails: if nothing new changed, do not send again. Then I would add one scheduled job (GitHub Action or Vercel Cron) to call `/api/detect-changes` after deploy. The feature works for a demo today, but in real life someone will forget to press the button after a price update.

## 3. Looking back at Round 1, what did Round-1-you make harder for Round-2-you?

I kept SQL in the repo but did not always run it in Supabase right away. Round 2 looked broken until I pasted migrations — same pain as Round 1’s missing table. I also did not plan for “save prices at audit time,” so Round 2 meant adding columns and snapshot logic on top of old code instead of designing for it from day one. On the plus side, Round 1 already split “save lead” from “send email,” which made Round 2 emails easier to add without lying to the user when Postmark fails.

## AI use (brief)

Cursor helped me type faster; I checked edge cases myself (empty database rows, paused Supabase, build errors). All dollar amounts still come from the rule engine, not an LLM.
