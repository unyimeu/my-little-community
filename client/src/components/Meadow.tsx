import { useMemo } from "react";
import { useGameStore } from "../state/useGameStore";
import { meadowLayout } from "../domain/layout";
import { AgentSprite } from "./AgentSprite";
import { SpeechBubble } from "./SpeechBubble";

const CLOUDS = ["☁️", "🐦", "☁️", "🦋"];

export function Meadow() {
  const agents = useGameStore((s) => s.agents);
  const thinkingId = useGameStore((s) => s.thinkingId);
  const speaking = useGameStore((s) => s.speaking);
  const puffs = useGameStore((s) => s.puffs);
  const worldBanner = useGameStore((s) => s.worldBanner);
  const agentRuntime = useGameStore((s) => s.agentRuntime);
  const selectedAgentId = useGameStore((s) => s.selectedAgentId);

  const layout = useMemo(() => meadowLayout(agents), [agents]);
  const activeId = speaking?.agentId ?? thinkingId;
  const select = (id: string) =>
    useGameStore.setState((s) => ({ selectedAgentId: s.selectedAgentId === id ? null : id }));

  return (
    <div className="field">
      <div className="sky-deco">
        <div className="sun">☀️</div>
        {CLOUDS.map((c, i) => (
          <div
            key={i}
            className="drift"
            style={{
              top: `${8 + i * 7}%`,
              fontSize: `${28 + (i % 2) * 14}px`,
              animationDuration: `${26 + i * 9}s`,
              animationDelay: `${-i * 6}s`,
            }}
          >
            {c}
          </div>
        ))}
      </div>

      <div className="grass-stripes" />

      {worldBanner && <div className="world-event">🌬️ {worldBanner}</div>}

      {agents.map((a) => (
        <AgentSprite
          key={a.id}
          agent={a}
          pos={layout[a.id]}
          speaking={speaking?.agentId === a.id}
          dim={activeId !== null && activeId !== a.id}
          selected={selectedAgentId === a.id}
          mood={agentRuntime[a.id]?.mood}
          onSelect={select}
        />
      ))}

      {puffs.map(
        (p) =>
          layout[p.agentId] && (
            <div
              key={p.id}
              className="intrusive"
              style={{ left: `${layout[p.agentId].xPct}%`, top: `${layout[p.agentId].yPct - 9}%` }}
            >
              💭 {p.text}
            </div>
          ),
      )}

      {speaking && layout[speaking.agentId] && (
        <SpeechBubble
          key={speaking.turnId}
          turnId={speaking.turnId}
          name={agents.find((a) => a.id === speaking.agentId)?.name ?? ""}
          text={speaking.text}
          pos={layout[speaking.agentId]}
        />
      )}
    </div>
  );
}
