/** Shared domain vocabulary for the client. */

export type Talkativeness = 1 | 2 | 3 | 4 | 5;

/** 1..5 personality sliders that mechanically shape how an agent speaks. */
export interface PersonalityTraits {
  warmth: number;
  energy: number;
  confidence: number;
  agreeableness: number;
  emotionality: number;
}

export interface AgentConfig {
  id: string;
  name: string;
  emoji: string;
  persona: string;
  /** Baseline emotional tone, e.g. "weary and blunt". */
  disposition: string;
  /** How they talk, e.g. "clipped sentences, never apologizes". */
  speechStyle: string;
  likes: string;
  dislikes: string;
  traits: PersonalityTraits;
  talkativeness: Talkativeness;
}

export interface Message {
  agentId: string;
  name: string;
  text: string;
  ts: number;
}

export interface IntrusiveThought {
  tag: string;
  text: string;
}

/** An agent's current felt state. */
export interface Mood {
  label: string;
  intensity: number; // 1..5
}

/** How one agent currently feels about another. */
export interface Opinion {
  agentId: string;
  sentiment: number; // -3 (hostile) .. +3 (adore)
  note: string;
}

/** Per-agent runtime state that evolves over the conversation. */
export interface AgentRuntime {
  mood: Mood;
  opinions: Record<string, Opinion>; // keyed by the OTHER agent's id
}

/** What a single turn produces (line + the speaker's updated inner state). */
export interface TurnResult {
  line: string;
  mood: Mood;
  opinionUpdates: Opinion[];
}

export type Phase = "setup" | "playing" | "paused" | "ended";

export const DEFAULT_TRAITS: PersonalityTraits = {
  warmth: 3,
  energy: 3,
  confidence: 3,
  agreeableness: 3,
  emotionality: 3,
};
