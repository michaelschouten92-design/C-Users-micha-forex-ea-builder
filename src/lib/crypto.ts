/**
 * Field-level encryption for sensitive database fields (e.g., Discord access tokens).
 * Uses AES-256-GCM with a key derived from AUTH_SECRET.
 */

import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 100_000;
let cachedKey: Buffer | null = null;
let cachedPreviousKey: Buffer | null = null;
let previousKeyChecked = false;

/**
 * Derive a 256-bit key from AUTH_SECRET using PBKDF2.
 * Requires ENCRYPTION_SALT env var — no fallback to prevent use of a predictable salt.
 * The key is cached in memory to avoid repeated derivation.
 */
function getEncryptionKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET not configured for encryption");
  const salt = process.env.ENCRYPTION_SALT;
  if (!salt) {
    throw new Error(
      "ENCRYPTION_SALT environment variable is required. " +
        "Generate a random value (e.g., openssl rand -hex 32) and set it in your environment."
    );
  }
  cachedKey = pbkdf2Sync(secret, salt, PBKDF2_ITERATIONS, 32, "sha256");
  return cachedKey;
}

/**
 * Get the previous encryption key (for key rotation).
 * Returns null if ENCRYPTION_SALT_PREVIOUS is not set.
 */
function getPreviousEncryptionKey(): Buffer | null {
  if (previousKeyChecked) return cachedPreviousKey;
  previousKeyChecked = true;
  const secret = process.env.AUTH_SECRET;
  const prevSalt = process.env.ENCRYPTION_SALT_PREVIOUS;
  if (!secret || !prevSalt) return null;
  cachedPreviousKey = pbkdf2Sync(secret, prevSalt, PBKDF2_ITERATIONS, 32, "sha256");
  return cachedPreviousKey;
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
 * Tries the current key first; if it fails and ENCRYPTION_SALT_PREVIOUS is set,
 * tries the previous key (for zero-downtime key rotation).
 * Returns null if decryption fails with both keys.
 */
export function decrypt(encryptedBase64: string): string | null {
  const combined = Buffer.from(encryptedBase64, "base64");
  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) return null;

  // Try current key
  const result = decryptWithKey(combined, getEncryptionKey());
  if (result !== null) return result;

  // Try previous key for key rotation
  const prevKey = getPreviousEncryptionKey();
  if (prevKey) {
    const prevResult = decryptWithKey(combined, prevKey);
    if (prevResult !== null) {
      // Re-encrypt with current key would require the caller to save.
      // Return the decrypted value; caller should re-encrypt if persisting.
      return prevResult;
    }
  }

  return null;
}

function decryptWithKey(combined: Buffer, key: Buffer): string | null {
  try {
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
