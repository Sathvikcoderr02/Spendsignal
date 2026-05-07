"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TOOL_CATALOG } from "@/lib/audit/pricingCatalog";
import { runAudit } from "@/lib/audit/engine";
import type { AuditInput, ToolInput, UseCase } from "@/lib/audit/types";

const STORAGE_KEY = "credex-audit-form-v1";

const defaultTools = TOOL_CATALOG.map((tool): ToolInput => ({
  toolId: tool.id,
  planId: tool.plans[0]?.id ?? "custom",
  monthlySpend: 0,
  seats: 0,
}));

const defaultInput: AuditInput = {
  teamSize: 5,
  primaryUseCase: "coding",
  tools: defaultTools,
};

type LeadFormState = {
  email: string;
  companyName: string;
  role: string;
  teamSize: string;
};

type SummaryApiResponse = {
  summary: string;
  fallbackUsed: boolean;
};

export default function Home() {
  const [input, setInput] = useState<AuditInput>(defaultInput);
  const hasLoadedFromStorage = useRef(false);
  const [leadForm, setLeadForm] = useState<LeadFormState>({
    email: "",
    companyName: "",
    role: "",
    teamSize: "",
  });
  const [leadMessage, setLeadMessage] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryState, setSummaryState] = useState<{ key: string; text: string; meta: string }>({
    key: "",
    text: "",
    meta: "",
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      hasLoadedFromStorage.current = true;
      return;
    }
    try {
      const parsed = JSON.parse(stored) as AuditInput;
      if (parsed && Array.isArray(parsed.tools)) {
        requestAnimationFrame(() => {
          setInput(parsed);
          hasLoadedFromStorage.current = true;
        });
        return;
      }
    } catch {
      // Ignore invalid payload and continue with defaults.
    }
    hasLoadedFromStorage.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoadedFromStorage.current) {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
  }, [input]);

  const auditResult = useMemo(() => runAudit(input), [input]);
  const hasMeaningfulSavings = auditResult.totalMonthlySavings >= 100;
  const isHighSavings = auditResult.totalMonthlySavings > 500;
  const isLowOrOptimal = auditResult.totalMonthlySavings < 100;
  const summaryKey = `${input.primaryUseCase}-${input.teamSize}-${auditResult.totalMonthlySavings}-${auditResult.totalAnnualSavings}-${auditResult.items
    .map((item) => `${item.toolId}:${item.estimatedMonthlySavings}:${item.recommendedMonthlySpend}`)
    .join("|")}`;
  const visibleSummary = summaryState.key === summaryKey ? summaryState.text : "";
  const visibleSummaryMeta = summaryState.key === summaryKey ? summaryState.meta : "";

  const setUseCase = (value: UseCase) => {
    setInput((prev) => ({ ...prev, primaryUseCase: value }));
  };

  const updateTool = (toolId: ToolInput["toolId"], patch: Partial<ToolInput>) => {
    setInput((prev) => ({
      ...prev,
      tools: prev.tools.map((tool) => (tool.toolId === toolId ? { ...tool, ...patch } : tool)),
    }));
  };

  const generatePersonalizedSummary = async () => {
    try {
      setSummaryLoading(true);
      setSummaryState({ key: summaryKey, text: "", meta: "" });
      const response = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audit: auditResult,
          primaryUseCase: input.primaryUseCase,
          teamSize: input.teamSize,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate summary");
      }

      const payload = (await response.json()) as SummaryApiResponse;
      setSummaryState({
        key: summaryKey,
        text: payload.summary,
        meta: payload.fallbackUsed ? "Generated using fallback summary." : "Generated using LLM summary.",
      });
    } catch {
      setSummaryState({ key: summaryKey, text: "", meta: "Could not generate AI summary right now." });
    } finally {
      setSummaryLoading(false);
    }
  };

  const submitLead = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!leadForm.email.trim()) {
      setLeadMessage("Please add an email to capture this report.");
      return;
    }

    if (isHighSavings) {
      setLeadMessage("Report captured. This stack has high savings potential - book a Credex consult next.");
      return;
    }

    if (isLowOrOptimal) {
      setLeadMessage("Thanks! We'll notify you when new optimization opportunities apply to your stack.");
      return;
    }

    setLeadMessage("Report captured. Check your inbox for your audit summary.");
  };

  const fieldClassName =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <header className="rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Credex</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">SpendSignal Audit</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-600 md:text-base">
            Identify AI tooling overspend, compare right-sized plans, and estimate monthly and annual savings in one
            report.
          </p>
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Current stack input</h2>
            <p className="mt-1 text-sm text-slate-600">Add your plans, spend, and seats. Results update instantly.</p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Team size
                <input
                  type="number"
                  min={1}
                  className={fieldClassName}
                  value={input.teamSize}
                  onChange={(e) =>
                    setInput((prev) => ({ ...prev, teamSize: Math.max(1, Number(e.target.value || 1)) }))
                  }
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Primary use case
                <select
                  className={fieldClassName}
                  value={input.primaryUseCase}
                  onChange={(e) => setUseCase(e.target.value as UseCase)}
                >
                  <option value="coding">Coding</option>
                  <option value="writing">Writing</option>
                  <option value="data">Data</option>
                  <option value="research">Research</option>
                  <option value="mixed">Mixed</option>
                </select>
              </label>
            </div>

            <div className="mt-6 space-y-3">
              {TOOL_CATALOG.map((tool) => {
                const value = input.tools.find((item) => item.toolId === tool.id)!;
                return (
                  <div
                    key={tool.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-slate-300"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">{tool.label}</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Plan
                        <select
                          className={fieldClassName}
                          value={value.planId}
                          onChange={(e) => updateTool(tool.id, { planId: e.target.value })}
                        >
                          {tool.plans.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Monthly spend ($)
                        <input
                          type="number"
                          min={0}
                          className={fieldClassName}
                          value={value.monthlySpend}
                          onChange={(e) =>
                            updateTool(tool.id, { monthlySpend: Math.max(0, Number(e.target.value || 0)) })
                          }
                        />
                      </label>
                      <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Seats
                        <input
                          type="number"
                          min={0}
                          className={fieldClassName}
                          value={value.seats}
                          onChange={(e) => updateTool(tool.id, { seats: Math.max(0, Number(e.target.value || 0)) })}
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Audit results</h2>
              <div className="mt-4 rounded-xl border border-slate-900 bg-slate-900 px-5 py-6 text-white">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Potential savings</p>
                <p className="mt-2 text-4xl font-semibold">${auditResult.totalMonthlySavings}/mo</p>
                <p className="mt-1 text-sm text-slate-300">${auditResult.totalAnnualSavings}/year</p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Lead tier</p>
                  <p className="mt-1 text-xl font-semibold capitalize text-slate-900">{auditResult.leadTier}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {isHighSavings
                      ? "High-impact optimization found"
                      : isLowOrOptimal
                        ? "Current stack is mostly optimized"
                        : "Meaningful optimization available"}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                {isHighSavings ? (
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      You could save more than $500/month. Credex can help secure discounted infrastructure credits.
                    </p>
                    <button className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                      Book Credex consultation
                    </button>
                  </div>
                ) : isLowOrOptimal ? (
                  <p className="text-sm text-slate-700">
                    You are spending well for your current setup. We do not manufacture savings - opt in below to get
                    notified when new optimizations apply.
                  </p>
                ) : (
                  <p className="text-sm text-slate-700">
                    Your stack has clear savings opportunities. Capture this report and we will send your audit
                    summary.
                  </p>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">AI personalized summary</h3>
                  <button
                    type="button"
                    onClick={generatePersonalizedSummary}
                    disabled={summaryLoading}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {summaryLoading ? "Generating..." : "Generate summary"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Uses LLM synthesis for personalized recommendations, with a deterministic fallback on API failure.
                </p>
                {visibleSummary ? <p className="mt-3 text-sm text-slate-700">{visibleSummary}</p> : null}
                {visibleSummaryMeta ? <p className="mt-2 text-xs text-slate-500">{visibleSummaryMeta}</p> : null}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Per-tool recommendations</h3>
              <div className="mt-4 space-y-3">
                {auditResult.items.map((item) => (
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
                    <p className="mt-1 text-xs text-slate-500">{item.rationale}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">
                {hasMeaningfulSavings ? "Email me this report" : "Notify me about future optimizations"}
              </h3>
              <p className="mt-1 text-xs text-slate-600">Value is shown first; email capture is optional.</p>
              <form onSubmit={submitLead} className="mt-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Work email *
                    <input
                      type="email"
                      className={fieldClassName}
                      value={leadForm.email}
                      onChange={(e) => setLeadForm((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </label>
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Company name (optional)
                    <input
                      type="text"
                      className={fieldClassName}
                      value={leadForm.companyName}
                      onChange={(e) => setLeadForm((prev) => ({ ...prev, companyName: e.target.value }))}
                    />
                  </label>
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Role (optional)
                    <input
                      type="text"
                      className={fieldClassName}
                      value={leadForm.role}
                      onChange={(e) => setLeadForm((prev) => ({ ...prev, role: e.target.value }))}
                    />
                  </label>
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Team size (optional)
                    <input
                      type="number"
                      min={1}
                      className={fieldClassName}
                      value={leadForm.teamSize}
                      onChange={(e) => setLeadForm((prev) => ({ ...prev, teamSize: e.target.value }))}
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  {isHighSavings ? "Capture report and book consult" : "Capture report"}
                </button>
                {leadMessage ? <p className="mt-2 text-xs text-slate-600">{leadMessage}</p> : null}
              </form>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
