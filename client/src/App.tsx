import type { AgentConfig } from "./domain/types";
import { useGameStore } from "./state/useGameStore";
import { useEngine } from "./state/engineContext";
import { SetupScreen, type LaunchConfig } from "./components/SetupScreen";
import { GameScreen } from "./components/GameScreen";

export function App() {
  const phase = useGameStore((s) => s.phase);
  const { engine } = useEngine();

  const launch = (config: LaunchConfig) => {
    const agents: AgentConfig[] = config.agents.map((a) => ({ ...a, name: a.name.trim() }));
    useGameStore.setState({
      agents,
      scenario: config.scenario.trim(),
      pace: config.pace,
      error: null,
    });
    engine.start();
  };

  return phase === "setup" ? <SetupScreen onLaunch={launch} /> : <GameScreen />;
}
