import { NextResponse } from "next/server";
import { getTrustedPublicKeys } from "@/lib/track-record/manifest";

/**
 * GET /.well-known/algostudio-signing-keys.json
 *
 * Public endpoint — no authentication required.
 * Returns the current and previous signing public keys so that any third party
 * can verify an AlgoStudio report signature without contacting us.
 *
 * Response is cached for 1 hour (revalidate on key rotation by redeploying).
 */
export async function GET() {
  const keys = getTrustedPublicKeys();

  return NextResponse.json(
    {
      schemaVersion: "1.0",
      keys: keys.map((k) => ({
        publicKey: k.publicKey,
        version: k.version,
        status: k.status,
        algorithm: "Ed25519",
      })),
      updatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
