import type { AuditResult, ToolAuditResult } from "@/lib/audit/types";
import { diffAuditResults } from "./detectChanges";

export type CompareToolRow = {
  toolId: string;
  toolName: string;
  changed: boolean;
  original: ToolAuditResult | null;
  current: ToolAuditResult | null;
};

export function buildCompareRows(original: AuditResult, current: AuditResult): CompareToolRow[] {
  const changes = diffAuditResults(original, current);
  const changedIds = new Set(changes.map((c) => c.toolId));

  const toolIds = new Set([
    ...original.items.map((i) => i.toolId),
    ...current.items.map((i) => i.toolId),
  ]);

  const rows: CompareToolRow[] = [];
  for (const toolId of toolIds) {
    const orig = original.items.find((i) => i.toolId === toolId) ?? null;
    const curr = current.items.find((i) => i.toolId === toolId) ?? null;
    rows.push({
      toolId,
      toolName: curr?.toolName ?? orig?.toolName ?? toolId,
      changed: changedIds.has(toolId),
      original: orig,
      current: curr,
    });
  }

  rows.sort((a, b) => {
    if (a.changed !== b.changed) {
      return a.changed ? -1 : 1;
    }
    return a.toolName.localeCompare(b.toolName);
  });

  return rows;
}

export function compareSummary(original: AuditResult, current: AuditResult) {
  const monthlyDelta = current.totalMonthlySavings - original.totalMonthlySavings;
  const annualDelta = current.totalAnnualSavings - original.totalAnnualSavings;
  return {
    monthlyDelta,
    annualDelta,
    previousMonthly: original.totalMonthlySavings,
    currentMonthly: current.totalMonthlySavings,
    previousAnnual: original.totalAnnualSavings,
    currentAnnual: current.totalAnnualSavings,
    previousTier: original.leadTier,
    currentTier: current.leadTier,
    tierChanged: original.leadTier !== current.leadTier,
  };
}
