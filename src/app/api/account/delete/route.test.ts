import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
  SALT_ROUNDS: 12,
}));

const mockFindUnique = vi.fn();
const mockDeleteMany = vi.fn().mockResolvedValue({});
const mockUpdateMany = vi.fn().mockResolvedValue({});
const mockUserDelete = vi.fn().mockResolvedValue({});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => mockFindUnique(...args) },
    subscription: { findUnique: vi.fn().mockResolvedValue(null) },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        passwordResetToken: { deleteMany: mockDeleteMany },
        emailVerificationToken: { deleteMany: mockDeleteMany },
        auditLog: { deleteMany: mockDeleteMany },
        user: {
          findUnique: vi.fn().mockResolvedValue(null),
          delete: mockUserDelete,
          updateMany: mockUpdateMany,
        },
      }),
  },
}));

const mockCompare = vi.fn();
vi.mock("bcryptjs", () => ({
  default: { compare: (...args: unknown[]) => mockCompare(...args) },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/email", () => ({
  sendAccountDeletedEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/csrf", () => ({
  validateCsrfToken: () => true,
}));

vi.mock("@/lib/rate-limit", () => ({
  gdprDeleteRateLimiter: {},
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  createRateLimitHeaders: vi.fn().mockReturnValue({}),
  formatRateLimitError: vi.fn().mockReturnValue("Rate limited"),
}));

vi.mock("@/lib/validations", () => ({
  safeReadJson: async (req: Request) => ({ data: await req.json() }),
  checkContentType: () => null,
}));

// ─── Helpers ──────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/account/delete", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────

describe("DELETE /api/account/delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("succeeds with correct password and DELETE confirmation", async () => {
    mockFindUnique.mockResolvedValue({
      email: "test@example.com",
      passwordHash: "$2a$12$hashedpassword",
    });
    mockCompare.mockResolvedValue(true);

    const { DELETE } = await import("./route");
    const res = await DELETE(makeRequest({ confirm: "DELETE", password: "correct" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("returns 401 with wrong password", async () => {
    mockFindUnique.mockResolvedValue({
      email: "test@example.com",
      passwordHash: "$2a$12$hashedpassword",
    });
    mockCompare.mockResolvedValue(false);

    const { DELETE } = await import("./route");
    const res = await DELETE(makeRequest({ confirm: "DELETE", password: "wrong" }));

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain("Incorrect password");
  });

  it("succeeds for OAuth user without password", async () => {
    mockFindUnique.mockResolvedValue({
      email: "test@example.com",
      passwordHash: null,
    });

    const { DELETE } = await import("./route");
    const res = await DELETE(makeRequest({ confirm: "DELETE" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockCompare).not.toHaveBeenCalled();
  });

  it("returns 400 when confirm is missing", async () => {
    mockFindUnique.mockResolvedValue({
      email: "test@example.com",
      passwordHash: null,
    });

    const { DELETE } = await import("./route");
    const res = await DELETE(makeRequest({}));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Confirmation required");
  });

  it("returns 400 when password is missing for credential user", async () => {
    mockFindUnique.mockResolvedValue({
      email: "test@example.com",
      passwordHash: "$2a$12$hashedpassword",
    });

    const { DELETE } = await import("./route");
    const res = await DELETE(makeRequest({ confirm: "DELETE" }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Password is required");
  });
});
