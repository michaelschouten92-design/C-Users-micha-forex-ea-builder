import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

/**
 * Public click tracking endpoint.
 * Records a referral click for analytics. No auth required.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const ref = typeof body.ref === "string" ? body.ref.trim() : "";
    const path = typeof body.path === "string" ? body.path.slice(0, 500) : "/";

    if (!ref) {
      return new NextResponse(null, { status: 204 });
    }

    // Find partner by referral code
    const partner = await prisma.referralPartner.findFirst({
      where: {
        user: { referralCode: ref },
        status: { in: ["ACTIVE", "PENDING"] },
      },
      select: { id: true },
    });

    if (!partner) {
      return new NextResponse(null, { status: 204 }); // Silently ignore unknown codes
    }

    // Privacy-safe hashes
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    const ua = request.headers.get("user-agent") ?? "";
    const referer = request.headers.get("referer") ?? null;

    await prisma.referralClick.create({
      data: {
        partnerId: partner.id,
        landingPath: path,
        ipHash: ip ? createHash("sha256").update(ip).digest("hex") : null,
        uaHash: ua ? createHash("sha256").update(ua).digest("hex") : null,
        referer: referer?.slice(0, 500) ?? null,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 }); // Never fail visibly
  }
}
