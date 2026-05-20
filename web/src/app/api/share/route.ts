import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { AuditInput, AuditResult, UseCase } from "@/lib/audit/types";
import { AUDIT_ENGINE_RULES_VERSION } from "@/lib/audit/engineRules";
import { buildPricingSnapshot } from "@/lib/pricing/pricingSnapshot";
import { getPublicAppUrl } from "@/lib/server/publicAppUrl";
import { getSupabaseAdminClient } from "@/lib/server/supabaseAdmin";

const sharePayloadSchema = z.object({
  audit: z.custom<AuditResult>(),
  input: z.custom<AuditInput>(),
  teamSize: z.number().int().positive(),
  primaryUseCase: z.custom<UseCase>(),
  email: z.string().email().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = sharePayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid share payload." }, { status: 400 });
    }

    let supabase;
    try {
      supabase = getSupabaseAdminClient();
    } catch {
      return NextResponse.json(
        { message: "Share service is not configured. Add Supabase credentials." },
        { status: 503 },
      );
    }

    const shareId = randomUUID();
    const { audit, input, teamSize, primaryUseCase, email } = parsed.data;
    const pricingSnapshot = buildPricingSnapshot();

    const { error } = await supabase.from("public_audits").insert({
      share_id: shareId,
      email: email ?? null,
      team_size: teamSize,
      primary_use_case: primaryUseCase,
      total_monthly_savings: audit.totalMonthlySavings,
      total_annual_savings: audit.totalAnnualSavings,
      lead_tier: audit.leadTier,
      audit_payload: audit,
      input_stack: input,
      pricing_snapshot: pricingSnapshot,
      pricing_version: AUDIT_ENGINE_RULES_VERSION,
    });

    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes("relation") && message.includes("public_audits")) {
        return NextResponse.json(
          {
            message:
              "Missing database table 'public_audits'. Run web/supabase/schema.sql (and migrations) in Supabase SQL editor.",
          },
          { status: 500 },
        );
      }
      if (message.includes("column") && (message.includes("input_stack") || message.includes("pricing_snapshot"))) {
        return NextResponse.json(
          {
            message:
              "Database needs Round 2 columns. Run web/supabase/migrations/20260520_round2_stored_audits.sql in Supabase.",
          },
          { status: 500 },
        );
      }
      return NextResponse.json(
        { message: `Unable to create share link right now. Supabase error: ${error.message}` },
        { status: 500 },
      );
    }

    const appUrl = getPublicAppUrl();
    return NextResponse.json({ shareId, shareUrl: `${appUrl}/audit/${shareId}` });
  } catch {
    return NextResponse.json({ message: "Unexpected error creating share link." }, { status: 500 });
  }
}
