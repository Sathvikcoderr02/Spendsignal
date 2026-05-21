"use server";

import { runDetectChanges } from "@/lib/reaudit/runDetectChanges";

export async function triggerDetectChangesAction(formData: FormData) {
  const mode = formData.get("mode")?.toString() ?? "full";

  const result = await runDetectChanges({
    dryRun: mode === "dryRun",
    skipEmail: mode === "skipEmail",
  });

  if ("status" in result) {
    return { ok: false as const, message: result.message };
  }

  return {
    ok: true as const,
    message: `Processed ${result.processed} audits. Affected: ${result.affectedCount}. Emails sent: ${result.emailsSent}/${result.emailsAttempted}.`,
    result,
  };
}
