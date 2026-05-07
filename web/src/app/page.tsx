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

  const setUseCase = (value: UseCase) => {
    setInput((prev) => ({ ...prev, primaryUseCase: value }));
  };

  const updateTool = (toolId: ToolInput["toolId"], patch: Partial<ToolInput>) => {
    setInput((prev) => ({
      ...prev,
      tools: prev.tools.map((tool) => (tool.toolId === toolId ? { ...tool, ...patch } : tool)),
    }));
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Credex AI Spend Auditor</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Enter your current AI tooling spend to get an instant savings audit.
      </p>

      <section className="mt-8 rounded-xl border border-zinc-200 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            Team size
            <input
              type="number"
              min={1}
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={input.teamSize}
              onChange={(e) =>
                setInput((prev) => ({ ...prev, teamSize: Math.max(1, Number(e.target.value || 1)) }))
              }
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            Primary use case
            <select
              className="rounded-md border border-zinc-300 px-3 py-2"
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
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 p-5">
        <h2 className="text-lg font-medium">Tool breakdown</h2>
        <div className="mt-4 space-y-4">
          {TOOL_CATALOG.map((tool) => {
            const value = input.tools.find((item) => item.toolId === tool.id)!;
            return (
              <div key={tool.id} className="grid gap-3 rounded-lg border border-zinc-100 p-4 md:grid-cols-4">
                <div className="text-sm font-medium">{tool.label}</div>
                <select
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  value={value.planId}
                  onChange={(e) => updateTool(tool.id, { planId: e.target.value })}
                >
                  {tool.plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  placeholder="Monthly spend"
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  value={value.monthlySpend}
                  onChange={(e) => updateTool(tool.id, { monthlySpend: Math.max(0, Number(e.target.value || 0)) })}
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Seats"
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  value={value.seats}
                  onChange={(e) => updateTool(tool.id, { seats: Math.max(0, Number(e.target.value || 0)) })}
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 p-5">
        <h2 className="text-lg font-medium">Audit result</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg bg-zinc-900 p-5 text-white md:col-span-2">
            <p className="text-xs uppercase tracking-wide text-zinc-300">Potential savings</p>
            <p className="mt-2 text-4xl font-semibold">${auditResult.totalMonthlySavings}/mo</p>
            <p className="mt-1 text-zinc-300">${auditResult.totalAnnualSavings}/year</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Lead tier</p>
            <p className="text-2xl font-semibold capitalize">{auditResult.leadTier}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Savings quality</p>
            <p className="text-lg font-semibold">
              {isHighSavings
                ? "High-impact optimization found"
                : isLowOrOptimal
                  ? "Current stack is mostly optimized"
                  : "Meaningful optimizations available"}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4">
          {isHighSavings ? (
            <div>
              <p className="text-sm font-medium text-emerald-700">
                You could save more than $500/month. Credex can help lock in discounted infrastructure credits.
              </p>
              <button className="mt-3 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
                Book Credex consultation
              </button>
            </div>
          ) : isLowOrOptimal ? (
            <p className="text-sm text-zinc-700">
              You are spending well for your current setup. We do not manufacture savings - opt in below to get
              notified when new optimizations apply.
            </p>
          ) : (
            <p className="text-sm text-zinc-700">
              Your stack has clear savings opportunities. Capture this report and we will send your audit summary.
            </p>
          )}
        </div>

        <div className="mt-5 space-y-3">
          {auditResult.items.map((item) => (
            <div key={item.toolId} className="rounded-lg border border-zinc-100 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{item.toolName}</p>
                <p className="text-sm text-emerald-700">Potential savings: ${item.estimatedMonthlySavings}/mo</p>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Current spend ${item.currentMonthlySpend}/mo {"->"} recommended spend $
                {item.recommendedMonthlySpend}/mo
              </p>
              <p className="mt-1 text-sm">{item.recommendedAction}</p>
              <p className="mt-1 text-xs text-zinc-600">{item.reason}</p>
              <p className="mt-1 text-xs text-zinc-500">{item.rationale}</p>
            </div>
          ))}
        </div>

        <form onSubmit={submitLead} className="mt-6 rounded-lg border border-zinc-200 p-4">
          <h3 className="text-sm font-semibold">
            {hasMeaningfulSavings ? "Email me this report" : "Notify me about future optimizations"}
          </h3>
          <p className="mt-1 text-xs text-zinc-600">Value is shown first; email capture is optional.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              type="email"
              placeholder="Work email *"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
              value={leadForm.email}
              onChange={(e) => setLeadForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <input
              type="text"
              placeholder="Company name (optional)"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
              value={leadForm.companyName}
              onChange={(e) => setLeadForm((prev) => ({ ...prev, companyName: e.target.value }))}
            />
            <input
              type="text"
              placeholder="Role (optional)"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
              value={leadForm.role}
              onChange={(e) => setLeadForm((prev) => ({ ...prev, role: e.target.value }))}
            />
            <input
              type="number"
              min={1}
              placeholder="Team size (optional)"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
              value={leadForm.teamSize}
              onChange={(e) => setLeadForm((prev) => ({ ...prev, teamSize: e.target.value }))}
            />
          </div>
          <button type="submit" className="mt-3 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
            {isHighSavings ? "Capture report and book consult" : "Capture report"}
          </button>
          {leadMessage ? <p className="mt-2 text-xs text-zinc-600">{leadMessage}</p> : null}
        </form>
      </section>
    </main>
  );
}
