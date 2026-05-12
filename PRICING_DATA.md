## Cursor
- Hobby: $0/user/month — https://cursor.com/pricing — verified 2026-05-06
- Pro: $20/user/month — https://cursor.com/pricing — verified 2026-05-06
- Business: $40/user/month — https://cursor.com/pricing — verified 2026-05-06
- Enterprise: Custom pricing — https://cursor.com/pricing — verified 2026-05-06

## GitHub Copilot
- Individual: $10/user/month — https://github.com/features/copilot/plans — verified 2026-05-06
- Business: $19/user/month — https://github.com/features/copilot/plans — verified 2026-05-06
- Enterprise: $39/user/month — https://github.com/features/copilot/plans — verified 2026-05-06

## Claude
- Free: $0/user/month — https://www.anthropic.com/pricing — verified 2026-05-06
- Pro: $20/user/month — https://www.anthropic.com/pricing — verified 2026-05-06
- Max: $100/user/month (entry tier) — https://www.anthropic.com/pricing — verified 2026-05-06
- Team: $30/user/month — https://www.anthropic.com/pricing — verified 2026-05-06
- Enterprise: Custom pricing — https://www.anthropic.com/pricing — verified 2026-05-06
- API direct: Usage-based — https://www.anthropic.com/pricing#api — verified 2026-05-06

## ChatGPT
- Plus: $20/user/month — https://openai.com/chatgpt/pricing/ — verified 2026-05-06
- Team: $30/user/month (monthly billing) — https://openai.com/chatgpt/pricing/ — verified 2026-05-06
- Enterprise: Custom pricing — https://openai.com/chatgpt/pricing/ — verified 2026-05-06
- API direct: Usage-based — https://openai.com/api/pricing/ — verified 2026-05-06

## Anthropic API direct
- Claude API models: Usage-based token pricing — https://www.anthropic.com/pricing#api — verified 2026-05-06

## OpenAI API direct
- GPT API models: Usage-based token pricing — https://openai.com/api/pricing/ — verified 2026-05-06

## Gemini
- Pro: $19.99/user/month (Google AI Pro) — https://one.google.com/about/ai-premium/ — verified 2026-05-06
- Ultra: $249.99/user/month (Google AI Ultra) — https://one.google.com/about/ai-premium/ — verified 2026-05-06
- API: Usage-based token pricing — https://ai.google.dev/gemini-api/docs/pricing — verified 2026-05-06

## Windsurf
- Free: $0/user/month — https://windsurf.com/pricing — verified 2026-05-06
- Pro: $15/user/month — https://windsurf.com/pricing — verified 2026-05-06
- Teams: $30/user/month — https://windsurf.com/pricing — verified 2026-05-06

## Notes and normalization assumptions
- For the audit engine MVP, annual plans are normalized to monthly equivalents.
- Team/Enterprise plans that vary by contract are treated as "custom" and audited only via user-entered spend.
- API tools are audited using user-entered monthly spend (usage-based), not seat multipliers.
- Use-case alternative benchmarks in the engine are conservative target envelopes, not vendor claims.

## Audit engine numbers that are NOT copied from a single vendor line item

These live in `web/src/lib/audit/engine.ts`. They are **MVP rules**, not a price scrape. List prices above still anchor what a “seat” product costs; the rows below explain extra math the engine uses.

### Right-size per-seat targets (`RIGHTSIZE_PER_SEAT_TARGETS`)

When seat count is small (≤3) and the plan key matches, the engine compares the user’s reported spend to a **target $/seat/month** that is set at or below common **entry paid tiers** from the vendor sections above (for example ChatGPT Plus ~$20, Copilot Individual ~$10). It is a **“could you be on a smaller paid tier?”** check, not a guarantee that vendor will sell you that mix.

| Engine key | Target $/seat/mo | Tied to list-price idea (same doc) |
|------------|------------------|-------------------------------------|
| `chatgpt:team` | 20 | ChatGPT Plus list — https://openai.com/chatgpt/pricing/ |
| `claude:team` / `claude:max` | 20 | Claude Pro list — https://www.anthropic.com/pricing |
| `cursor:business` | 20 | Cursor Pro list — https://cursor.com/pricing |
| `github-copilot:business` | 10 | Copilot Individual list — https://github.com/features/copilot/plans |
| `gemini:ultra` | 20 | Google AI Pro tier order-of-magnitude vs Ultra — https://one.google.com/about/ai-premium/ |
| `windsurf:teams` | 15 | Windsurf Pro list — https://windsurf.com/pricing |

### Use-case alternative benchmark (`USE_CASE_ALT_BENCHMARK`)

Per use case the engine picks a **label** plus a **target $/seat** (20–30). Those targets are rounded to sit near the **Pro-class** list prices in this file (Cursor Pro, Claude Pro, ChatGPT Team monthly, etc.). It is a **rough stack envelope** for “similar job, lower seat cost,” not a promise you can swap vendors in one click.

### Credits scenario (20% off retail)

If the user’s reported monthly spend is > 0, the engine adds a scenario at **80% of that spend** (`× 0.80`). That is a **Credex product story** (“discounted infrastructure credits”), **not** a number from a public price page. It is labeled in the UI copy as an estimate so finance readers know it is assumption-based.
