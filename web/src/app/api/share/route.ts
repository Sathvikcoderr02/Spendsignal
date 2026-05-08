import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { AuditResult, UseCase } from "@/lib/audit/types";
import { getSupabaseAdminClient } from "@/lib/server/supabaseAdmin";

const sharePayloadSchema = z.object({
  audit: z.custom<AuditResult>(),
  teamSize: z.number().int().positive(),
  primaryUseCase: z.custom<UseCase>(),
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
    const { audit, teamSize, primaryUseCase } = parsed.data;
    const { error } = await supabase.from("public_audits").insert({
      share_id: shareId,
      team_size: teamSize,
      primary_use_case: primaryUseCase,
      total_monthly_savings: audit.totalMonthlySavings,
      total_annual_savings: audit.totalAnnualSavings,
      lead_tier: audit.leadTier,
      audit_payload: audit,
    });

    if (error) {
      return NextResponse.json({ message: "Unable to create share link right now." }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.json({ shareId, shareUrl: `${appUrl}/audit/${shareId}` });
  } catch {
    return NextResponse.json({ message: "Unexpected error creating share link." }, { status: 500 });
  }
}
