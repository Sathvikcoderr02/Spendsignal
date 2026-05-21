import type { AuditInput, AuditResult, UseCase } from "./types";
import type { PricingSnapshot } from "@/lib/pricing/pricingSnapshot";

export type StoredPublicAuditRow = {
  id: number;
  created_at: string;
  share_id: string;
  email: string | null;
  team_size: number;
  primary_use_case: string;
  total_monthly_savings: number;
  total_annual_savings: number;
  lead_tier: string;
  audit_payload: AuditResult;
  input_stack: AuditInput | null;
  pricing_snapshot: PricingSnapshot | null;
  pricing_version: string | null;
  last_change_payload: unknown | null;
  change_detected_at: string | null;
};

export type StoredAuditResponse = {
  shareId: string;
  createdAt: string;
  email: string | null;
  teamSize: number;
  primaryUseCase: UseCase;
  input: AuditInput;
  result: AuditResult;
  pricingSnapshot: PricingSnapshot;
  pricingVersion: string;
};

export function toStoredAuditResponse(row: StoredPublicAuditRow): StoredAuditResponse | null {
  if (!row.input_stack || !row.pricing_snapshot) {
    return null;
  }
  return {
    shareId: row.share_id,
    createdAt: row.created_at,
    email: row.email,
    teamSize: row.team_size,
    primaryUseCase: row.primary_use_case as UseCase,
    input: row.input_stack,
    result: row.audit_payload,
    pricingSnapshot: row.pricing_snapshot,
    pricingVersion: row.pricing_version ?? row.pricing_snapshot.engineRulesVersion,
  };
}
