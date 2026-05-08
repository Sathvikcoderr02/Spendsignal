import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import type { AuditResult } from "@/lib/audit/types";
import { getSupabaseAdminClient } from "@/lib/server/supabaseAdmin";

const leadSchema = z.object({
  email: z.string().email(),
  companyName: z.string().max(120).optional().or(z.literal("")),
  role: z.string().max(120).optional().or(z.literal("")),
  teamSize: z.number().int().positive().max(2000).nullable(),
  honeypot: z.string().optional(),
  audit: z.custom<AuditResult>(),
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

    const resendKey = process.env.RESEND_API_KEY;
    const resendFromEmail = process.env.RESEND_FROM_EMAIL;
    if (resendKey && resendFromEmail) {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: resendFromEmail,
        to: payload.email,
        subject: "Your AI Spend Audit from Credex",
        html: buildConfirmationEmailHtml({
          monthlySavings: payload.audit.totalMonthlySavings,
          annualSavings: payload.audit.totalAnnualSavings,
          leadTier,
        }),
      });
    }

    return NextResponse.json({
      message:
        payload.audit.totalMonthlySavings > 500
          ? "Report captured. Credex will follow up for high-savings consultation."
          : "Report captured. Confirmation email sent.",
    });
  } catch {
    return NextResponse.json({ message: "Unexpected server error while capturing lead." }, { status: 500 });
  }
}
