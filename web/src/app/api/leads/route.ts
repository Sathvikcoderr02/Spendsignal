import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { AuditInput, AuditResult } from "@/lib/audit/types";
import { AUDIT_ENGINE_RULES_VERSION } from "@/lib/audit/engineRules";
import { buildPricingSnapshot } from "@/lib/pricing/pricingSnapshot";
import { getSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { sendEmail } from "@/lib/email";

const leadSchema = z.object({
  email: z.string().email(),
  companyName: z.string().max(120).optional().or(z.literal("")),
  role: z.string().max(120).optional().or(z.literal("")),
  teamSize: z.number().int().positive().max(2000).nullable(),
  honeypot: z.string().optional(),
  audit: z.custom<AuditResult>(),
  input: z.custom<AuditInput>(),
  shareId: z.string().uuid().optional(),
});

const ipStore = new Map<string, number[]>();
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 8;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const attempts = ipStore.get(ip) ?? [];
  const recent = attempts.filter((timestamp) => now - timestamp <= RATE_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX) {
    ipStore.set(ip, recent);
    return true;
  }

  recent.push(now);
  ipStore.set(ip, recent);
  return false;
}

function getClientIp(request: Request): string {
  const header = request.headers.get("x-forwarded-for");
  if (!header) {
    return "unknown";
  }
  return header.split(",")[0]?.trim() ?? "unknown";
}

function buildConfirmationEmailHtml(payload: {
  monthlySavings: number;
  annualSavings: number;
  leadTier: string;
}): string {
  return `
    <div style="font-family: Inter, Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="margin-bottom: 8px;">Your SpendSignal audit is ready</h2>
      <p style="margin: 0 0 12px;">Thanks for using Credex SpendSignal.</p>
      <ul style="margin: 0 0 12px;">
        <li>Estimated monthly savings: <strong>$${payload.monthlySavings}</strong></li>
        <li>Estimated annual savings: <strong>$${payload.annualSavings}</strong></li>
        <li>Opportunity tier: <strong>${payload.leadTier}</strong></li>
      </ul>
      <p style="margin: 0;">
        ${payload.monthlySavings > 500 ? "Your stack qualifies for a high-savings consult and Credex may reach out with credit options." : "Keep tracking your stack as pricing and usage evolve."}
      </p>
    </div>
  `;
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return NextResponse.json({ message: "Too many requests. Please try again later." }, { status: 429 });
    }

    const raw = await request.json();
    const parsed = leadSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
    }

    const payload = parsed.data;
    if (payload.honeypot && payload.honeypot.trim().length > 0) {
      return NextResponse.json({ message: "Submission accepted." }, { status: 200 });
    }

    let supabase;
    try {
      supabase = getSupabaseAdminClient();
    } catch {
      return NextResponse.json(
        {
          message:
            "Lead capture service is not configured yet. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 503 },
      );
    }

    const leadTier = payload.audit.leadTier;
    const insertData = {
      email: payload.email,
      company_name: payload.companyName || null,
      role: payload.role || null,
      team_size: payload.teamSize,
      monthly_savings: payload.audit.totalMonthlySavings,
      annual_savings: payload.audit.totalAnnualSavings,
      lead_tier: leadTier,
      audit_payload: payload.audit,
      source: "spendsignal-web",
    };

    const { error: insertError } = await supabase.from("audit_leads").insert(insertData);
    if (insertError) {
      return NextResponse.json({ message: "Unable to store lead right now." }, { status: 500 });
    }

    const pricingSnapshot = buildPricingSnapshot();
    let auditShareId = payload.shareId;

    if (auditShareId) {
      const { error: updateError } = await supabase
        .from("public_audits")
        .update({
          email: payload.email,
          input_stack: payload.input,
          audit_payload: payload.audit,
          pricing_snapshot: pricingSnapshot,
          pricing_version: AUDIT_ENGINE_RULES_VERSION,
          total_monthly_savings: payload.audit.totalMonthlySavings,
          total_annual_savings: payload.audit.totalAnnualSavings,
          lead_tier: leadTier,
        })
        .eq("share_id", auditShareId);

      if (updateError) {
        return NextResponse.json(
          { message: `Lead saved but could not link to shared audit: ${updateError.message}` },
          { status: 500 },
        );
      }
    } else {
      auditShareId = randomUUID();
      const { error: auditInsertError } = await supabase.from("public_audits").insert({
        share_id: auditShareId,
        email: payload.email,
        team_size: payload.input.teamSize,
        primary_use_case: payload.input.primaryUseCase,
        total_monthly_savings: payload.audit.totalMonthlySavings,
        total_annual_savings: payload.audit.totalAnnualSavings,
        lead_tier: leadTier,
        audit_payload: payload.audit,
        input_stack: payload.input,
        pricing_snapshot: pricingSnapshot,
        pricing_version: AUDIT_ENGINE_RULES_VERSION,
      });

      if (auditInsertError) {
        return NextResponse.json(
          {
            message: `Lead saved but could not store audit for re-audit: ${auditInsertError.message}. Run Round 2 migration SQL.`,
          },
          { status: 500 },
        );
      }
    }

    let emailStatusMessage = "Confirmation email sent.";
    const emailResult = await sendEmail({
      to: payload.email,
      subject: "Your AI Spend Audit from Credex",
      html: buildConfirmationEmailHtml({
        monthlySavings: payload.audit.totalMonthlySavings,
        annualSavings: payload.audit.totalAnnualSavings,
        leadTier,
      }),
    });

    if (!emailResult.success) {
      emailStatusMessage = `Lead stored, but confirmation email failed: ${emailResult.error}`;
    }

    return NextResponse.json({
      shareId: auditShareId,
      message:
        payload.audit.totalMonthlySavings > 500
          ? `Report captured. Credex will follow up for high-savings consultation. ${emailStatusMessage}`
          : `Report captured. ${emailStatusMessage}`,
    });
  } catch {
    return NextResponse.json({ message: "Unexpected server error while capturing lead." }, { status: 500 });
  }
}
