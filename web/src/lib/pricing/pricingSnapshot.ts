import { TOOL_CATALOG } from "@/lib/audit/pricingCatalog";
import {
  AUDIT_ENGINE_RULES_VERSION,
  CREDITS_DISCOUNT_MULTIPLIER,
  RIGHTSIZE_PER_SEAT_TARGETS,
  USE_CASE_ALT_BENCHMARK,
} from "@/lib/audit/engineRules";

export type PricingSnapshot = {
  capturedAt: string;
  engineRulesVersion: string;
  catalog: typeof TOOL_CATALOG;
  engineRules: {
    useCaseAltBenchmark: typeof USE_CASE_ALT_BENCHMARK;
    rightsizePerSeatTargets: typeof RIGHTSIZE_PER_SEAT_TARGETS;
    creditsDiscountMultiplier: number;
  };
};

export function buildPricingSnapshot(): PricingSnapshot {
  return {
    capturedAt: new Date().toISOString(),
    engineRulesVersion: AUDIT_ENGINE_RULES_VERSION,
    catalog: structuredClone(TOOL_CATALOG),
    engineRules: {
      useCaseAltBenchmark: { ...USE_CASE_ALT_BENCHMARK },
      rightsizePerSeatTargets: { ...RIGHTSIZE_PER_SEAT_TARGETS },
      creditsDiscountMultiplier: CREDITS_DISCOUNT_MULTIPLIER,
    },
  };
}
