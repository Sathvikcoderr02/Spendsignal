"use client";

import { useState } from "react";
import { notifySingleAuditFromCompare } from "./actions";

export function CompareNotifyButton({ shareId }: { shareId: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    setStatus(null);
    try {
      const result = await notifySingleAuditFromCompare(shareId);
      setStatus(result.message);
    } catch {
      setStatus("Unexpected error while sending email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-800">Round 2 pricing-update email</p>
      <p className="mt-1 text-xs text-slate-600">
        Re-checks this audit vs current catalog/rules and emails the saved address if something changed.
      </p>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {loading ? "Sending…" : "Send pricing-update email"}
      </button>
      {status ? <p className="mt-2 text-xs text-slate-700">{status}</p> : null}
    </div>
  );
}
