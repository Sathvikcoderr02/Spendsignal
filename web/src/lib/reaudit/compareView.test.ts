import { describe, expect, it } from "vitest";
import { runAudit } from "@/lib/audit/engine";
import type { AuditInput } from "@/lib/audit/types";
import { buildCompareRows, compareSummary } from "./compareView";

describe("compareView", () => {
  it("puts changed tools before unchanged", () => {
    const input: AuditInput = {
      teamSize: 5,
      primaryUseCase: "coding",
      tools: [
        { toolId: "cursor", planId: "pro", monthlySpend: 40, seats: 2 },
        { toolId: "chatgpt", planId: "team", monthlySpend: 120, seats: 2 },
      ],
    };
    const original = runAudit(input);
    const current = {
      ...original,
      items: original.items.map((item) =>
        item.toolId === "chatgpt"
          ? { ...item, estimatedMonthlySavings: 0, recommendedAction: "Keep" }
          : item,
      ),
      totalMonthlySavings: original.totalMonthlySavings - (original.items.find((i) => i.toolId === "chatgpt")?.estimatedMonthlySavings ?? 0),
    };
    current.totalAnnualSavings = current.totalMonthlySavings * 12;

    const rows = buildCompareRows(original, current);
    const firstChangedIndex = rows.findIndex((r) => r.changed);
    const firstUnchangedIndex = rows.findIndex((r) => !r.changed);
    expect(firstChangedIndex).toBeGreaterThanOrEqual(0);
    expect(firstUnchangedIndex).toBeGreaterThan(firstChangedIndex);
  });

  it("computes savings delta", () => {
    const input: AuditInput = {
      teamSize: 3,
      primaryUseCase: "writing",
      tools: [{ toolId: "claude", planId: "team", monthlySpend: 80, seats: 2 }],
    };
    const original = runAudit(input);
    const current = { ...original, totalMonthlySavings: original.totalMonthlySavings + 10 };
    current.totalAnnualSavings = current.totalMonthlySavings * 12;
    const summary = compareSummary(original, current);
    expect(summary.monthlyDelta).toBe(10);
  });
});
