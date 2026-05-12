"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TOOL_CATALOG } from "@/lib/audit/pricingCatalog";
import { runAudit } from "@/lib/audit/engine";
import type { AuditInput, ToolInput, UseCase } from "@/lib/audit/types";

const STORAGE_KEY = "credex-audit-form-v1";

/** High-savings CTA: set in Vercel as NEXT_PUBLIC_CREDEX_CONSULT_URL (Calendly, mailto:, or site). */
const CREDEX_CONSULT_URL =
  process.env.NEXT_PUBLIC_CREDEX_CONSULT_URL?.trim() || "https://credex.rocks";

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
  website: string;
};

type SummaryApiResponse = {
  summary: string;
  fallbackUsed: boolean;
};

type ShareApiResponse = {
  shareId: string;
  shareUrl: string;
};

export default function Home() {
  const [input, setInput] = useState<AuditInput>(defaultInput);
  const hasLoadedFromStorage = useRef(false);
  const [leadForm, setLeadForm] = useState<LeadFormState>({
    email: "",
    companyName: "",
    role: "",
    teamSize: "",
    website: "",
  });
  const [leadMessage, setLeadMessage] = useState("");
  const [leadLoading, setLeadLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareMessage, setShareMessage] = useState("");
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

  const createShareLink = async () => {
    try {
      setShareLoading(true);
      setShareMessage("");
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audit: auditResult,
          teamSize: input.teamSize,
          primaryUseCase: input.primaryUseCase,
        }),
      });

      const data = (await response.json()) as Partial<ShareApiResponse> & { message?: string };
      if (!response.ok || !data.shareUrl) {
        setShareMessage(data.message ?? "Unable to create a share link right now.");
        return;
      }

      setShareUrl(data.shareUrl);
      setShareMessage("Share link created. Anyone with this URL can view the public report.");
    } catch {
      setShareMessage("Unable to create a share link right now.");
    } finally {
      setShareLoading(false);
    }
  };

  const submitLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!leadForm.email.trim()) {
      setLeadMessage("Please add an email to capture this report.");
      return;
    }

    try {
      setLeadLoading(true);
      setLeadMessage("");
      const parsedTeamSize = Number(leadForm.teamSize);
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: leadForm.email.trim(),
          companyName: leadForm.companyName.trim(),
          role: leadForm.role.trim(),
          teamSize: Number.isFinite(parsedTeamSize) && parsedTeamSize > 0 ? parsedTeamSize : null,
          honeypot: leadForm.website,
          audit: auditResult,
        }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setLeadMessage(data.message ?? "Unable to capture report right now. Please try again.");
        return;
      }

      setLeadMessage(
        data.message ??
          (isHighSavings
            ? "Report captured. This stack has high savings potential - book a Credex consult next."
            : isLowOrOptimal
              ? "Thanks! We'll notify you when new optimization opportunities apply to your stack."
              : "Report captured. Check your inbox for your audit summary."),
      );
    } catch {
      setLeadMessage("Unable to capture report right now. Please try again.");
    } finally {
      setLeadLoading(false);
    }
  };

  const fieldClassName =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200";
  const formatMoney = (value: number) => new Intl.NumberFormat("en-US").format(value);

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-300">
            Credex | AI spend optimization
          </div>
          <div className="px-6 py-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                Free audit
              </span>
              <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                No login required
              </span>
              <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                2 min setup
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
              SpendSignal Audit
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
              Identify AI tooling overspend, compare right-sized plans, and generate a shareable savings report with
              actionable recommendations by tool.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Monthly potential</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">${formatMoney(auditResult.totalMonthlySavings)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Annual potential</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">${formatMoney(auditResult.totalAnnualSavings)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Lead priority</p>
                <p className="mt-1 text-lg font-semibold capitalize text-slate-900">{auditResult.leadTier}</p>
              </div>
            </div>
          </div>
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
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-slate-300 hover:bg-white"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">{tool.label}</p>
                      <span className="rounded-md bg-slate-200/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                        {value.seats > 0 ? `${value.seats} seats` : "Not in use"}
                      </span>
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

          <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Audit results</h2>
              <div className="mt-4 rounded-xl border border-slate-900 bg-slate-900 px-5 py-6 text-white">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Potential savings</p>
                <p className="mt-2 text-4xl font-semibold">${formatMoney(auditResult.totalMonthlySavings)}/mo</p>
                <p className="mt-1 text-sm text-slate-300">${formatMoney(auditResult.totalAnnualSavings)}/year</p>
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
                    <a
                      href={CREDEX_CONSULT_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      Book Credex consultation
                    </a>
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
                {visibleSummary ? (
                  <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                    {visibleSummary}
                  </p>
                ) : null}
                {visibleSummaryMeta ? <p className="mt-2 text-xs text-slate-500">{visibleSummaryMeta}</p> : null}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Per-tool recommendations</h3>
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={createShareLink}
                    disabled={shareLoading}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {shareLoading ? "Creating share link..." : "Create public share URL"}
                  </button>
                  {shareUrl ? (
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-slate-700 underline"
                    >
                      Open shared report
                    </a>
                  ) : null}
                </div>
                {shareUrl ? <p className="mt-2 break-all text-xs text-slate-600">{shareUrl}</p> : null}
                {shareMessage ? <p className="mt-2 text-xs text-slate-500">{shareMessage}</p> : null}
              </div>
              <div className="mt-4 space-y-3">
                {auditResult.items.map((item) => (
                  <article key={item.toolId} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">{item.toolName}</p>
                      <p className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        Save ${formatMoney(item.estimatedMonthlySavings)}/mo
                      </p>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Current ${formatMoney(item.currentMonthlySpend)}/mo {"->"} Recommended $
                      {formatMoney(item.recommendedMonthlySpend)}/mo
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
                  <label className="hidden">
                    Website
                    <input
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={leadForm.website}
                      onChange={(e) => setLeadForm((prev) => ({ ...prev, website: e.target.value }))}
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={leadLoading}
                  className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  {leadLoading
                    ? "Capturing..."
                    : isHighSavings
                      ? "Capture report and book consult"
                      : "Capture report"}
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
