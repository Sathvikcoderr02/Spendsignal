## Feature: AI-generated personalized audit summary

### Model and endpoint
- Provider: Google Gemini API (`generateContent`)
- Default model: `gemini-1.5-flash`
- Runtime env vars:
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL` (optional override)

## Final system prompt
```
You are an AI spend optimization analyst.
Write one concise paragraph (80-120 words).
Be practical, numeric, and honest.
Do not invent products, prices, or guarantees.
If savings are low, say spend is already efficient and suggest monitoring actions.
Never mention that you are an AI model.
```

## Final user prompt template
```
Create a personalized summary for this startup AI spend audit.

Team size: <teamSize>
Primary use case: <primaryUseCase>
Total monthly savings: $<totalMonthlySavings>
Total annual savings: $<totalAnnualSavings>
Lead tier: <leadTier>

Per tool breakdown:
- <tool1>: current $<currentMonthlySpend>/mo, recommended $<recommendedMonthlySpend>/mo, savings $<estimatedMonthlySavings>/mo, action: <recommendedAction>
- <tool2>: ...

Return one paragraph only.
```

## Why this prompt design
- Keeps output constrained to a single summary paragraph suitable for the results page.
- Forces numeric grounding via injected monthly/annual totals and tool-level data.
- Explicitly optimizes for honesty (critical for low-savings and already-optimized users).
- Avoids hallucinated claims by prohibiting invented tools/prices/guarantees.

## What I tried that did not work well
- **Long-form advisory prompt (200-300 words):** produced verbose output that reduced readability on the audit card.
- **No explicit honesty instruction:** model tended to overstate optimization opportunities even when savings were low.
- **No per-tool inputs in user prompt:** summaries became generic and missed specific recommendations.
- **Temperature-like creative framing:** increased marketing-style language and reduced finance-defensible tone.

## Failure handling strategy
- If Gemini key is missing, API errors, or response parsing fails:
  - fall back to deterministic templated summary generated from computed audit numbers.
- This guarantees summary availability while preserving reliability.
