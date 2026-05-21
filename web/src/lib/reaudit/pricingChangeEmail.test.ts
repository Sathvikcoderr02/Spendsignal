import { describe, expect, it } from "vitest";
import type { AuditChangePayload } from "./detectChanges";
import {
  buildConsolidatedPricingChangeEmail,
  groupAffectedAuditsByEmail,
} from "./pricingChangeEmail";

function samplePayload(overrides?: Partial<AuditChangePayload>): AuditChangePayload {
  return {
    detectedAt: "2026-05-21T08:00:00.000Z",
    pricingChanges: [
      {
        toolId: "cursor",
        planId: "pro",
        label: "Cursor Pro",
        field: "monthlyPerSeat",
        previousValue: 20,
        currentValue: 25,
      },
    ],
    engineRulesChanged: false,
    previousEngineVersion: "v1",
    currentEngineVersion: "v2",
    resultSummary: {
      previousMonthlySavings: 100,
      currentMonthlySavings: 120,
      monthlySavingsDelta: 20,
      previousAnnualSavings: 1200,
      currentAnnualSavings: 1440,
      previousLeadTier: "medium",
      currentLeadTier: "high",
    },
    toolChanges: [
      {
        toolId: "cursor",
        toolName: "Cursor",
        previousAction: "Keep",
        currentAction: "Downgrade",
        previousMonthlySavings: 50,
        currentMonthlySavings: 70,
        previousRecommendedSpend: 40,
        currentRecommendedSpend: 30,
      },
    ],
    ...overrides,
  };
}

describe("groupAffectedAuditsByEmail", () => {
  it("groups multiple audits for the same email", () => {
    const grouped = groupAffectedAuditsByEmail([
      { shareId: "a", email: "User@Example.com", changePayload: samplePayload() },
      { shareId: "b", email: "user@example.com", changePayload: samplePayload() },
      { shareId: "c", email: "other@test.com", changePayload: samplePayload() },
    ]);

    expect(grouped.size).toBe(2);
    expect(grouped.get("user@example.com")).toHaveLength(2);
    expect(grouped.get("other@test.com")).toHaveLength(1);
  });
});

describe("buildConsolidatedPricingChangeEmail", () => {
  it("builds single-audit subject and includes savings delta", () => {
    const { subject, html } = buildConsolidatedPricingChangeEmail({
      audits: [
        {
          shareId: "11111111-1111-1111-1111-111111111111",
          email: "user@example.com",
          changePayload: samplePayload(),
        },
      ],
      appUrl: "https://preview.example.com",
    });

    expect(subject).toContain("your audit");
    expect(html).toContain("+$20/mo");
    expect(html).toContain("Cursor Pro");
    expect(html).toContain("https://preview.example.com/audit/11111111-1111-1111-1111-111111111111");
    expect(html).toContain("one email for all affected");
  });

  it("builds plural subject for multiple audits", () => {
    const { subject } = buildConsolidatedPricingChangeEmail({
      audits: [
        { shareId: "a", email: "u@x.com", changePayload: samplePayload() },
        { shareId: "b", email: "u@x.com", changePayload: samplePayload() },
      ],
      appUrl: "https://preview.example.com",
    });

    expect(subject).toContain("2 audits");
  });
});
