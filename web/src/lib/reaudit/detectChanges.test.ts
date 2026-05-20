import { describe, expect, it } from "vitest";
import { buildPricingSnapshot } from "@/lib/pricing/pricingSnapshot";
import { runAudit } from "@/lib/audit/engine";
import type { AuditInput } from "@/lib/audit/types";
import { diffAuditResults, diffPricingSnapshots } from "./detectChanges";

describe("diffPricingSnapshots", () => {
  it("flags when a plan price changes", () => {
    const previous = buildPricingSnapshot();
    const current = buildPricingSnapshot();
    const cursor = current.catalog.find((t) => t.id === "cursor");
    const pro = cursor?.plans.find((p) => p.id === "pro");
    if (pro) {
      pro.monthlyPerSeat = 25;
    }

    const { pricingChanges, engineRulesChanged } = diffPricingSnapshots(previous, current);
    expect(pricingChanges.some((c) => c.toolId === "cursor" && c.planId === "pro")).toBe(true);
    expect(engineRulesChanged).toBe(false);
  });
});

describe("diffAuditResults", () => {
  it("returns empty when results match", () => {
    const input: AuditInput = {
      teamSize: 5,
      primaryUseCase: "coding",
      tools: [{ toolId: "cursor", planId: "pro", monthlySpend: 40, seats: 2 }],
    };
    const result = runAudit(input);
    expect(diffAuditResults(result, result)).toHaveLength(0);
  });

  it("flags when recommended savings change", () => {
    const input: AuditInput = {
      teamSize: 5,
      primaryUseCase: "coding",
      tools: [{ toolId: "chatgpt", planId: "team", monthlySpend: 120, seats: 2 }],
    };
    const previous = runAudit(input);
    const current = {
      ...previous,
      items: previous.items.map((item) =>
        item.toolId === "chatgpt"
          ? { ...item, estimatedMonthlySavings: 0, recommendedAction: "Keep current setup" }
          : item,
      ),
      totalMonthlySavings: 0,
      totalAnnualSavings: 0,
      leadTier: "low" as const,
    };
    const changes = diffAuditResults(previous, current);
    expect(changes.length).toBeGreaterThan(0);
    expect(changes[0]?.toolId).toBe("chatgpt");
  });
});
