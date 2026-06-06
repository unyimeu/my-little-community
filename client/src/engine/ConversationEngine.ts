import type {
  AgentConfig,
  AgentRuntime,
  IntrusiveThought,
  Message,
  Mood,
  Opinion,
  Phase,
  TurnResult,
} from "../domain/types";
import { pickIntrusiveThought } from "../domain/intrusiveThoughts";
import { TurnEngine } from "./TurnEngine";

/** The slice of game state the engine reads and writes. */
export interface EngineSnapshot {
  agents: AgentConfig[];
  scenario: string;
  pace: number; // 1..5
  transcript: Message[];
  worldEvents: string[];
  phase: Phase;
  agentRuntime: Record<string, AgentRuntime>;
}

/** Everything the engine hands to the LLM layer for one spoken turn. */
export interface GenerateContext {
  speaker: AgentConfig;
  agents: AgentConfig[];
  transcript: Message[];
  scenario: string;
  worldEvents: string[];
  intrusiveThought: IntrusiveThought | null;
  speakerMood: Mood | null;
  speakerOpinions: Opinion[];
}

/** Context handed to the small side-model that invents an intrusive thought. */
export interface IntrusiveContext {
  target: AgentConfig;
  agents: AgentConfig[];
  transcript: Message[];
  scenario: string;
  worldEvents: string[];
}

/** UI/render callbacks. The engine fires these; it doesn't know what they do. */
export interface EngineHooks {
  onThinking(agent: AgentConfig): void;
  onIntrusiveThought(agent: AgentConfig, thought: IntrusiveThought): void;
  onWorldEvent(text: string): void;
  /** Render the spoken line; the returned promise resolves when the bubble finishes. */
  speak(agent: AgentConfig, line: string): Promise<void>;
  onError(message: string): void;
}

/** Injected dependencies — the engine's whole view of the outside world. */
export interface EnginePorts {
  getState(): EngineSnapshot;
  setState(patch: Partial<EngineSnapshot>): void;
  generate(ctx: GenerateContext): Promise<TurnResult>;
  /** Context-aware intrusive thought; may reject (engine then uses a fallback). */
  generateIntrusiveThought(ctx: IntrusiveContext): Promise<IntrusiveThought>;
  hooks: EngineHooks;
  rng?: () => number;
}

const PACE_TO_DELAY_MS: Record<number, number> = { 1: 6500, 2: 4500, 3: 3000, 4: 1800, 5: 900 };
const INTRUSIVE_CHANCE_PER_TURN = 0.28;
const NEUTRAL_MOOD: Mood = { label: "neutral", intensity: 2 };

/** Build the starting runtime: a settling-in mood and neutral opinions of everyone. */
function seedRuntime(agents: AgentConfig[]): Record<string, AgentRuntime> {
  const runtime: Record<string, AgentRuntime> = {};
  for (const a of agents) {
    const opinions: Record<string, Opinion> = {};
    for (const other of agents) {
      if (other.id === a.id) continue;
      opinions[other.id] = { agentId: other.id, sentiment: 0, note: "just met" };
    }
    runtime[a.id] = { mood: { label: "settling in", intensity: 2 }, opinions };
  }
  return runtime;
}

export class ConversationEngine {
  private turnEngine: TurnEngine | null = null;
  private lastSpeakerId: string | null = null;
  private pending: Record<string, IntrusiveThought> = {};
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** Bumped on start/end; any async turn from an older generation is discarded. */
  private generation = 0;
  private readonly rng: () => number;

  constructor(private readonly ports: EnginePorts) {
    this.rng = ports.rng ?? Math.random;
  }

  start(): void {
    const { agents } = this.ports.getState();
    this.turnEngine = new TurnEngine(agents, this.rng);
    this.lastSpeakerId = null;
    this.pending = {};
    this.generation++;
    this.ports.setState({
      phase: "playing",
      transcript: [],
      worldEvents: [],
      agentRuntime: seedRuntime(agents),
    });
    this.schedule(300);
  }

  pause(): void {
    this.ports.setState({ phase: "paused" });
    this.clearTimer();
  }

  resume(): void {
    if (this.ports.getState().phase === "ended") return;
    this.ports.setState({ phase: "playing" });
    this.schedule(200);
  }

  end(): void {
    this.generation++;
    this.ports.setState({ phase: "ended" });
    this.clearTimer();
  }

  addWorldEvent(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    const { worldEvents } = this.ports.getState();
    this.ports.setState({ worldEvents: [...worldEvents, trimmed] });
    this.ports.hooks.onWorldEvent(trimmed);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private schedule(delay: number): void {
    this.clearTimer();
    this.timer = setTimeout(() => void this.runTurn(), delay);
  }

  private async maybePlantIntrusiveThought(gen: number, state: EngineSnapshot): Promise<void> {
    if (this.rng() >= INTRUSIVE_CHANCE_PER_TURN) return;

    const target = state.agents[Math.floor(this.rng() * state.agents.length)];
    let thought: IntrusiveThought;
    try {
      thought = await this.ports.generateIntrusiveThought({
        target,
        agents: state.agents,
        transcript: state.transcript,
        scenario: state.scenario,
        worldEvents: state.worldEvents,
      });
    } catch {
      thought = pickIntrusiveThought(this.rng); // offline / failure fallback
    }
    if (gen !== this.generation) return;

    this.pending[target.id] = thought;
    this.ports.hooks.onIntrusiveThought(target, thought);
  }

  private async runTurn(): Promise<void> {
    const gen = this.generation;
    const state = this.ports.getState();
    if (state.phase !== "playing" || !this.turnEngine) return;

    await this.maybePlantIntrusiveThought(gen, state);
    if (gen !== this.generation || this.ports.getState().phase !== "playing") return;

    const speakerId = this.turnEngine.next(state.agents, this.lastSpeakerId);
    const speaker = state.agents.find((a) => a.id === speakerId);
    if (!speaker) return;
    this.lastSpeakerId = speakerId;
    this.ports.hooks.onThinking(speaker);

    const intrusiveThought = this.pending[speakerId] ?? null;
    delete this.pending[speakerId];

    const runtime = state.agentRuntime[speakerId];

    let result: TurnResult;
    try {
      result = await this.ports.generate({
        speaker,
        agents: state.agents,
        transcript: state.transcript,
        scenario: state.scenario,
        worldEvents: state.worldEvents,
        intrusiveThought,
        speakerMood: runtime?.mood ?? null,
        speakerOpinions: runtime ? Object.values(runtime.opinions) : [],
      });
    } catch (err) {
      if (gen !== this.generation) return; // superseded; stay quiet
      this.ports.hooks.onError(err instanceof Error ? err.message : String(err));
      this.pause();
      return;
    }

    if (gen !== this.generation || this.ports.getState().phase !== "playing") return;

    // Commit the spoken line AND the speaker's updated inner state together.
    const cur = this.ports.getState();
    const entry: Message = { agentId: speakerId, name: speaker.name, text: result.line, ts: Date.now() };
    const prev = cur.agentRuntime[speakerId] ?? { mood: NEUTRAL_MOOD, opinions: {} };
    const opinions = { ...prev.opinions };
    for (const o of result.opinionUpdates) opinions[o.agentId] = o;

    this.ports.setState({
      transcript: [...cur.transcript, entry],
      agentRuntime: { ...cur.agentRuntime, [speakerId]: { mood: result.mood, opinions } },
    });

    await this.ports.hooks.speak(speaker, result.line);

    if (gen === this.generation && this.ports.getState().phase === "playing") {
      this.schedule(PACE_TO_DELAY_MS[state.pace] ?? 3000);
    }
  }
}
