import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────

const mockCheckAdmin = vi.fn();
vi.mock("@/lib/admin", () => ({
  checkAdmin: () => mockCheckAdmin(),
}));

const mockUserFindUnique = vi.fn();
const mockPartnerFindUnique = vi.fn();
const mockDeleteMany = vi.fn().mockResolvedValue({});
const mockUserDelete = vi.fn().mockResolvedValue({});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
    referralPartner: {
      findUnique: (...args: unknown[]) => mockPartnerFindUnique(...args),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        passwordResetToken: { deleteMany: mockDeleteMany },
        emailVerificationToken: { deleteMany: mockDeleteMany },
        auditLog: { deleteMany: mockDeleteMany },
        user: { delete: mockUserDelete },
      }),
  },
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

vi.mock("@/lib/rate-limit", () => ({
  adminMutationRateLimiter: {},
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  createRateLimitHeaders: vi.fn().mockReturnValue({}),
  formatRateLimitError: vi.fn().mockReturnValue("Rate limited"),
}));

// ─── Helpers ──────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/admin/users/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function authorizedAdmin() {
  return {
    authorized: true,
    session: { user: { id: "admin-1" } },
    adminEmail: "admin@example.com",
  };
}

// ─── Tests ────────────────────────────────────────────────────────────

describe("POST /api/admin/users/delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckAdmin.mockResolvedValue(authorizedAdmin());
    mockPartnerFindUnique.mockResolvedValue(null);
  });

  it("rejects non-admin callers", async () => {
    mockCheckAdmin.mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: "Access denied" }), { status: 403 }),
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest({ email: "victim@example.com" }));

    expect(res.status).toBe(403);
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockUserDelete).not.toHaveBeenCalled();
  });

  // ─── Referral ledger guard ─────────────────────────────────────────

  it("returns 409 when target user is a partner with earnings", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "partner@example.com",
      subscription: null,
    });
    mockPartnerFindUnique.mockResolvedValue({
      totalEarnedCents: 10000,
      ledger: [],
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest({ email: "partner@example.com" }));

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("referral partner");
    expect(mockUserDelete).not.toHaveBeenCalled();
  });

  it("returns 409 when target user is a partner with ledger entries", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "partner@example.com",
      subscription: null,
    });
    mockPartnerFindUnique.mockResolvedValue({
      totalEarnedCents: 0,
      ledger: [{ id: "ledger-1" }],
    });

    const { POST } = await import("./route");
    const res = await POST(makeRequest({ email: "partner@example.com" }));

    expect(res.status).toBe(409);
    expect(mockUserDelete).not.toHaveBeenCalled();
  });

  it("proceeds when target user has no partner records", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "regular@example.com",
      subscription: null,
    });
    mockPartnerFindUnique.mockResolvedValue(null);

    const { POST } = await import("./route");
    const res = await POST(makeRequest({ email: "regular@example.com" }));

    expect(res.status).toBe(200);
    expect(mockUserDelete).toHaveBeenCalled();
  });
});
