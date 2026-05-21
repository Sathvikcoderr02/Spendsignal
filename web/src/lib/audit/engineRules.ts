import type { UseCase } from "./types";

/** Bump when rule constants change (used in stored pricing snapshots). */
export const AUDIT_ENGINE_RULES_VERSION = "2026-05-20-v1";

export const USE_CASE_ALT_BENCHMARK: Record<UseCase, { label: string; targetPerSeat: number }> = {
  coding: { label: "Cursor Pro or GitHub Copilot Individual", targetPerSeat: 20 },
  writing: { label: "Claude Pro", targetPerSeat: 20 },
  data: { label: "ChatGPT Team or Gemini Pro mix", targetPerSeat: 30 },
  research: { label: "Claude Pro + ChatGPT Plus blend", targetPerSeat: 20 },
  mixed: { label: "Mixed-seat stack with monthly caps", targetPerSeat: 25 },
};

export const RIGHTSIZE_PER_SEAT_TARGETS: Record<string, number> = {
  "chatgpt:team": 20,
  "claude:team": 20,
  "claude:max": 20,
  "cursor:business": 20,
  "github-copilot:business": 10,
  "gemini:ultra": 20,
  "windsurf:teams": 15,
};

export const CREDITS_DISCOUNT_MULTIPLIER = 0.8;
