import { TOOL_LABELS_BY_ID } from "./pricingCatalog";
import type { AuditInput, AuditResult, ToolInput, UseCase } from "./types";

const USE_CASE_ALT_BENCHMARK: Record<UseCase, { label: string; targetPerSeat: number }> = {
  coding: { label: "Cursor Pro or GitHub Copilot Individual", targetPerSeat: 20 },
  writing: { label: "Claude Pro", targetPerSeat: 20 },
  data: { label: "ChatGPT Team or Gemini Pro mix", targetPerSeat: 30 },
  research: { label: "Claude Pro + ChatGPT Plus blend", targetPerSeat: 20 },
  mixed: { label: "Mixed-seat stack with monthly caps", targetPerSeat: 25 },
};

const formatCurrency = (value: number): string => `$${value.toFixed(0)}`;

const estimateRightSizedSpend = (tool: ToolInput): number | null => {
  if (tool.seats <= 0) {
    return 0;
  }

  if (tool.planId === "team" && tool.seats <= 2) {
    return 20 * tool.seats;
  }

  if (tool.planId === "business" && tool.seats <= 3) {
    return 20 * tool.seats;
  }

  if (tool.planId === "enterprise" && tool.seats <= 10) {
    return 30 * tool.seats;
  }

  if (tool.planId === "max" && tool.seats <= 2) {
    return 20 * tool.seats;
  }

  if (tool.planId === "ultra" && tool.seats <= 3) {
    return 20 * tool.seats;
  }

  return null;
};

const estimateUseCaseAlternativeSpend = (tool: ToolInput, useCase: UseCase): number | null => {
  if (tool.seats <= 0) {
    return 0;
  }

  const benchmark = USE_CASE_ALT_BENCHMARK[useCase];
  const altSpend = benchmark.targetPerSeat * tool.seats;

  if (tool.monthlySpend > altSpend) {
    return altSpend;
  }

  return null;
};

export function runAudit(input: AuditInput): AuditResult {
  const items = input.tools.map((tool) => {
    const toolName = TOOL_LABELS_BY_ID[tool.toolId];
    const rightSizedSpend = estimateRightSizedSpend(tool);
    const altSpend = estimateUseCaseAlternativeSpend(tool, input.primaryUseCase);

    let recommendedSpend = tool.monthlySpend;
    let recommendedAction = "No change";
    let reason = "Current spend appears aligned with your team size and use case.";

    if (rightSizedSpend !== null && rightSizedSpend < recommendedSpend) {
      recommendedSpend = rightSizedSpend;
      recommendedAction = "Downgrade to a lower plan tier";
      reason = `Current ${tool.planId} plan looks oversized for ${tool.seats} seats.`;
    }

    if (altSpend !== null && altSpend < recommendedSpend) {
      recommendedSpend = altSpend;
      recommendedAction = `Switch to ${USE_CASE_ALT_BENCHMARK[input.primaryUseCase].label}`;
      reason = `A use-case-matched stack can deliver similar output at lower monthly cost.`;
    }

    const creditsDiscountedSpend = tool.monthlySpend * 0.8;
    if (creditsDiscountedSpend < recommendedSpend) {
      recommendedSpend = creditsDiscountedSpend;
      recommendedAction = "Buy equivalent usage via infrastructure credits";
      reason = "If usage is fixed, credits can reduce retail pricing by roughly 20%.";
    }

    const estimatedMonthlySavings = Math.max(0, Math.round(tool.monthlySpend - recommendedSpend));
    return {
      toolId: tool.toolId,
      toolName,
      currentMonthlySpend: tool.monthlySpend,
      recommendedAction:
        estimatedMonthlySavings > 0
          ? `${recommendedAction} (est. new spend ${formatCurrency(recommendedSpend)}/mo)`
          : "Keep current setup",
      estimatedMonthlySavings,
      reason:
        estimatedMonthlySavings > 0
          ? `${reason} Estimated savings: ${formatCurrency(estimatedMonthlySavings)}/month.`
          : "No credible savings found without reducing capability.",
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
