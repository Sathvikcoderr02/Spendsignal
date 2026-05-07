import { NextResponse } from "next/server";
import type { AuditResult, UseCase } from "@/lib/audit/types";

type SummaryRequestBody = {
  audit: AuditResult;
  primaryUseCase: UseCase;
  teamSize: number;
};

const SYSTEM_PROMPT = `You are an AI spend optimization analyst.
Write one concise paragraph (80-120 words).
Be practical, numeric, and honest.
Do not invent products, prices, or guarantees.
If savings are low, say spend is already efficient and suggest monitoring actions.
Never mention that you are an AI model.`;

const buildUserPrompt = (body: SummaryRequestBody): string => {
  return `Create a personalized summary for this startup AI spend audit.

Team size: ${body.teamSize}
Primary use case: ${body.primaryUseCase}
Total monthly savings: $${body.audit.totalMonthlySavings}
Total annual savings: $${body.audit.totalAnnualSavings}
Lead tier: ${body.audit.leadTier}

Per tool breakdown:
${body.audit.items
  .map(
    (item) =>
      `- ${item.toolName}: current $${item.currentMonthlySpend}/mo, recommended $${item.recommendedMonthlySpend}/mo, savings $${item.estimatedMonthlySavings}/mo, action: ${item.recommendedAction}`,
  )
  .join("\n")}

Return one paragraph only.`;
};

const buildFallbackSummary = (body: SummaryRequestBody): string => {
  const total = body.audit.totalMonthlySavings;
  const annual = body.audit.totalAnnualSavings;
  const topTools = [...body.audit.items]
    .sort((a, b) => b.estimatedMonthlySavings - a.estimatedMonthlySavings)
    .slice(0, 2)
    .filter((item) => item.estimatedMonthlySavings > 0)
    .map((item) => item.toolName);

  if (total < 100) {
    return `Your current AI stack appears cost-efficient for a ${body.teamSize}-person team focused on ${body.primaryUseCase}. This audit found limited immediate savings ($${total}/month, $${annual}/year), which suggests your current plan choices are mostly right-sized. Keep monitoring seat utilization, duplicate subscriptions, and API usage spikes monthly so you can capture future optimizations when pricing or usage patterns change.`;
  }

  const toolText = topTools.length > 0 ? `The largest opportunities are in ${topTools.join(" and ")}.` : "";
  return `This audit indicates meaningful savings potential for your ${body.primaryUseCase} workflow: about $${total}/month ($${annual}/year) for a ${body.teamSize}-person team. ${toolText} The recommended actions prioritize lower-cost plans or equivalent capability through better-fit tools and credit-based purchasing where appropriate. Focus first on the highest-savings actions, then re-check spend per seat after one billing cycle to confirm the projected savings are realized.`;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SummaryRequestBody;
    const fallback = buildFallbackSummary(body);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ summary: fallback, fallbackUsed: true });
    }

    const model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: buildUserPrompt(body) }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 220,
          temperature: 0.3,
        },
      }),
    },
    );

    if (!response.ok) {
      return NextResponse.json({ summary: fallback, fallbackUsed: true });
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) {
      return NextResponse.json({ summary: fallback, fallbackUsed: true });
    }

    return NextResponse.json({ summary: text, fallbackUsed: false });
  } catch {
    return NextResponse.json(
      {
        summary:
          "Your audit summary is temporarily unavailable. Based on current inputs, prioritize the top savings actions first and recheck monthly spend after implementation.",
        fallbackUsed: true,
      },
      { status: 200 },
    );
  }
}
