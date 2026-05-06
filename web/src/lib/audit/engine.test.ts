import { describe, expect, it } from "vitest";
import { runAudit } from "./engine";
import type { AuditInput, ToolInput } from "./types";

const makeInput = (tools: ToolInput[], primaryUseCase: AuditInput["primaryUseCase"] = "coding"): AuditInput => ({
  teamSize: 6,
  primaryUseCase,
  tools,
});

describe("runAudit", () => {
  it("calculates zero savings for zero spend", () => {
    const result = runAudit(
      makeInput([{ toolId: "cursor", planId: "pro", monthlySpend: 0, seats: 2 }]),
    );

    expect(result.totalMonthlySavings).toBe(0);
    expect(result.items[0]?.recommendedAction).toContain("Keep current setup");
  });

  it("detects oversized team plan for small seat count", () => {
    const result = runAudit(
      makeInput([{ toolId: "chatgpt", planId: "team", monthlySpend: 120, seats: 2 }]),
    );

    expect(result.totalMonthlySavings).toBeGreaterThan(0);
    expect(result.items[0]?.recommendedAction).toContain("Downgrade");
  });

  it("prefers use-case alternative when cheaper", () => {
    const result = runAudit(
      makeInput([{ toolId: "gemini", planId: "ultra", monthlySpend: 600, seats: 2 }], "writing"),
    );

    expect(result.totalMonthlySavings).toBeGreaterThan(200);
    expect(result.items[0]?.reason).toContain("Estimated savings");
  });

  it("applies the cheapest recommendation path", () => {
    const result = runAudit(
      makeInput([{ toolId: "openai-api", planId: "api-direct", monthlySpend: 1000, seats: 10 }], "data"),
    );

    expect(result.items[0]?.recommendedAction).toContain("Switch to");
    expect(result.totalMonthlySavings).toBe(700);
  });

  it("sets high lead tier above $500 monthly savings", () => {
    const result = runAudit(
      makeInput([
        { toolId: "openai-api", planId: "api-direct", monthlySpend: 2000, seats: 20 },
        { toolId: "anthropic-api", planId: "api-direct", monthlySpend: 1200, seats: 10 },
      ]),
    );

    expect(result.leadTier).toBe("high");
    expect(result.totalAnnualSavings).toBe(result.totalMonthlySavings * 12);
  });
});
