import type { ToolCatalogEntry, ToolId } from "./types";

export const TOOL_CATALOG: ToolCatalogEntry[] = [
  {
    id: "cursor",
    label: "Cursor",
    plans: [
      { id: "hobby", label: "Hobby", monthlyPerSeat: 0, monthlyFlat: null },
      { id: "pro", label: "Pro", monthlyPerSeat: 20, monthlyFlat: null },
      { id: "business", label: "Business", monthlyPerSeat: 40, monthlyFlat: null },
      { id: "enterprise", label: "Enterprise", monthlyPerSeat: null, monthlyFlat: null, notes: "Custom pricing" },
    ],
  },
  {
    id: "github-copilot",
    label: "GitHub Copilot",
    plans: [
      { id: "individual", label: "Individual", monthlyPerSeat: 10, monthlyFlat: null },
      { id: "business", label: "Business", monthlyPerSeat: 19, monthlyFlat: null },
      { id: "enterprise", label: "Enterprise", monthlyPerSeat: 39, monthlyFlat: null },
    ],
  },
  {
    id: "claude",
    label: "Claude",
    plans: [
      { id: "free", label: "Free", monthlyPerSeat: 0, monthlyFlat: null },
      { id: "pro", label: "Pro", monthlyPerSeat: 20, monthlyFlat: null },
      { id: "max", label: "Max", monthlyPerSeat: 100, monthlyFlat: null },
      { id: "team", label: "Team", monthlyPerSeat: 30, monthlyFlat: null },
      { id: "enterprise", label: "Enterprise", monthlyPerSeat: null, monthlyFlat: null, notes: "Custom pricing" },
      { id: "api-direct", label: "API direct", monthlyPerSeat: null, monthlyFlat: null, notes: "Usage-based" },
    ],
  },
  {
    id: "chatgpt",
    label: "ChatGPT",
    plans: [
      { id: "plus", label: "Plus", monthlyPerSeat: 20, monthlyFlat: null },
      { id: "team", label: "Team", monthlyPerSeat: 30, monthlyFlat: null },
      { id: "enterprise", label: "Enterprise", monthlyPerSeat: null, monthlyFlat: null, notes: "Custom pricing" },
      { id: "api-direct", label: "API direct", monthlyPerSeat: null, monthlyFlat: null, notes: "Usage-based" },
    ],
  },
  {
    id: "anthropic-api",
    label: "Anthropic API direct",
    plans: [{ id: "api-direct", label: "API direct", monthlyPerSeat: null, monthlyFlat: null, notes: "Usage-based" }],
  },
  {
    id: "openai-api",
    label: "OpenAI API direct",
    plans: [{ id: "api-direct", label: "API direct", monthlyPerSeat: null, monthlyFlat: null, notes: "Usage-based" }],
  },
  {
    id: "gemini",
    label: "Gemini",
    plans: [
      { id: "pro", label: "Pro", monthlyPerSeat: 20, monthlyFlat: null },
      { id: "ultra", label: "Ultra", monthlyPerSeat: 250, monthlyFlat: null },
      { id: "api", label: "API", monthlyPerSeat: null, monthlyFlat: null, notes: "Usage-based" },
    ],
  },
  {
    id: "windsurf",
    label: "Windsurf",
    plans: [
      { id: "free", label: "Free", monthlyPerSeat: 0, monthlyFlat: null },
      { id: "pro", label: "Pro", monthlyPerSeat: 15, monthlyFlat: null },
      { id: "teams", label: "Teams", monthlyPerSeat: 30, monthlyFlat: null },
    ],
  },
];

export const TOOL_LABELS_BY_ID: Record<ToolId, string> = TOOL_CATALOG.reduce(
  (acc, tool) => {
    acc[tool.id] = tool.label;
    return acc;
  },
  {} as Record<ToolId, string>,
);
