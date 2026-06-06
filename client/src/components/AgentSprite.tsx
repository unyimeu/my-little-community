import type { AgentConfig, Mood } from "../domain/types";
import type { Point } from "../domain/layout";

interface Props {
  agent: AgentConfig;
  pos: Point;
  speaking: boolean;
  dim: boolean;
  selected: boolean;
  mood?: Mood;
  onSelect(id: string): void;
}

/** Tiny emoji for a mood's emotional valence, inferred from its label. */
function moodFace(mood?: Mood): string {
  if (!mood) return "";
  const l = mood.label.toLowerCase();
  if (/(angr|mad|furi|irrit|annoy|hostile|grump|cross)/.test(l)) return "😠";
  if (/(sad|down|gloom|miser|melanch|blue|hurt|lonely)/.test(l)) return "😔";
  if (/(anx|nerv|worri|scared|afraid|uneasy|tense)/.test(l)) return "😰";
  if (/(happy|joy|delight|cheer|excit|glad|content|warm)/.test(l)) return "😊";
  if (/(bore|tired|weary|sleep|flat|meh)/.test(l)) return "😐";
  if (/(smug|propud|confiden|amused|playful|mischiev)/.test(l)) return "😏";
  return "💬";
}

export function AgentSprite({ agent, pos, speaking, dim, selected, mood, onSelect }: Props) {
  const className = ["agent-sprite", speaking && "speaking", dim && "dim", selected && "selected"]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      style={{ left: `${pos.xPct}%`, top: `${pos.yPct}%` }}
      onClick={() => onSelect(agent.id)}
      role="button"
      title={`Inspect ${agent.name}`}
    >
      <div className="body">{agent.emoji}</div>
      <div className="base" />
      <div className="nameplate">{agent.name}</div>
      {mood && (
        <div className="mood-badge">
          {moodFace(mood)} {mood.label}
        </div>
      )}
    </div>
  );
}
