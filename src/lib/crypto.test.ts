import { describe, it, expect, vi, beforeEach } from "vitest";

// Set up env before importing
beforeEach(() => {
  vi.stubEnv("AUTH_SECRET", "test-secret-that-is-at-least-32-characters-long");
  vi.stubEnv("ENCRYPTION_SALT", "test-encryption-salt-value");
});

describe("crypto", () => {
  it("encrypts and decrypts a string correctly", async () => {
    const { encrypt, decrypt } = await import("./crypto");
    const plaintext = "sensitive-data-here";
    const encrypted = encrypt(plaintext);

    expect(encrypted).not.toBe(plaintext);
    expect(encrypted.length).toBeGreaterThan(0);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertext for the same plaintext (random IV)", async () => {
    const { encrypt } = await import("./crypto");
    const plaintext = "same-data";
    const encrypted1 = encrypt(plaintext);
    const encrypted2 = encrypt(plaintext);

    expect(encrypted1).not.toBe(encrypted2);
  });

  it("returns null for corrupted encrypted data", async () => {
    const { decrypt } = await import("./crypto");
    expect(decrypt("not-valid-base64!!!")).toBeNull();
    expect(decrypt("")).toBeNull();
    expect(decrypt("dG9vc2hvcnQ=")).toBeNull(); // too short
  });

  it("detects encrypted values correctly", async () => {
    const { encrypt, isEncrypted } = await import("./crypto");
    const encrypted = encrypt("test");
    expect(isEncrypted(encrypted)).toBe(true);
    expect(isEncrypted("plaintext")).toBe(false);
    expect(isEncrypted("")).toBe(false);
  });

  it("handles empty string encryption", async () => {
    const { encrypt, decrypt } = await import("./crypto");
    const encrypted = encrypt("");
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe("");
  });

  it("handles unicode content", async () => {
    const { encrypt, decrypt } = await import("./crypto");
    const plaintext = "Héllo Wörld 日本語 🎉";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });
});
