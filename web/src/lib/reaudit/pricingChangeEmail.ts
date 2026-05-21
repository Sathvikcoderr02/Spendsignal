import type { AuditChangePayload, PricingPlanChange, ToolRecommendationChange } from "./detectChanges";

export type AffectedAuditForEmail = {
  shareId: string;
  email: string;
  changePayload: AuditChangePayload;
};

export function groupAffectedAuditsByEmail(
  affected: AffectedAuditForEmail[],
): Map<string, AffectedAuditForEmail[]> {
  const byEmail = new Map<string, AffectedAuditForEmail[]>();

  for (const item of affected) {
    const key = item.email.trim().toLowerCase();
    const list = byEmail.get(key) ?? [];
    list.push(item);
    byEmail.set(key, list);
  }

  return byEmail;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatPerSeat(value: number | null): string {
  if (value === null) {
    return "n/a";
  }
  return `$${value}/seat`;
}

function renderPricingChangeRow(change: PricingPlanChange): string {
  if (change.previousValue === null && change.currentValue !== null) {
    return `<li><strong>${escapeHtml(change.label)}</strong> — plan added at ${formatPerSeat(change.currentValue)}</li>`;
  }
  if (change.currentValue === null && change.previousValue !== null) {
    return `<li><strong>${escapeHtml(change.label)}</strong> — plan removed (was ${formatPerSeat(change.previousValue)})</li>`;
  }
  return `<li><strong>${escapeHtml(change.label)}</strong> — ${formatPerSeat(change.previousValue)} → ${formatPerSeat(change.currentValue)}</li>`;
}

function renderToolChangeRow(change: ToolRecommendationChange): string {
  return `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${escapeHtml(change.toolName)}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${escapeHtml(change.previousAction)}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${escapeHtml(change.currentAction)}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;">$${change.previousMonthlySavings} → $${change.currentMonthlySavings}/mo</td>
    </tr>
  `;
}

function renderAuditSection(audit: AffectedAuditForEmail, appUrl: string): string {
  const { changePayload, shareId } = audit;
  const auditUrl = `${appUrl}/audit/${shareId}`;
  const delta = changePayload.resultSummary.monthlySavingsDelta;
  const deltaLabel =
    delta > 0 ? `+$${delta}/mo` : delta < 0 ? `-$${Math.abs(delta)}/mo` : "no change";

  const pricingBlock =
    changePayload.pricingChanges.length > 0
      ? `<ul style="margin:8px 0 0;padding-left:20px;">${changePayload.pricingChanges.map(renderPricingChangeRow).join("")}</ul>`
      : `<p style="margin:8px 0 0;color:#64748b;">No list-price row changes; engine or recommendation rules shifted.</p>`;

  const toolBlock =
    changePayload.toolChanges.length > 0
      ? `
        <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:13px;">
          <thead>
            <tr style="text-align:left;background:#f8fafc;">
              <th style="padding:8px;">Tool</th>
              <th style="padding:8px;">Previous</th>
              <th style="padding:8px;">New</th>
              <th style="padding:8px;">Savings</th>
            </tr>
          </thead>
          <tbody>${changePayload.toolChanges.map(renderToolChangeRow).join("")}</tbody>
        </table>
      `
      : `<p style="margin:8px 0 0;color:#64748b;">Per-tool actions unchanged.${delta !== 0 ? " Headline totals updated." : " Headline savings unchanged."}</p>`;

  const rulesLine = changePayload.engineRulesChanged
    ? changePayload.previousEngineVersion !== changePayload.currentEngineVersion
      ? `<p style="margin:8px 0 0;font-size:13px;">Audit rules version: ${escapeHtml(changePayload.previousEngineVersion)} → ${escapeHtml(changePayload.currentEngineVersion)}</p>`
      : `<p style="margin:8px 0 0;font-size:13px;">Audit rule definitions were refreshed (same version label: ${escapeHtml(changePayload.currentEngineVersion)}).</p>`
    : "";

  return `
    <section style="margin:20px 0;padding:16px;border:1px solid #e2e8f0;border-radius:12px;">
      <h3 style="margin:0 0 8px;font-size:16px;">Audit ${shareId.slice(0, 8)}…</h3>
      <p style="margin:0;font-size:22px;font-weight:700;color:#0f172a;">
        Total savings delta: <span style="color:${delta > 0 ? "#15803d" : delta < 0 ? "#b45309" : "#475569"};">${deltaLabel}</span>
      </p>
      <p style="margin:6px 0 0;font-size:14px;color:#334155;">
        Was <strong>$${changePayload.resultSummary.previousMonthlySavings}/mo</strong>
        (${changePayload.resultSummary.previousLeadTier} tier) →
        now <strong>$${changePayload.resultSummary.currentMonthlySavings}/mo</strong>
        (${changePayload.resultSummary.currentLeadTier} tier).
      </p>
      <h4 style="margin:16px 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;">Pricing inputs</h4>
      ${pricingBlock}
      ${rulesLine}
      <h4 style="margin:16px 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;">Recommendations</h4>
      ${toolBlock}
      <p style="margin:14px 0 0;">
        <a href="${auditUrl}" style="display:inline-block;padding:10px 16px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
          Re-open your audit
        </a>
      </p>
    </section>
  `;
}

export function buildConsolidatedPricingChangeEmail(params: {
  audits: AffectedAuditForEmail[];
  appUrl: string;
}): { subject: string; html: string } {
  const count = params.audits.length;
  const subject =
    count === 1
      ? "SpendSignal: AI pricing changed — your audit was updated"
      : `SpendSignal: AI pricing changed — ${count} audits updated`;

  const intro =
    count === 1
      ? "We re-ran your saved SpendSignal audit because AI tool pricing or rules changed."
      : `We re-ran ${count} of your saved SpendSignal audits in one pass because AI tool pricing or rules changed.`;

  const sections = params.audits.map((audit) => renderAuditSection(audit, params.appUrl)).join("");

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#111827;max-width:640px;">
      <h2 style="margin:0 0 8px;">Pricing update on your audit${count > 1 ? "s" : ""}</h2>
      <p style="margin:0 0 12px;">${intro}</p>
      <p style="margin:0 0 12px;font-size:14px;color:#475569;">
        Below: what changed in pricing inputs, how recommendations moved, and your savings delta.
      </p>
      ${sections}
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">
        You received one email for all affected audits on this account. Run a fresh audit anytime at SpendSignal.
      </p>
    </div>
  `;

  return { subject, html };
}
