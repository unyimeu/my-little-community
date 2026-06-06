import { useGameStore } from "../state/useGameStore";
import { Meadow } from "./Meadow";
import { ControlBar } from "./ControlBar";
import { InjectPanel } from "./InjectPanel";
import { StoryLog } from "./StoryLog";
import { EndOverlay } from "./EndOverlay";
import { AgentInspector } from "./AgentInspector";

export function GameScreen() {
  const error = useGameStore((s) => s.error);

  return (
    <div className="scene game">
      <Meadow />

      <AgentInspector />

      <div className="hud">
        <ControlBar />
        <InjectPanel />
        <StoryLog />
      </div>

      {error && <div className="toast">⚠ {error}</div>}

      <EndOverlay />
    </div>
  );
}
