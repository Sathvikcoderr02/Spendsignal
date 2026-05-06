export type ToolId =
  | "cursor"
  | "github-copilot"
  | "claude"
  | "chatgpt"
  | "anthropic-api"
  | "openai-api"
  | "gemini"
  | "windsurf";

export type UseCase = "coding" | "writing" | "data" | "research" | "mixed";

export interface ToolInput {
  toolId: ToolId;
  planId: string;
  monthlySpend: number;
  seats: number;
}

export interface AuditInput {
  teamSize: number;
  primaryUseCase: UseCase;
  tools: ToolInput[];
}

export interface ToolPlan {
  id: string;
  label: string;
  monthlyPerSeat: number | null;
  monthlyFlat: number | null;
  notes?: string;
}

export interface ToolCatalogEntry {
  id: ToolId;
  label: string;
  plans: ToolPlan[];
}

export interface ToolAuditResult {
  toolId: ToolId;
  toolName: string;
  currentMonthlySpend: number;
  recommendedMonthlySpend: number;
  recommendedAction: string;
  estimatedMonthlySavings: number;
  reason: string;
  rationale: string;
}

export interface AuditResult {
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  leadTier: "high" | "medium" | "low";
  items: ToolAuditResult[];
}
