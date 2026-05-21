"use server";

import { notifySingleAuditPricingChange } from "@/lib/reaudit/runDetectChanges";

export async function notifySingleAuditFromCompare(shareId: string) {
  const result = await notifySingleAuditPricingChange(shareId);
  if (!result.ok) {
    return { message: result.message };
  }
  return { message: result.message };
}
