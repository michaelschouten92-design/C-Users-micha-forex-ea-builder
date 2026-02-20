import { NextRequest, NextResponse } from "next/server";
import type { ProofBundle } from "@/lib/track-record/types";
import { verifyProofBundle } from "@/lib/track-record/verifier";

// POST /api/track-record/verify-report — verify a proof bundle (public, no auth needed)
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Basic shape validation
  const bundle = body as ProofBundle;
  if (!bundle?.report?.manifest || !bundle?.report?.body || !Array.isArray(bundle?.events)) {
    return NextResponse.json(
      { error: "Invalid proof bundle: missing report, manifest, or events" },
      { status: 400 }
    );
  }

  try {
    const result = verifyProofBundle(bundle);

    return NextResponse.json({
      verified: result.verified,
      level: result.level,
      summary: result.summary,
      l1: result.l1,
      l2: result.l2,
      l3: result.l3,
    });
  } catch (error) {
    console.error("Proof bundle verification error:", error);
    return NextResponse.json(
      { error: "Verification failed due to internal error" },
      { status: 500 }
    );
  }
}
