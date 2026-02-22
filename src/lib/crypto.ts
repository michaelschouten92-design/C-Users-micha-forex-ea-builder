/**
 * Field-level encryption for sensitive database fields (e.g., Discord access tokens).
 * Uses AES-256-GCM with a key derived from AUTH_SECRET.
 */

import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_FALLBACK_SALT = "algostudio-field-encryption-v1";

let cachedKey: Buffer | null = null;

/**
 * Derive a 256-bit key from AUTH_SECRET using PBKDF2.
 * Uses ENCRYPTION_SALT env var (recommended) or falls back to a static salt for backwards compatibility.
 * The key is cached in memory to avoid repeated derivation.
 */
function getEncryptionKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET not configured for encryption");
  const salt = process.env.ENCRYPTION_SALT || PBKDF2_FALLBACK_SALT;
  if (!process.env.ENCRYPTION_SALT) {
    // Log once at startup — fallback salt is less secure
    console.warn(
      "[crypto] ENCRYPTION_SALT not configured — using fallback salt. Set ENCRYPTION_SALT in env for production."
    );
  }
  cachedKey = pbkdf2Sync(secret, salt, PBKDF2_ITERATIONS, 32, "sha256");
  return cachedKey;
}

/**
 * Encrypt a plaintext string. Returns a base64 string containing IV + ciphertext + auth tag.
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Format: base64(iv + encrypted + authTag)
  const combined = Buffer.concat([iv, encrypted, authTag]);
  return combined.toString("base64");
}

/**
 * Decrypt a base64-encoded encrypted string.
 * Returns null if decryption fails (e.g., wrong key, corrupted data).
 */
export function decrypt(encryptedBase64: string): string | null {
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedBase64, "base64");

    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) return null;

    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

/**
 * Check if a string looks like an encrypted value (base64 encoded, minimum length).
 */
export function isEncrypted(value: string): boolean {
  if (value.length < 24) return false; // Too short for IV + authTag
  try {
    const buf = Buffer.from(value, "base64");
    return buf.length >= IV_LENGTH + AUTH_TAG_LENGTH && buf.toString("base64") === value;
  } catch {
    return false;
  }
}
