import { describe, it, expect } from "vitest";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import type { Agent, GenerateRequest } from "../schema";

function makeAgent(over: Partial<Agent> = {}): Agent {
  return {
    id: "1", name: "Pip", emoji: "🦊",
    persona: "a curious optimist", disposition: "cheerful and eager", speechStyle: "quick and bubbly",
    likes: "snacks", dislikes: "boredom",
    traits: { warmth: 4, energy: 4, confidence: 3, agreeableness: 4, emotionality: 3 },
    talkativeness: 4,
    ...over,
  };
}

const grump = makeAgent({
  id: "2", name: "Mossy", disposition: "weary and blunt", persona: "", speechStyle: "",
  likes: "", dislikes: "",
  traits: { warmth: 1, energy: 2, confidence: 3, agreeableness: 1, emotionality: 1 },
  talkativeness: 2,
});

describe("buildSystemPrompt", () => {
  it("includes identity, disposition and trait-derived behavior", () => {
    const p = buildSystemPrompt(makeAgent(), [makeAgent(), grump]);
    expect(p).toContain("You are Pip");
    expect(p).toContain("curious optimist");
    expect(p).toContain("cheerful and eager");
    expect(p).toContain("The others here are: Mossy");
  });

  it("turns low traits into harsh-edged clauses", () => {
    const p = buildSystemPrompt(grump, [makeAgent(), grump]);
    expect(p).toContain("cold, distant");
    expect(p).toContain("combative");
  });

  it("always carries the anti-cheerfulness guardrail", () => {
    expect(buildSystemPrompt(makeAgent(), [makeAgent(), grump])).toContain("Do not default to cheerful");
  });
});

function req(overrides: Partial<GenerateRequest> = {}): GenerateRequest {
  return {
    speaker: makeAgent(), agents: [makeAgent(), grump], transcript: [],
    scenario: "", worldEvents: [], intrusiveThought: null,
    speakerMood: null, speakerOpinions: [], ...overrides,
  };
}

describe("buildUserPrompt", () => {
  it("opens the conversation when the transcript is empty", () => {
    expect(buildUserPrompt(req())).toContain("you naturally open the conversation");
  });

  it("respects the history window", () => {
    const transcript = Array.from({ length: 20 }, (_, i) => ({
      agentId: "2", name: "Mossy", text: `line ${i}`, ts: i,
    }));
    const out = buildUserPrompt(req({ transcript }), 5);
    expect(out).toContain("line 19");
    expect(out).not.toContain("line 14");
  });

  it("injects current mood, opinions, world events and the JSON contract", () => {
    const out = buildUserPrompt(
      req({
        worldEvents: ["a bird flew by"],
        speakerMood: { label: "grumpy", intensity: 4 },
        speakerOpinions: [{ agentId: "2", sentiment: -2, note: "too slow" }],
      }),
    );
    expect(out).toContain("a bird flew by");
    expect(out).toContain("grumpy (4/5)");
    expect(out).toContain("Mossy");
    expect(out).toContain("too slow");
    expect(out).toContain("JSON object");
    expect(out).toContain("id: 2");
  });
});
