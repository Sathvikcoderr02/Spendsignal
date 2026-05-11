# Tests

All tests are in `web/src/lib/`.

## How to run

```bash
cd web
npm run test
```

## Automated tests written

1. `web/src/lib/audit/engine.test.ts`
   - **Test:** `calculates zero savings for zero spend`
   - **Covers:** no fake savings when spend is zero.

2. `web/src/lib/audit/engine.test.ts`
   - **Test:** `detects oversized team plan for small seat count`
   - **Covers:** right-size recommendation for small teams on costly plans.

3. `web/src/lib/audit/engine.test.ts`
   - **Test:** `prefers use-case alternative when cheaper`
   - **Covers:** alternative stack path selected when cheaper than current.

4. `web/src/lib/audit/engine.test.ts`
   - **Test:** `applies credits for api-direct usage when better`
   - **Covers:** credits scenario chosen for API direct tools when lowest cost.

5. `web/src/lib/audit/engine.test.ts`
   - **Test:** `sets high lead tier above $500 monthly savings`
   - **Covers:** lead tier and annual savings math.

6. `web/src/lib/server/publicAppUrl.test.ts`
   - **Test file coverage:** URL normalization for public app URL helper.
   - **Covers:** URL formatting behavior used by share link metadata paths.
