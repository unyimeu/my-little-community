import { useEffect, useRef } from "react";
import { useGameStore } from "../state/useGameStore";

export function StoryLog() {
  const transcript = useGameStore((s) => s.transcript);
  const logOpen = useGameStore((s) => s.logOpen);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Keep the newest line in view.
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript.length, logOpen]);

  if (!logOpen) {
    return (
      <button className="btn blue sm log-toggle" onClick={() => useGameStore.setState({ logOpen: true })}>
        📜 Story Log ({transcript.length})
      </button>
    );
  }

  return (
    <div className="panel log">
      <div className="log-head">
        <h3 className="pixel">📜 Story Log</h3>
        <button className="log-x" title="hide log" onClick={() => useGameStore.setState({ logOpen: false })}>
          ×
        </button>
      </div>
      <div className="log-body" ref={bodyRef}>
        {transcript.length === 0 && <div className="logline muted">The meadow is quiet… for now.</div>}
        {transcript.map((m, i) => (
          <div className="logline" key={`${m.ts}-${i}`}>
            <b>{m.name}:</b> {m.text}
          </div>
        ))}
      </div>
    </div>
  );
}
