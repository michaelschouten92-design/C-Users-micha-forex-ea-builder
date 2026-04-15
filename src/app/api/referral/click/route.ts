import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { createHmac } from "crypto";
import { env } from "@/lib/env";
import { checkRateLimit, referralClickRateLimiter } from "@/lib/rate-limit";

/**
 * Public click tracking endpoint.
 * Records a referral click for analytics. No auth required.
 *
 * Anti-stuffing controls:
 *   - HMAC-keyed ipHash/uaHash so a partner with DB read access cannot
 *     rainbow-table their own clicks.
 *   - Per-day dedup via a unique constraint on a hashed
 *     (partnerId, ipHash, uaHash, yyyy-mm-dd) key.
 *   - In-memory IP rate limit caps the request volume per hour.
 */

function getHashSecret(): string {
  // Prefer the dedicated referral secret; fall back to the platform-wide
  // ENCRYPTION_SALT in dev so this works without extra env wiring.
  //
  // ROTATION NOTE: switching from the ENCRYPTION_SALT fallback to a
  // dedicated REFERRAL_HASH_SECRET is a one-way break. dedupKeys for
  // existing rows are computed under the old secret; rows written after
  // rotation use the new one. The unique index will not catch
  // cross-secret duplicates, so a partner could in theory get one
  // additional click row right after rotation. Worth it for the proper
  // anti-fraud secret separation. To minimise the gap, set
  // REFERRAL_HASH_SECRET before the first real partner is onboarded.
  return env.REFERRAL_HASH_SECRET ?? env.ENCRYPTION_SALT ?? "dev-only-fallback-secret";
}

function hmac(value: string): string {
  return createHmac("sha256", getHashSecret()).update(value).digest("hex");
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate-limit by IP before any DB work
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rate = await checkRateLimit(referralClickRateLimiter, `ref-click:${clientIp}`);
    if (!rate.success) {
      return new NextResponse(null, { status: 204 });
    }

    const body = await request.json();
    // referralCode is generated uppercase; normalize incoming so
    // case-sensitive Postgres lookups still match if a partner shares the
    // link with mixed casing.
    const ref = typeof body.ref === "string" ? body.ref.trim().toUpperCase() : "";
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

    const ip = clientIp === "unknown" ? "" : clientIp;
    const ua = request.headers.get("user-agent") ?? "";
    const referer = request.headers.get("referer") ?? null;

    const ipHash = ip ? hmac(`ip:${ip}`) : null;
    const uaHash = ua ? hmac(`ua:${ua}`) : null;

    // Daily dedup: one click row per (partner, ip, ua) per UTC day. Two
    // colliding inserts hit the unique index → P2002 → silently 204.
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const dedupKey = hmac(`${partner.id}|${ipHash ?? "no-ip"}|${uaHash ?? "no-ua"}|${today}`);

    try {
      await prisma.referralClick.create({
        data: {
          partnerId: partner.id,
          landingPath: path,
          ipHash,
          uaHash,
          referer: referer?.slice(0, 500) ?? null,
          dedupKey,
        },
      });
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") {
        throw err;
      }
      // Already counted today — that's the dedup working.
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 }); // Never fail visibly
  }
}
