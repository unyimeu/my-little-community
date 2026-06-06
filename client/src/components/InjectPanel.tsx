import { useState } from "react";
import { useGameStore } from "../state/useGameStore";
import { useEngine } from "../state/engineContext";

export function InjectPanel() {
  const phase = useGameStore((s) => s.phase);
  const { engine } = useEngine();
  const [text, setText] = useState("");

  if (phase !== "paused") return null;

  const submit = () => {
    engine.addWorldEvent(text);
    setText("");
  };

  return (
    <div className="panel inject-panel">
      <h3 className="pixel">Whisper to the world 🌬️</h3>
      <textarea
        rows={2}
        value={text}
        placeholder="a bird flew across the sky..."
        onChange={(e) => setText(e.target.value)}
      />
      <div className="inject-actions">
        <button className="btn yellow sm" onClick={submit} disabled={!text.trim()}>Add to scene</button>
        <button className="btn blue sm" onClick={() => engine.resume()}>▶ Resume</button>
      </div>
    </div>
  );
}
