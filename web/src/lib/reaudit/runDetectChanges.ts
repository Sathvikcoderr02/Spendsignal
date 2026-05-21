import { detectChangesForStoredAudit } from "@/lib/reaudit/detectChanges";
import {
  buildConsolidatedPricingChangeEmail,
  groupAffectedAuditsByEmail,
  type AffectedAuditForEmail,
} from "@/lib/reaudit/pricingChangeEmail";
import type { StoredPublicAuditRow } from "@/lib/audit/storedAudit";
import { sendEmail } from "@/lib/email";
import { getPublicAppUrl } from "@/lib/server/publicAppUrl";
import { getSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { buildPricingSnapshot } from "@/lib/pricing/pricingSnapshot";
import { AUDIT_ENGINE_RULES_VERSION } from "@/lib/audit/engineRules";

export type DetectChangesRunResult = {
  processed: number;
  affectedCount: number;
  dryRun: boolean;
  skipEmail: boolean;
  emailsAttempted: number;
  emailsSent: number;
  emailResults: Array<{ email: string; auditCount: number; sent: boolean; error?: string }>;
  currentPricingVersion: string;
  currentSnapshotCapturedAt: string;
  affected: AffectedAuditForEmail[];
  pricingUpdateInstructions: string;
};

export type DetectChangesRunError = {
  message: string;
  status: number;
};

export async function runDetectChanges(options: {
  dryRun?: boolean;
  skipEmail?: boolean;
}): Promise<DetectChangesRunResult | DetectChangesRunError> {
  const dryRun = options.dryRun ?? false;
  const skipEmail = options.skipEmail ?? false;

  let supabase;
  try {
    supabase = getSupabaseAdminClient();
  } catch {
    return {
      message: "Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      status: 503,
    };
  }

  const { data: rows, error } = await supabase
    .from("public_audits")
    .select("*")
    .not("email", "is", null)
    .not("input_stack", "is", null)
    .not("pricing_snapshot", "is", null)
    .returns<StoredPublicAuditRow[]>();

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("column") && message.includes("last_change_payload")) {
      return {
        message:
          "Run web/supabase/migrations/20260521_round2_change_detection.sql in Supabase before detect-changes.",
        status: 500,
      };
    }
    return { message: `Unable to load audits: ${error.message}`, status: 500 };
  }

  const audits = rows ?? [];
  const affected: AffectedAuditForEmail[] = [];

  for (const row of audits) {
    const detection = detectChangesForStoredAudit(row);
    if (!detection?.changed || !detection.changePayload) {
      continue;
    }

    affected.push({
      shareId: detection.shareId,
      email: detection.email,
      changePayload: detection.changePayload,
    });

    if (!dryRun) {
      const { error: updateError } = await supabase
        .from("public_audits")
        .update({
          last_change_payload: detection.changePayload,
          change_detected_at: detection.changePayload.detectedAt,
        })
        .eq("share_id", detection.shareId);

      if (updateError) {
        return {
          message: `Detection stopped: failed to save change for ${detection.shareId}: ${updateError.message}`,
          status: 500,
        };
      }
    }
  }

  const currentSnapshot = buildPricingSnapshot();
  const emailResults: DetectChangesRunResult["emailResults"] = [];

  if (!dryRun && !skipEmail && affected.length > 0) {
    const appUrl = getPublicAppUrl();
    const byEmail = groupAffectedAuditsByEmail(affected);

    for (const [, emailAudits] of byEmail) {
      const recipient = emailAudits[0]?.email;
      if (!recipient) {
        continue;
      }
      const { subject, html } = buildConsolidatedPricingChangeEmail({
        audits: emailAudits,
        appUrl,
      });
      const result = await sendEmail({ to: recipient, subject, html });
      emailResults.push({
        email: recipient,
        auditCount: emailAudits.length,
        sent: result.success,
        error: result.success ? undefined : result.error,
      });
    }
  }

  return {
    processed: audits.length,
    affectedCount: affected.length,
    dryRun,
    skipEmail,
    emailsAttempted: emailResults.length,
    emailsSent: emailResults.filter((r) => r.sent).length,
    emailResults,
    currentPricingVersion: AUDIT_ENGINE_RULES_VERSION,
    currentSnapshotCapturedAt: currentSnapshot.capturedAt,
    affected,
    pricingUpdateInstructions:
      "Edit pricingCatalog.ts / engineRules.ts, bump AUDIT_ENGINE_RULES_VERSION, update PRICING_DATA.md, redeploy, then run detection again.",
  };
}

export type NotifySingleAuditResult =
  | { ok: true; sent: boolean; email: string; changed: boolean; message: string }
  | { ok: false; message: string };

/** Re-detect and email one stored audit (used from compare UI). */
export async function notifySingleAuditPricingChange(shareId: string): Promise<NotifySingleAuditResult> {
  let supabase;
  try {
    supabase = getSupabaseAdminClient();
  } catch {
    return { ok: false, message: "Supabase is not configured." };
  }

  const { data: row, error } = await supabase
    .from("public_audits")
    .select("*")
    .eq("share_id", shareId)
    .single<StoredPublicAuditRow>();

  if (error || !row) {
    return { ok: false, message: "Audit not found." };
  }
  if (!row.email || !row.input_stack || !row.pricing_snapshot) {
    return {
      ok: false,
      message: "Audit is missing email or Round 2 stored fields. Capture report with email first.",
    };
  }

  const detection = detectChangesForStoredAudit(row);
  if (!detection?.changed || !detection.changePayload) {
    return {
      ok: true,
      sent: false,
      email: row.email,
      changed: false,
      message: "No pricing or recommendation change vs stored snapshot. Email not sent.",
    };
  }

  const { error: updateError } = await supabase
    .from("public_audits")
    .update({
      last_change_payload: detection.changePayload,
      change_detected_at: detection.changePayload.detectedAt,
    })
    .eq("share_id", shareId);

  if (updateError) {
    return { ok: false, message: updateError.message };
  }

  const { subject, html } = buildConsolidatedPricingChangeEmail({
    audits: [
      {
        shareId,
        email: row.email,
        changePayload: detection.changePayload,
      },
    ],
    appUrl: getPublicAppUrl(),
  });

  const emailResult = await sendEmail({ to: row.email, subject, html });
  if (!emailResult.success) {
    return {
      ok: true,
      sent: false,
      email: row.email,
      changed: true,
      message: `Change saved but email failed: ${emailResult.error}`,
    };
  }

  return {
    ok: true,
    sent: true,
    email: row.email,
    changed: true,
    message: `Pricing-update email sent to ${row.email}.`,
  };
}
