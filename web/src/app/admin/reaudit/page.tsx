import Link from "next/link";
import { triggerDetectChangesAction } from "./actions";

export default function ReauditAdminPage() {
  const enabled =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_ENABLE_REAUDIT_ADMIN === "true";

  if (!enabled) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-xl font-semibold text-slate-900">Re-audit admin</h1>
        <p className="mt-2 text-sm text-slate-600">
          Set <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_ENABLE_REAUDIT_ADMIN=true</code> on
          preview to use this page, or use curl against <code>/api/detect-changes</code>.
        </p>
        <Link href="/" className="mt-4 inline-block text-sm underline">
          Back home
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-slate-900">Pricing change detection (admin)</h1>
      <p className="mt-2 text-sm text-slate-600">
        Runs the same logic as <code>POST /api/detect-changes</code>. Use after editing{" "}
        <code>pricingCatalog.ts</code> / <code>engineRules.ts</code> and bumping{" "}
        <code>AUDIT_ENGINE_RULES_VERSION</code>.
      </p>

      <div className="mt-8 space-y-4">
        <form action={triggerDetectChangesAction} className="rounded-xl border border-slate-200 bg-white p-4">
          <input type="hidden" name="mode" value="dryRun" />
          <p className="text-sm font-medium text-slate-800">1. Dry run (no save, no email)</p>
          <button
            type="submit"
            className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Preview affected audits
          </button>
        </form>

        <form action={triggerDetectChangesAction} className="rounded-xl border border-slate-200 bg-white p-4">
          <input type="hidden" name="mode" value="skipEmail" />
          <p className="text-sm font-medium text-slate-800">2. Save detection only (no email)</p>
          <button
            type="submit"
            className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Detect and save
          </button>
        </form>

        <form action={triggerDetectChangesAction} className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <input type="hidden" name="mode" value="full" />
          <p className="text-sm font-medium text-amber-950">3. Detect, save, and send Round 2 emails</p>
          <p className="mt-1 text-xs text-amber-900">One consolidated email per user address.</p>
          <button
            type="submit"
            className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Send pricing-update emails
          </button>
        </form>
      </div>

      <p className="mt-8 text-xs text-slate-500">
        Single-audit email: open any <code>/audit/[shareId]/compare</code> page and use &quot;Send
        pricing-update email&quot; (requires saved email on that audit).
      </p>
      <Link href="/" className="mt-4 inline-block text-sm text-slate-600 underline">
        ← Home
      </Link>
    </main>
  );
}
