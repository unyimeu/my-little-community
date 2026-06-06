import { useGameStore } from "../state/useGameStore";
import { useEngine } from "../state/engineContext";

export function ControlBar() {
  const phase = useGameStore((s) => s.phase);
  const thinkingId = useGameStore((s) => s.thinkingId);
  const { engine } = useEngine();

  const statusText =
    phase === "paused" ? "Paused" : phase === "ended" ? "Ended" : thinkingId ? "Thinking…" : "Playing";
  const dotClass = phase === "paused" ? "paused" : thinkingId ? "thinking" : "";

  return (
    <div className="panel controls">
      <div className="status pixel">
        <span className={`dot ${dotClass}`}>●</span> {statusText}
      </div>

      {phase === "paused" ? (
        <button className="btn blue sm" onClick={() => engine.resume()}>▶ Resume</button>
      ) : (
        <button className="btn blue sm" onClick={() => engine.pause()} disabled={phase === "ended"}>
          ⏸ Pause
        </button>
      )}

      <button className="btn danger sm" onClick={() => engine.end()} disabled={phase === "ended"}>
        ⏹ End
      </button>
    </div>
  );
}
