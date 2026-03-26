import { NextResponse } from "next/server";

/**
 * Standard paginated API response helper.
 *
 * Ensures every paginated endpoint returns the same shape:
 * ```json
 * {
 *   "data": [...],
 *   "pagination": { "page": 1, "limit": 20, "total": 142, "totalPages": 8 }
 * }
 * ```
 *
 * Usage:
 * ```ts
 * return paginatedJson(results, { page, limit, total });
 * ```
 */
export function paginatedJson<T>(
  data: T[],
  opts: { page: number; limit: number; total: number },
  status = 200
): NextResponse {
  return NextResponse.json(
    {
      data,
      pagination: {
        page: opts.page,
        limit: opts.limit,
        total: opts.total,
        totalPages: Math.ceil(opts.total / Math.max(opts.limit, 1)),
      },
    },
    { status }
  );
}

/**
 * Standard single-resource API response helper.
 *
 * Ensures every single-resource endpoint returns the same shape:
 * ```json
 * { "data": { ... } }
 * ```
 */
export function dataJson<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

/**
 * Standard success response for mutation endpoints.
 *
 * ```json
 * { "success": true, ...extra }
 * ```
 */
export function successJson(extra?: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json({ success: true, ...extra }, { status });
}
