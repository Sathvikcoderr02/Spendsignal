"use server";

import { redirect } from "next/navigation";
import { runDetectChanges } from "@/lib/reaudit/runDetectChanges";

export async function triggerDetectChangesAction(formData: FormData): Promise<void> {
  const mode = formData.get("mode")?.toString() ?? "full";

  const result = await runDetectChanges({
    dryRun: mode === "dryRun",
    skipEmail: mode === "skipEmail",
  });

  if ("status" in result) {
    redirect(`/admin/reaudit?error=${encodeURIComponent(result.message)}`);
  }

  const message = `Processed ${result.processed} audits. Affected: ${result.affectedCount}. Emails sent: ${result.emailsSent}/${result.emailsAttempted}.`;
  redirect(`/admin/reaudit?ok=${encodeURIComponent(message)}`);
}
