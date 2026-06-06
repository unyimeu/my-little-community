import { createContext, useContext, useMemo, useRef, type ReactNode } from "react";
import { ConversationEngine, type EngineHooks, type EnginePorts } from "../engine/ConversationEngine";
import { generateLine } from "../api/generateClient";
import { generateIntrusiveThought } from "../api/intrusiveClient";
import { useGameStore } from "./useGameStore";

interface EngineContextValue {
  engine: ConversationEngine;
  /** Called by the speech bubble once its typewriter animation completes. */
  completeSpeak(turnId: number): void;
}

const EngineContext = createContext<EngineContextValue | null>(null);

let puffSeq = 0;

export function EngineProvider({ children }: { children: ReactNode }) {
  const turnSeq = useRef(0);
  const resolvers = useRef(new Map<number, () => void>());

  const value = useMemo<EngineContextValue>(() => {
    const set = useGameStore.setState;
    const get = useGameStore.getState;

    const hooks: EngineHooks = {
      onThinking: (agent) => set({ thinkingId: agent.id, error: null }),

      onIntrusiveThought: (agent, thought) => {
        const id = ++puffSeq;
        set({ puffs: [...get().puffs, { id, agentId: agent.id, text: thought.text }] });
        setTimeout(() => set({ puffs: get().puffs.filter((p) => p.id !== id) }), 2700);
      },

      onWorldEvent: (text) => {
        set({ worldBanner: text });
        setTimeout(() => {
          if (get().worldBanner === text) set({ worldBanner: null });
        }, 6000);
      },

      speak: (agent, line) =>
        new Promise<void>((resolve) => {
          const turnId = ++turnSeq.current;
          resolvers.current.set(turnId, resolve);
          set({ thinkingId: null, speaking: { turnId, agentId: agent.id, text: line } });
        }),

      onError: (message) => set({ error: message, thinkingId: null }),
    };

    const ports: EnginePorts = {
      getState: () => {
        const s = get();
        return {
          agents: s.agents,
          scenario: s.scenario,
          pace: s.pace,
          transcript: s.transcript,
          worldEvents: s.worldEvents,
          phase: s.phase,
          agentRuntime: s.agentRuntime,
        };
      },
      setState: (patch) => set(patch),
      generate: (ctx) => generateLine(ctx),
      generateIntrusiveThought: (ctx) => generateIntrusiveThought(ctx),
      hooks,
    };

    const engine = new ConversationEngine(ports);

    const completeSpeak = (turnId: number) => {
      const resolve = resolvers.current.get(turnId);
      if (!resolve) return;
      resolvers.current.delete(turnId);
      set({ speaking: null });
      resolve();
    };

    return { engine, completeSpeak };
  }, []);

  return <EngineContext.Provider value={value}>{children}</EngineContext.Provider>;
}

export function useEngine(): EngineContextValue {
  const ctx = useContext(EngineContext);
  if (!ctx) throw new Error("useEngine must be used within an EngineProvider");
  return ctx;
}
