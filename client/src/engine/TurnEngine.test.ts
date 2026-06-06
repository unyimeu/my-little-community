import { describe, it, expect } from "vitest";
import { TurnEngine } from "./TurnEngine";
import { DEFAULT_TRAITS, type AgentConfig, type Talkativeness } from "../domain/types";

/** Small deterministic PRNG so tests don't flake. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function agent(id: string, talkativeness: Talkativeness): AgentConfig {
  return {
    id, name: id, emoji: "🙂",
    persona: "", disposition: "", speechStyle: "", likes: "", dislikes: "",
    traits: { ...DEFAULT_TRAITS },
    talkativeness,
  };
}

function run(agents: AgentConfig[], turns: number, seed = 1) {
  const engine = new TurnEngine(agents, mulberry32(seed));
  const counts: Record<string, number> = Object.fromEntries(agents.map((a) => [a.id, 0]));
  let last: string | null = null;
  let immediateRepeats = 0;
  for (let i = 0; i < turns; i++) {
    const id = engine.next(agents, last);
    counts[id]++;
    if (id === last) immediateRepeats++;
    last = id;
  }
  return { counts, immediateRepeats };
}

describe("TurnEngine", () => {
  const agents = [agent("loud", 5), agent("mid", 3), agent("shy", 1)];

  it("is deterministic for a fixed seed", () => {
    expect(run(agents, 50, 42).counts).toEqual(run(agents, 50, 42).counts);
  });

  it("lets louder agents speak more often", () => {
    const { counts } = run(agents, 1000);
    expect(counts.loud).toBeGreaterThan(counts.mid);
    expect(counts.mid).toBeGreaterThan(counts.shy);
  });

  it("never starves a shy agent", () => {
    expect(run(agents, 1000).counts.shy).toBeGreaterThan(0);
  });

  it("rarely lets the same agent speak twice in a row", () => {
    const { immediateRepeats } = run(agents, 1000);
    expect(immediateRepeats / 1000).toBeLessThan(0.15);
  });

  it("handles a single agent gracefully", () => {
    const solo = [agent("only", 3)];
    expect(run(solo, 10).counts.only).toBe(10);
  });
});
