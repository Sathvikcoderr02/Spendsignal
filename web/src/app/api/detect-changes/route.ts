import { NextResponse } from "next/server";
import { runDetectChanges } from "@/lib/reaudit/runDetectChanges";

function isAuthorized(request: Request): boolean {
  const secret = process.env.DETECT_CHANGES_SECRET ?? process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const headerSecret = request.headers.get("x-detect-changes-secret");
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  return headerSecret === secret || bearer === secret;
}

/**
 * Manual pricing-change detection (Round 2).
 * UI: /admin/reaudit or compare page button (server action).
 */
export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const url = new URL(request.url);
    const dryRun = url.searchParams.get("dryRun") === "true";
    const skipEmail = url.searchParams.get("skipEmail") === "true";

    const result = await runDetectChanges({ dryRun, skipEmail });
    if ("status" in result) {
      return NextResponse.json({ message: result.message }, { status: result.status });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ message: "Unexpected error during change detection." }, { status: 500 });
  }
}
