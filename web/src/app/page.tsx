"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function Home() {
  const [input, setInput] = useState<AuditInput>(() => {
    if (typeof window === "undefined") {
      return defaultInput;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return defaultInput;
    }
    try {
      const parsed = JSON.parse(stored) as AuditInput;
      return parsed && Array.isArray(parsed.tools) ? parsed : defaultInput;
    } catch {
      return defaultInput;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
  }, [input]);

  const auditResult = useMemo(() => runAudit(input), [input]);

  const setUseCase = (value: UseCase) => {
    setInput((prev) => ({ ...prev, primaryUseCase: value }));
  };

  const updateTool = (toolId: ToolInput["toolId"], patch: Partial<ToolInput>) => {
    setInput((prev) => ({
      ...prev,
      tools: prev.tools.map((tool) => (tool.toolId === toolId ? { ...tool, ...patch } : tool)),
    }));
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
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg bg-zinc-50 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Monthly savings</p>
            <p className="text-2xl font-semibold">${auditResult.totalMonthlySavings}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Annual savings</p>
            <p className="text-2xl font-semibold">${auditResult.totalAnnualSavings}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Lead tier</p>
            <p className="text-2xl font-semibold capitalize">{auditResult.leadTier}</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {auditResult.items.map((item) => (
            <div key={item.toolId} className="rounded-lg border border-zinc-100 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{item.toolName}</p>
                <p className="text-sm text-emerald-700">Potential savings: ${item.estimatedMonthlySavings}/mo</p>
              </div>
              <p className="mt-1 text-sm">{item.recommendedAction}</p>
              <p className="mt-1 text-xs text-zinc-600">{item.reason}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
