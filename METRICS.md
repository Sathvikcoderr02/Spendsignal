# Metrics

## North Star metric

**North Star:** `Qualified high-intent leads per week`

Why this metric:

- This is a B2B lead-gen product, not a daily habit app.
- A visit has no business value if no useful audit is completed.
- An audit has higher value when user intent is strong (high savings or clear follow-up intent).

For this tool, I define a qualified high-intent lead as:

1. user completes an audit, and
2. either total savings is `>$500/mo` or user submits email + opens share/report link.

This metric is better than DAU because many users run audits once in a while, not daily.

## 3 input metrics that drive the North Star

1. **Audit completion rate**
   - completed audits / landing visitors
   - tells if form UX and value proposition are clear.

2. **Lead capture rate after results**
   - lead submissions / completed audits
   - tells if results are trusted and CTA copy works.

3. **Share link creation rate**
   - share links created / completed audits
   - shows viral potential and internal team sharing behavior.

## What I would instrument first

First tracking events:

- `landing_view`
- `audit_input_changed`
- `audit_completed`
- `summary_generated`
- `share_link_created`
- `lead_submitted`
- `consult_cta_clicked`

For each event, I would store:

- timestamp
- anonymized session id
- team size bucket
- primary use case
- savings tier bucket (`<100`, `100-500`, `>500`)

This gives enough signal to improve conversion without collecting extra personal data.

## What number triggers a pivot

I would pivot if this condition holds for 3 straight weeks:

- audit completion rate is below 20%, **or**
- lead capture rate is below 8% after results, **or**
- high-savings lead count is below 5 per 1,000 visitors.

A pivot could mean changing target persona, reducing form fields, or focusing the product on one use case (for example only coding teams first). If these numbers are above threshold and improving, I would stay the course and optimize the funnel.
