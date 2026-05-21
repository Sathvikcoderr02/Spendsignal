import { runAudit } from "@/lib/audit/engine";
import { AUDIT_ENGINE_RULES_VERSION } from "@/lib/audit/engineRules";
import type { AuditResult, ToolAuditResult } from "@/lib/audit/types";
import { buildPricingSnapshot, type PricingSnapshot } from "@/lib/pricing/pricingSnapshot";
import type { StoredPublicAuditRow } from "@/lib/audit/storedAudit";

export type PricingPlanChange = {
  toolId: string;
  planId: string;
  label: string;
  field: "monthlyPerSeat";
  previousValue: number | null;
  currentValue: number | null;
};

export type ToolRecommendationChange = {
  toolId: string;
  toolName: string;
  previousAction: string;
  currentAction: string;
  previousMonthlySavings: number;
  currentMonthlySavings: number;
  previousRecommendedSpend: number;
  currentRecommendedSpend: number;
};

export type AuditChangePayload = {
  detectedAt: string;
  pricingChanges: PricingPlanChange[];
  engineRulesChanged: boolean;
  previousEngineVersion: string;
  currentEngineVersion: string;
  resultSummary: {
    previousMonthlySavings: number;
    currentMonthlySavings: number;
    monthlySavingsDelta: number;
    previousAnnualSavings: number;
    currentAnnualSavings: number;
    previousLeadTier: string;
    currentLeadTier: string;
  };
  toolChanges: ToolRecommendationChange[];
};

export type DetectChangesResult = {
  shareId: string;
  email: string;
  changed: boolean;
  changePayload: AuditChangePayload | null;
};

function planKey(toolId: string, planId: string): string {
  return `${toolId}:${planId}`;
}

export function diffPricingSnapshots(
  previous: PricingSnapshot,
  current: PricingSnapshot,
): { pricingChanges: PricingPlanChange[]; engineRulesChanged: boolean } {
  const pricingChanges: PricingPlanChange[] = [];

  const previousPlans = new Map<string, { label: string; monthlyPerSeat: number | null }>();
  for (const tool of previous.catalog) {
    for (const plan of tool.plans) {
      previousPlans.set(planKey(tool.id, plan.id), {
        label: plan.label,
        monthlyPerSeat: plan.monthlyPerSeat,
      });
    }
  }

  for (const tool of current.catalog) {
    for (const plan of tool.plans) {
      const key = planKey(tool.id, plan.id);
      const before = previousPlans.get(key);
      if (!before) {
        pricingChanges.push({
          toolId: tool.id,
          planId: plan.id,
          label: plan.label,
          field: "monthlyPerSeat",
          previousValue: null,
          currentValue: plan.monthlyPerSeat,
        });
        continue;
      }
      if (before.monthlyPerSeat !== plan.monthlyPerSeat) {
        pricingChanges.push({
          toolId: tool.id,
          planId: plan.id,
          label: plan.label,
          field: "monthlyPerSeat",
          previousValue: before.monthlyPerSeat,
          currentValue: plan.monthlyPerSeat,
        });
      }
      previousPlans.delete(key);
    }
  }

  for (const [key, before] of previousPlans) {
    const [toolId, planId] = key.split(":");
    pricingChanges.push({
      toolId,
      planId,
      label: before.label,
      field: "monthlyPerSeat",
      previousValue: before.monthlyPerSeat,
      currentValue: null,
    });
  }

  const engineRulesChanged =
    previous.engineRulesVersion !== current.engineRulesVersion ||
    JSON.stringify(previous.engineRules) !== JSON.stringify(current.engineRules);

  return { pricingChanges, engineRulesChanged };
}

function findToolItem(items: ToolAuditResult[], toolId: string): ToolAuditResult | undefined {
  return items.find((item) => item.toolId === toolId);
}

export function diffAuditResults(previous: AuditResult, current: AuditResult): ToolRecommendationChange[] {
  const toolIds = new Set([
    ...previous.items.map((item) => item.toolId),
    ...current.items.map((item) => item.toolId),
  ]);
  const toolChanges: ToolRecommendationChange[] = [];

  for (const toolId of toolIds) {
    const oldItem = findToolItem(previous.items, toolId);
    const newItem = findToolItem(current.items, toolId);
    if (!oldItem || !newItem) {
      continue;
    }

    const actionChanged = oldItem.recommendedAction !== newItem.recommendedAction;
    const savingsChanged = oldItem.estimatedMonthlySavings !== newItem.estimatedMonthlySavings;
    const spendChanged = oldItem.recommendedMonthlySpend !== newItem.recommendedMonthlySpend;

    if (actionChanged || savingsChanged || spendChanged) {
      toolChanges.push({
        toolId,
        toolName: newItem.toolName,
        previousAction: oldItem.recommendedAction,
        currentAction: newItem.recommendedAction,
        previousMonthlySavings: oldItem.estimatedMonthlySavings,
        currentMonthlySavings: newItem.estimatedMonthlySavings,
        previousRecommendedSpend: oldItem.recommendedMonthlySpend,
        currentRecommendedSpend: newItem.recommendedMonthlySpend,
      });
    }
  }

  return toolChanges;
}

export function detectChangesForStoredAudit(row: StoredPublicAuditRow): DetectChangesResult | null {
  if (!row.email || !row.input_stack || !row.pricing_snapshot) {
    return null;
  }

  const currentSnapshot = buildPricingSnapshot();
  const { pricingChanges, engineRulesChanged } = diffPricingSnapshots(
    row.pricing_snapshot,
    currentSnapshot,
  );

  const previousResult = row.audit_payload;
  const currentResult = runAudit(row.input_stack);
  const toolChanges = diffAuditResults(previousResult, currentResult);

  const totalsChanged =
    previousResult.totalMonthlySavings !== currentResult.totalMonthlySavings ||
    previousResult.totalAnnualSavings !== currentResult.totalAnnualSavings ||
    previousResult.leadTier !== currentResult.leadTier;

  const changed =
    pricingChanges.length > 0 || engineRulesChanged || toolChanges.length > 0 || totalsChanged;

  if (!changed) {
    return {
      shareId: row.share_id,
      email: row.email,
      changed: false,
      changePayload: null,
    };
  }

  const changePayload: AuditChangePayload = {
    detectedAt: new Date().toISOString(),
    pricingChanges,
    engineRulesChanged,
    previousEngineVersion: row.pricing_version ?? row.pricing_snapshot.engineRulesVersion,
    currentEngineVersion: AUDIT_ENGINE_RULES_VERSION,
    resultSummary: {
      previousMonthlySavings: previousResult.totalMonthlySavings,
      currentMonthlySavings: currentResult.totalMonthlySavings,
      monthlySavingsDelta: currentResult.totalMonthlySavings - previousResult.totalMonthlySavings,
      previousAnnualSavings: previousResult.totalAnnualSavings,
      currentAnnualSavings: currentResult.totalAnnualSavings,
      previousLeadTier: previousResult.leadTier,
      currentLeadTier: currentResult.leadTier,
    },
    toolChanges,
  };

  return {
    shareId: row.share_id,
    email: row.email,
    changed: true,
    changePayload,
  };
}
