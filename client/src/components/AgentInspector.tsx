import { useGameStore } from "../state/useGameStore";

const SENTIMENT_LABEL: Record<number, string> = {
  [-3]: "resents", [-2]: "dislikes", [-1]: "wary of", 0: "neutral on", 1: "likes", 2: "fond of", 3: "adores",
};

function sentimentClass(s: number): string {
  if (s <= -2) return "neg2";
  if (s === -1) return "neg1";
  if (s === 0) return "neu";
  if (s === 1) return "pos1";
  return "pos2";
}

/**
 * Live read-out of the clicked agent's inner state: current mood and how they
 * feel about everyone else. Updates automatically as the conversation evolves
 * (it's just a selector over the store the engine writes each turn).
 */
export function AgentInspector() {
  const selectedId = useGameStore((s) => s.selectedAgentId);
  const agents = useGameStore((s) => s.agents);
  const runtime = useGameStore((s) => s.agentRuntime);

  if (!selectedId) return null;
  const agent = agents.find((a) => a.id === selectedId);
  if (!agent) return null;

  const rt = runtime[selectedId];
  const nameOf = (id: string) => agents.find((a) => a.id === id)?.name ?? "someone";
  const opinions = rt ? Object.values(rt.opinions) : [];

  return (
    <div className="panel inspector">
      <button className="remove" title="close" onClick={() => useGameStore.setState({ selectedAgentId: null })}>
        ×
      </button>

      <div className="inspector-head">
        <span className="big-emoji">{agent.emoji}</span>
        <div>
          <h3 className="pixel">{agent.name}</h3>
          {agent.disposition && <div className="muted small">{agent.disposition}</div>}
        </div>
      </div>

      <div className="inspector-mood">
        <span className="pixel tiny">MOOD</span>
        <div className="mood-line">
          <b>{rt?.mood.label ?? "—"}</b>
          <span className="intensity">
            {"●".repeat(rt?.mood.intensity ?? 0)}
            <span className="dimdots">{"●".repeat(5 - (rt?.mood.intensity ?? 0))}</span>
          </span>
        </div>
      </div>

      <div className="inspector-ops">
        <span className="pixel tiny">FEELINGS ABOUT OTHERS</span>
        {opinions.length === 0 && <div className="muted small">No one else around.</div>}
        {opinions.map((o) => (
          <div className={`op-row ${sentimentClass(o.sentiment)}`} key={o.agentId}>
            <span className="op-name">{nameOf(o.agentId)}</span>
            <span className="op-verb">{SENTIMENT_LABEL[o.sentiment]}</span>
            {o.note && <span className="op-note">“{o.note}”</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
