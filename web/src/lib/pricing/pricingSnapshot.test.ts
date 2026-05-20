import { describe, expect, it } from "vitest";
import { AUDIT_ENGINE_RULES_VERSION } from "../audit/engineRules";
import { buildPricingSnapshot } from "./pricingSnapshot";

describe("buildPricingSnapshot", () => {
  it("includes catalog and engine rules with version", () => {
    const snapshot = buildPricingSnapshot();
    expect(snapshot.engineRulesVersion).toBe(AUDIT_ENGINE_RULES_VERSION);
    expect(snapshot.catalog.length).toBeGreaterThan(0);
    expect(snapshot.engineRules.creditsDiscountMultiplier).toBe(0.8);
    expect(snapshot.engineRules.rightsizePerSeatTargets["chatgpt:team"]).toBe(20);
    expect(snapshot.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
