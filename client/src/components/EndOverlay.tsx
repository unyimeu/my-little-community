import { useGameStore } from "../state/useGameStore";
import { useEngine } from "../state/engineContext";

export function EndOverlay() {
  const phase = useGameStore((s) => s.phase);
  const { engine } = useEngine();

  if (phase !== "ended") return null;

  return (
    <div className="overlay">
      <div className="panel modal">
        <h2 className="pixel">The meadow grows quiet…</h2>
        <p>That conversation has ended. What next?</p>
        <div className="modal-btns">
          <button className="btn pink" onClick={() => engine.start()}>↻ New chat, same folks</button>
          <button className="btn yellow" onClick={() => useGameStore.setState({ phase: "setup" })}>
            ✎ Edit the folks
          </button>
        </div>
      </div>
    </div>
  );
}
