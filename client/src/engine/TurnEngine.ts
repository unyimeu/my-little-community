import type { AgentConfig } from "../domain/types";

/**
 * Decides who speaks next using a "speaking pressure" model.
 *
 * Every tick, each agent accumulates pressure proportional to their
 * talkativeness (plus noise). The agent with the most pressure speaks, then
 * resets near zero. Consequences:
 *   - loud agents (high talkativeness) reach the threshold often -> dominate
 *   - shy agents build slowly but are never starved -> they eventually speak
 *   - the just-spoke agent is penalized, discouraging (not forbidding) repeats
 *
 * Pure and side-effect free apart from its own internal pressure map, with an
 * injectable rng, so its dynamics are unit-testable (see TurnEngine.test.ts).
 */
export class TurnEngine {
  private readonly pressure: Record<string, number> = {};

  constructor(
    agents: AgentConfig[],
    private readonly rng: () => number = Math.random,
  ) {
    for (const a of agents) this.pressure[a.id] = this.rng() * a.talkativeness;
  }

  /** Advance one tick and return the id of whoever speaks. */
  next(agents: AgentConfig[], lastSpeakerId: string | null): string {
    for (const a of agents) {
      const noise = 0.7 + this.rng() * 0.6; // 0.7 .. 1.3
      let gain = a.talkativeness * noise;
      if (a.id === lastSpeakerId) gain *= 0.45; // soft repeat penalty
      this.pressure[a.id] = (this.pressure[a.id] ?? 0) + gain;
    }

    let best = agents[0];
    for (const a of agents) {
      if (this.pressure[a.id] > this.pressure[best.id]) best = a;
    }

    this.pressure[best.id] = this.rng() * 0.3; // reset speaker
    return best.id;
  }
}
