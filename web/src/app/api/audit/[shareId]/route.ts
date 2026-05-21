import { NextResponse } from "next/server";
import { toStoredAuditResponse, type StoredPublicAuditRow } from "@/lib/audit/storedAudit";
import { getSupabaseAdminClient } from "@/lib/server/supabaseAdmin";

export async function GET(
  _request: Request,
  context: { params: Promise<{ shareId: string }> },
) {
  try {
    const { shareId } = await context.params;
    if (!shareId?.trim()) {
      return NextResponse.json({ message: "Missing share ID." }, { status: 400 });
    }

    let supabase;
    try {
      supabase = getSupabaseAdminClient();
    } catch {
      return NextResponse.json(
        { message: "Audit storage is not configured. Add Supabase credentials." },
        { status: 503 },
      );
    }

    const { data, error } = await supabase
      .from("public_audits")
      .select("*")
      .eq("share_id", shareId)
      .single<StoredPublicAuditRow>();

    if (error || !data) {
      return NextResponse.json({ message: "Audit not found." }, { status: 404 });
    }

    const stored = toStoredAuditResponse(data);
    if (!stored) {
      return NextResponse.json(
        {
          message:
            "Audit exists but is missing stored input or pricing snapshot. Create a new share link after running the Round 2 migration.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json(stored);
  } catch {
    return NextResponse.json({ message: "Unexpected error loading audit." }, { status: 500 });
  }
}
