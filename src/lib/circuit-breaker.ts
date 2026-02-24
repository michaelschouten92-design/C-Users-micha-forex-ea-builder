/**
 * Simple circuit breaker for external service calls.
 *
 * States:
 * - CLOSED: normal operation, requests pass through
 * - OPEN: service is failing, requests are short-circuited
 * - HALF_OPEN: testing if service has recovered (single request allowed)
 */

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening the circuit (default: 5) */
  failureThreshold?: number;
  /** Milliseconds to wait in OPEN state before trying HALF_OPEN (default: 30000) */
  cooldownMs?: number;
}

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private consecutiveFailures = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;

  constructor(
    readonly name: string,
    options: CircuitBreakerOptions = {}
  ) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.cooldownMs = options.cooldownMs ?? 30_000;
  }

  /** Check if a request should be allowed through. */
  canExecute(): boolean {
    if (this.state === "CLOSED") return true;

    if (this.state === "OPEN") {
      // Check if cooldown has elapsed
      if (Date.now() - this.lastFailureTime >= this.cooldownMs) {
        this.state = "HALF_OPEN";
        return true;
      }
      return false;
    }

    // HALF_OPEN: allow one request through
    return true;
  }

  /** Record a successful call. Resets the circuit to CLOSED. */
  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = "CLOSED";
  }

  /** Record a failed call. May open the circuit. */
  recordFailure(): void {
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();

    if (this.state === "HALF_OPEN") {
      // Failed during recovery test — reopen
      this.state = "OPEN";
    } else if (this.consecutiveFailures >= this.failureThreshold) {
      this.state = "OPEN";
    }
  }

  /** Execute an async function with circuit breaker protection. */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      throw new CircuitOpenError(this.name);
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  /** Reset the circuit breaker to initial state. */
  reset(): void {
    this.state = "CLOSED";
    this.consecutiveFailures = 0;
    this.lastFailureTime = 0;
  }
}

export class CircuitOpenError extends Error {
  constructor(serviceName: string) {
    super(`Circuit breaker open for ${serviceName} — service is temporarily unavailable`);
    this.name = "CircuitOpenError";
  }
}

// Pre-configured circuit breakers for external services
export const anthropicCircuit = new CircuitBreaker("anthropic", {
  failureThreshold: 5,
  cooldownMs: 30_000,
});

export const resendCircuit = new CircuitBreaker("resend-email", {
  failureThreshold: 5,
  cooldownMs: 30_000,
});
