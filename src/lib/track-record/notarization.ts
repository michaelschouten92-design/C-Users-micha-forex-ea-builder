/**
 * Remote Notarization Interface (Plugin, Optional)
 *
 * Provides a pluggable interface for periodically notarizing checkpoint hashes
 * with an external timestamping service. This achieves Level 3 verification:
 * a third party can prove that a certain state existed at a certain time,
 * even if the AlgoStudio server is compromised.
 *
 * IMPORTANT: The core system is fully standalone. Notarization is an optional
 * enhancement that adds external timestamped proof. Without it, Level 1
 * (ledger integrity) and Level 2 (broker corroboration) still work.
 *
 * Supported notarization approaches:
 * 1. RFC 3161 Timestamping Authority (TSA) — standard, widely available
 * 2. OpenTimestamps (Bitcoin-anchored) — decentralized, censorship-resistant
 * 3. Custom webhook — user provides their own notarization endpoint
 *
 * This file defines the interface. Actual provider implementations are separate.
 */

import type { NotarizationProvider, NotarizationReceipt } from "./types";

// ============================================
// PROVIDER REGISTRY
// ============================================

const providers = new Map<string, NotarizationProvider>();

export function registerNotarizationProvider(provider: NotarizationProvider): void {
  providers.set(provider.name, provider);
}

export function getNotarizationProvider(name: string): NotarizationProvider | undefined {
  return providers.get(name);
}

export function listProviders(): string[] {
  return Array.from(providers.keys());
}

// ============================================
// NOTARIZE & VERIFY
// ============================================

/**
 * Notarize a hash with the specified provider (or first available).
 */
export async function notarizeHash(
  hash: string,
  providerName?: string
): Promise<NotarizationReceipt | null> {
  const provider = providerName ? providers.get(providerName) : providers.values().next().value;

  if (!provider) return null;

  return provider.notarize(hash);
}

/**
 * Verify a notarization receipt.
 */
export async function verifyNotarization(receipt: NotarizationReceipt): Promise<boolean> {
  const provider = providers.get(receipt.provider);
  if (!provider) return false;
  return provider.verify(receipt);
}

// ============================================
// WEBHOOK PROVIDER (built-in, simple)
// ============================================

/**
 * Simple webhook-based notarization provider.
 * Sends a hash to a user-configured URL and stores the response.
 */
export class WebhookNotarizationProvider implements NotarizationProvider {
  name = "webhook";
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async notarize(hash: string): Promise<NotarizationReceipt> {
    const timestamp = new Date().toISOString();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash, timestamp, type: "track_record_checkpoint" }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const body = await res.text();

      return {
        provider: this.name,
        hash,
        timestamp,
        proof: body,
      };
    } catch {
      return {
        provider: this.name,
        hash,
        timestamp,
        proof: "WEBHOOK_FAILED",
      };
    }
  }

  async verify(receipt: NotarizationReceipt): Promise<boolean> {
    // Webhook notarization relies on the receiver storing the proof
    return receipt.proof !== "WEBHOOK_FAILED" && receipt.proof.length > 0;
  }
}
