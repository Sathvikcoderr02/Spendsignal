import Link from "next/link";
import { notFound } from "next/navigation";
import { runAudit } from "@/lib/audit/engine";
import type { AuditChangePayload } from "@/lib/reaudit/detectChanges";
import { buildCompareRows, compareSummary } from "@/lib/reaudit/compareView";
import type { StoredPublicAuditRow } from "@/lib/audit/storedAudit";
import { getSupabaseAdminClient } from "@/lib/server/supabaseAdmin";

function ToolCard({
  item,
  variant,
}: {
  item: NonNullable<ReturnType<typeof buildCompareRows>[0]["original"]>;
  variant: "original" | "current";
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${variant === "current" ? "border-amber-300 bg-amber-50/50" : "border-slate-200 bg-white"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-slate-900">{item.toolName}</p>
        <p className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
          Save ${item.estimatedMonthlySavings}/mo
        </p>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Current ${item.currentMonthlySpend}/mo → Recommended ${item.recommendedMonthlySpend}/mo
      </p>
      <p className="mt-2 text-sm font-medium text-slate-800">{item.recommendedAction}</p>
      <p className="mt-1 text-xs text-slate-600">{item.reason}</p>
    </div>
  );
}

function formatDelta(delta: number, period: "mo" | "yr" = "mo"): string {
  if (delta > 0) return `+$${delta}/${period}`;
  if (delta < 0) return `-$${Math.abs(delta)}/${period}`;
  return "No change";
}

async function getStoredAuditForCompare(shareId: string): Promise<StoredPublicAuditRow | null> {
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
    .single<StoredPublicAuditRow>();

  if (error || !data?.input_stack) {
    return null;
  }
  return data;
}

export default async function AuditComparePage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const row = await getStoredAuditForCompare(shareId);
  if (!row?.input_stack) {
    notFound();
  }

  const original = row.audit_payload;
  const current = runAudit(row.input_stack);
  const rows = buildCompareRows(original, current);
  const summary = compareSummary(original, current);
  const changedRows = rows.filter((r) => r.changed);
  const unchangedRows = rows.filter((r) => !r.changed);

  const lastChange = row.last_change_payload as AuditChangePayload | null;
  const detectedAt = row.change_detected_at
    ? new Date(row.change_detected_at).toLocaleString()
    : null;

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <header className="rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Re-audit compare</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Original vs current pricing</h1>
          <p className="mt-3 text-sm text-slate-600">
            Left: saved audit at capture. Right: same stack re-run with today&apos;s catalog and rules.
          </p>
          {detectedAt ? (
            <p className="mt-2 text-xs text-slate-500">Last change detection: {detectedAt}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link href={`/audit/${shareId}`} className="text-slate-600 underline hover:text-slate-900">
              Public share view
            </Link>
            <Link href="/" className="text-slate-600 underline hover:text-slate-900">
              Run a new audit
            </Link>
          </div>
        </header>

        <section className="mt-6 rounded-2xl border-2 border-slate-900 bg-slate-900 px-6 py-6 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-300">Total savings delta</p>
          <p className="mt-2 text-4xl font-bold">{formatDelta(summary.monthlyDelta)}</p>
          <p className="mt-2 text-sm text-slate-300">
            Was ${summary.previousMonthly}/mo ({summary.previousTier}) → now ${summary.currentMonthly}/mo (
            {summary.currentTier})
            {summary.tierChanged ? " — tier changed" : ""}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Annual: ${summary.previousAnnual} → ${summary.currentAnnual} ({formatDelta(summary.annualDelta, "yr")})
          </p>
          {lastChange && lastChange.pricingChanges.length > 0 ? (
            <ul className="mt-4 list-inside list-disc text-sm text-slate-300">
              {lastChange.pricingChanges.slice(0, 5).map((c) => (
                <li key={`${c.toolId}-${c.planId}`}>
                  {c.label}: {c.previousValue ?? "n/a"} → {c.currentValue ?? "removed"} /seat
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {changedRows.length > 0 ? (
          <section className="mt-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Changed recommendations ({changedRows.length})</h2>
            {changedRows.map((rowItem) => (
              <div key={rowItem.toolId} className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
                <p className="mb-3 text-sm font-semibold text-amber-900">{rowItem.toolName}</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Original</p>
                    {rowItem.original ? (
                      <ToolCard item={rowItem.original} variant="original" />
                    ) : (
                      <p className="text-sm text-slate-500">Not in original audit</p>
                    )}
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">Current</p>
                    {rowItem.current ? (
                      <ToolCard item={rowItem.current} variant="current" />
                    ) : (
                      <p className="text-sm text-slate-500">Not in current audit</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </section>
        ) : (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            No per-tool recommendation changes. Headline totals may still match if pricing rules refreshed without
            moving line items.
          </section>
        )}

        {unchangedRows.length > 0 ? (
          <details className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <summary className="cursor-pointer px-6 py-4 text-sm font-semibold text-slate-700">
              Unchanged tools ({unchangedRows.length}) — collapsed
            </summary>
            <ul className="border-t border-slate-100 px-6 py-4 text-sm text-slate-500">
              {unchangedRows.map((rowItem) => (
                <li key={rowItem.toolId} className="py-1">
                  {rowItem.toolName} — {rowItem.current?.recommendedAction ?? rowItem.original?.recommendedAction}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </main>
  );
}
