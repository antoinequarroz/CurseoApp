export class CircuitOpenError extends Error {
  constructor(retryAfterMs) {
    super('Circuit ouvert');
    this.name = 'CircuitOpenError';
    this.retryAfterMs = retryAfterMs;
  }
}

export class CircuitBreaker {
  #failureThreshold;
  #cooldownMs;
  #now;
  #onStateChange;
  #failures = 0;
  #openUntil = 0;
  #probeInFlight = false;
  #state = 'closed';

  constructor({
    failureThreshold = 3,
    cooldownMs = 30_000,
    now = Date.now,
    onStateChange = () => {},
  } = {}) {
    if (!Number.isInteger(failureThreshold) || failureThreshold < 1) {
      throw new Error('failureThreshold invalide');
    }
    if (!Number.isFinite(cooldownMs) || cooldownMs < 1) throw new Error('cooldownMs invalide');
    if (typeof onStateChange !== 'function') throw new Error('onStateChange invalide');
    this.#failureThreshold = failureThreshold;
    this.#cooldownMs = cooldownMs;
    this.#now = now;
    this.#onStateChange = onStateChange;
  }

  #transition(nextState) {
    if (nextState === this.#state) return;
    const previousState = this.#state;
    this.#state = nextState;
    try {
      this.#onStateChange({ from: previousState, to: nextState });
    } catch {
      // L'observabilité ne doit jamais modifier la protection du fournisseur.
    }
  }

  snapshot() {
    const maintenant = this.#now();
    const state = this.#openUntil === 0
      ? 'closed'
      : maintenant < this.#openUntil
        ? 'open'
        : 'half_open';
    this.#transition(state);
    return {
      state: this.#state,
      failures: this.#failures,
      retryAfterMs: state === 'open' ? Math.max(1, this.#openUntil - maintenant) : 0,
    };
  }

  async execute(operation) {
    const avant = this.snapshot();
    if (avant.state === 'open') throw new CircuitOpenError(avant.retryAfterMs);
    if (avant.state === 'half_open' && this.#probeInFlight) {
      throw new CircuitOpenError(1_000);
    }

    const estSonde = avant.state === 'half_open';
    if (estSonde) this.#probeInFlight = true;
    try {
      const resultat = await operation();
      this.#failures = 0;
      this.#openUntil = 0;
      this.#transition('closed');
      return resultat;
    } catch (error) {
      this.#failures = estSonde ? this.#failureThreshold : this.#failures + 1;
      if (this.#failures >= this.#failureThreshold) {
        this.#openUntil = this.#now() + this.#cooldownMs;
        this.#transition('open');
      }
      throw error;
    } finally {
      if (estSonde) this.#probeInFlight = false;
    }
  }
}
