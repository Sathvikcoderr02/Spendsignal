import {
  CREDITS_DISCOUNT_MULTIPLIER,
  RIGHTSIZE_PER_SEAT_TARGETS,
  USE_CASE_ALT_BENCHMARK,
} from "./engineRules";
import { TOOL_LABELS_BY_ID } from "./pricingCatalog";
import type { AuditInput, AuditResult, ToolInput } from "./types";

const formatCurrency = (value: number): string => `$${value.toFixed(0)}`;

type Scenario = {
  action: string;
  spend: number;
  reason: string;
  rationale: string;
};

const canRightSize = (tool: ToolInput): boolean => {
  if (tool.seats <= 0) {
    return false;
  }
  const key = `${tool.toolId}:${tool.planId}`;
  if (!RIGHTSIZE_PER_SEAT_TARGETS[key]) {
    return false;
  }
  return tool.seats <= 3;
};

const isApiStylePlan = (planId: string): boolean => planId === "api-direct" || planId === "api";

export function runAudit(input: AuditInput): AuditResult {
  const items = input.tools.map((tool) => {
    const toolName = TOOL_LABELS_BY_ID[tool.toolId];
    const baselineScenario: Scenario = {
      action: "Keep current setup",
      spend: tool.monthlySpend,
      reason: "Current spend appears aligned with your usage constraints.",
      rationale: `Baseline = reported spend ${formatCurrency(tool.monthlySpend)}/mo.`,
    };

    const scenarios: Scenario[] = [baselineScenario];

    if (canRightSize(tool)) {
      const key = `${tool.toolId}:${tool.planId}`;
      const perSeatTarget = RIGHTSIZE_PER_SEAT_TARGETS[key];
      const candidateSpend = perSeatTarget * tool.seats;
      scenarios.push({
        action: "Downgrade to right-sized plan",
        spend: candidateSpend,
        reason: `Current ${tool.planId} plan is typically oversized for ${tool.seats} seats.`,
        rationale: `${tool.seats} seats x ${formatCurrency(perSeatTarget)}/seat = ${formatCurrency(candidateSpend)}/mo.`,
      });
    }

    if (tool.seats > 0 && !isApiStylePlan(tool.planId)) {
      const benchmark = USE_CASE_ALT_BENCHMARK[input.primaryUseCase];
      const altSpend = benchmark.targetPerSeat * tool.seats;
      scenarios.push({
        action: `Switch to ${benchmark.label}`,
        spend: altSpend,
        reason: "A use-case-matched alternative can usually preserve capability at lower cost.",
        rationale: `${tool.seats} seats x ${formatCurrency(benchmark.targetPerSeat)}/seat benchmark = ${formatCurrency(altSpend)}/mo.`,
      });
    }

    if (tool.monthlySpend > 0) {
      const creditsSpend = tool.monthlySpend * CREDITS_DISCOUNT_MULTIPLIER;
      scenarios.push({
        action: "Buy equivalent usage via infrastructure credits",
        spend: creditsSpend,
        reason: "When usage is stable, discounted credits often reduce effective price by ~20%.",
        rationale: `${formatCurrency(tool.monthlySpend)} x 0.80 = ${formatCurrency(creditsSpend)}/mo.`,
      });
    }

    const bestScenario = scenarios.reduce((best, candidate) =>
      candidate.spend < best.spend ? candidate : best,
    );

    const recommendedSpend = bestScenario.spend;
    const estimatedMonthlySavings = Math.max(0, Math.round(tool.monthlySpend - recommendedSpend));
    return {
      toolId: tool.toolId,
      toolName,
      currentMonthlySpend: tool.monthlySpend,
      recommendedMonthlySpend: Math.round(recommendedSpend),
      recommendedAction:
        estimatedMonthlySavings > 0
          ? `${bestScenario.action} (est. new spend ${formatCurrency(recommendedSpend)}/mo)`
          : "Keep current setup",
      estimatedMonthlySavings,
      reason:
        estimatedMonthlySavings > 0
          ? `${bestScenario.reason} Estimated savings: ${formatCurrency(estimatedMonthlySavings)}/month.`
          : "No credible savings found without reducing capability.",
      rationale: bestScenario.rationale,
    };
  });

  const totalMonthlySavings = items.reduce((acc, item) => acc + item.estimatedMonthlySavings, 0);
  const totalAnnualSavings = totalMonthlySavings * 12;
  const leadTier = totalMonthlySavings > 500 ? "high" : totalMonthlySavings >= 100 ? "medium" : "low";

  return {
    totalMonthlySavings,
    totalAnnualSavings,
    leadTier,
    items,
  };
}
