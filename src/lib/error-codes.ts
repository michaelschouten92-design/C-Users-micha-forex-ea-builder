/**
 * Consistent error codes for API responses.
 * Frontend can match on `code` instead of parsing error strings.
 */
export const ErrorCode = {
  // Auth
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED",

  // Validation
  VALIDATION_FAILED: "VALIDATION_FAILED",
  INVALID_JSON: "INVALID_JSON",
  REQUEST_TOO_LARGE: "REQUEST_TOO_LARGE",

  // Rate limiting
  RATE_LIMITED: "RATE_LIMITED",

  // Resources
  NOT_FOUND: "NOT_FOUND",
  VERSION_CONFLICT: "VERSION_CONFLICT",

  // Plan limits
  PROJECT_LIMIT: "PROJECT_LIMIT",
  EXPORT_LIMIT: "EXPORT_LIMIT",
  PLAN_REQUIRED: "PLAN_REQUIRED",
  PRO_FEATURE: "PRO_FEATURE",

  // Stripe
  PRICE_NOT_CONFIGURED: "PRICE_NOT_CONFIGURED",
  NO_SUBSCRIPTION: "NO_SUBSCRIPTION",

  // Password reset
  INVALID_RESET_TOKEN: "INVALID_RESET_TOKEN",

  // Generic
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Helper to create a consistent error response body */
export function apiError(code: ErrorCode, message: string, details?: string | string[]) {
  return {
    error: message,
    code,
    ...(details ? { details } : {}),
  };
}
