import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { AuditResult } from "@/lib/audit/types";
import { getPublicAppUrl } from "@/lib/server/publicAppUrl";
import { getSupabaseAdminClient } from "@/lib/server/supabaseAdmin";

type SharedAuditRecord = {
  share_id: string;
  team_size: number;
  primary_use_case: string;
  total_monthly_savings: number;
  total_annual_savings: number;
  lead_tier: string;
  audit_payload: AuditResult;
  input_stack: unknown | null;
};

async function getSharedAudit(shareId: string): Promise<SharedAuditRecord | null> {
  let supabase;
  try {
    supabase = getSupabaseAdminClient();
  } catch {
    return null;
  }

  const { data, error } = await supabase
    .from("public_audits")
    .select("*")
    .eq("share_id", shareId)
    .single<SharedAuditRecord>();

  if (error || !data) {
    return null;
  }
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shareId: string }>;
}): Promise<Metadata> {
  const { shareId } = await params;
  const sharedAudit = await getSharedAudit(shareId);
  if (!sharedAudit) {
    return {
      title: "Shared audit not found | SpendSignal",
      description: "The requested shared audit does not exist or is unavailable.",
    };
  }

  const appUrl = getPublicAppUrl();
  const url = `${appUrl}/audit/${shareId}`;
  const title = `AI spend audit: save $${sharedAudit.total_monthly_savings}/month`;
  const description = `Public SpendSignal report showing estimated savings of $${sharedAudit.total_monthly_savings}/month ($${sharedAudit.total_annual_savings}/year).`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "article",
      siteName: "SpendSignal by Credex",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function SharedAuditPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const sharedAudit = await getSharedAudit(shareId);
  if (!sharedAudit) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-4xl px-4 md:px-8">
        <header className="rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Public report</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            SpendSignal AI Spend Audit
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Shared from a live audit. This view excludes private fields like email and company identity.
          </p>
          {sharedAudit.input_stack ? (
            <p className="mt-4">
              <Link
                href={`/audit/${shareId}/compare`}
                className="text-sm font-semibold text-slate-900 underline hover:text-slate-600"
              >
                Compare original vs current pricing →
              </Link>
            </p>
          ) : null}
        </header>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Monthly savings</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">${sharedAudit.total_monthly_savings}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Annual savings</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">${sharedAudit.total_annual_savings}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Lead tier</p>
              <p className="mt-1 text-2xl font-semibold capitalize text-slate-900">{sharedAudit.lead_tier}</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {sharedAudit.audit_payload.items.map((item) => (
              <article key={item.toolId} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{item.toolName}</p>
                  <p className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                    Save ${item.estimatedMonthlySavings}/mo
                  </p>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Current ${item.currentMonthlySpend}/mo {"->"} Recommended ${item.recommendedMonthlySpend}/mo
                </p>
                <p className="mt-2 text-sm font-medium text-slate-800">{item.recommendedAction}</p>
                <p className="mt-1 text-xs text-slate-600">{item.reason}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
