import { create } from "zustand";
import type { AgentConfig, AgentRuntime, Message, Phase } from "../domain/types";

/** Transient render state for the currently-spoken line. */
export interface SpeakingState {
  turnId: number;
  agentId: string;
  text: string;
}

export interface Puff {
  id: number;
  agentId: string;
  text: string;
}

export interface GameState {
  // --- shared with the engine (EngineSnapshot shape) ---
  agents: AgentConfig[];
  scenario: string;
  pace: number;
  transcript: Message[];
  worldEvents: string[];
  phase: Phase;
  agentRuntime: Record<string, AgentRuntime>;

  // --- UI-only ---
  thinkingId: string | null;
  speaking: SpeakingState | null;
  puffs: Puff[];
  worldBanner: string | null;
  error: string | null;
  /** Which agent's mood/opinions panel is open (click a sprite to inspect). */
  selectedAgentId: string | null;
  /** Whether the story log panel is expanded. */
  logOpen: boolean;
}

/**
 * One vanilla store, read reactively by components via selectors and written
 * imperatively by the engine via useGameStore.setState / getState. Keeping the
 * engine off React's render cycle is what lets it stay framework-agnostic.
 */
export const useGameStore = create<GameState>(() => ({
  agents: [],
  scenario: "",
  pace: 3,
  transcript: [],
  worldEvents: [],
  phase: "setup",
  agentRuntime: {},

  thinkingId: null,
  speaking: null,
  puffs: [],
  worldBanner: null,
  error: null,
  selectedAgentId: null,
  logOpen: true,
}));
