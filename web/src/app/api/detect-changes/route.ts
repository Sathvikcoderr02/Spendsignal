import { NextResponse } from "next/server";
import { detectChangesForStoredAudit } from "@/lib/reaudit/detectChanges";
import type { StoredPublicAuditRow } from "@/lib/audit/storedAudit";
import { getSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { buildPricingSnapshot } from "@/lib/pricing/pricingSnapshot";
import { AUDIT_ENGINE_RULES_VERSION } from "@/lib/audit/engineRules";

function isAuthorized(request: Request): boolean {
  const secret = process.env.DETECT_CHANGES_SECRET ?? process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const headerSecret = request.headers.get("x-detect-changes-secret");
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  return headerSecret === secret || bearer === secret;
}

/**
 * Manual pricing-change detection (Round 2).
 *
 * How to update pricing before calling this:
 * 1. Edit `web/src/lib/audit/pricingCatalog.ts` and/or `engineRules.ts`
 * 2. Bump `AUDIT_ENGINE_RULES_VERSION` when rules change
 * 3. Update `PRICING_DATA.md` at repo root
 * 4. Redeploy preview/production
 * 5. POST /api/detect-changes (with secret header in production)
 */
export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const url = new URL(request.url);
    const dryRun = url.searchParams.get("dryRun") === "true";

    let supabase;
    try {
      supabase = getSupabaseAdminClient();
    } catch {
      return NextResponse.json(
        { message: "Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." },
        { status: 503 },
      );
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
        return NextResponse.json(
          {
            message:
              "Run web/supabase/migrations/20260521_round2_change_detection.sql in Supabase before detect-changes.",
          },
          { status: 500 },
        );
      }
      return NextResponse.json({ message: `Unable to load audits: ${error.message}` }, { status: 500 });
    }

    const audits = rows ?? [];
    const affected: Array<{
      shareId: string;
      email: string;
      changePayload: NonNullable<ReturnType<typeof detectChangesForStoredAudit>>["changePayload"];
    }> = [];

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
          return NextResponse.json(
            { message: `Detection stopped: failed to save change for ${detection.shareId}: ${updateError.message}` },
            { status: 500 },
          );
        }
      }
    }

    const currentSnapshot = buildPricingSnapshot();

    return NextResponse.json({
      processed: audits.length,
      affectedCount: affected.length,
      dryRun,
      currentPricingVersion: AUDIT_ENGINE_RULES_VERSION,
      currentSnapshotCapturedAt: currentSnapshot.capturedAt,
      affected,
      pricingUpdateInstructions:
        "Edit pricingCatalog.ts / engineRules.ts, bump AUDIT_ENGINE_RULES_VERSION, update PRICING_DATA.md, redeploy, then call this endpoint again.",
    });
  } catch {
    return NextResponse.json({ message: "Unexpected error during change detection." }, { status: 500 });
  }
}
