import { useState } from "react";
import { DEFAULT_TRAITS, type AgentConfig, type PersonalityTraits, type Talkativeness } from "../domain/types";
import { useGameStore } from "../state/useGameStore";

const EMOJI_CHOICES = ["🐱","🐶","🦊","🐸","🐻","🐰","🦉","🐧","🐢","🦄","👻","🤖","🧙","🧚","🐲","🦔"];
const TALK_LABELS: Record<number, string> = { 1: "very shy", 2: "reserved", 3: "balanced", 4: "chatty", 5: "very loud" };
const PACE_LABELS: Record<number, string> = { 1: "Sleepy", 2: "Gentle", 3: "Strolling", 4: "Lively", 5: "Caffeinated" };
const NAME_POOL = ["Pip", "Mossy", "Juniper", "Clementine", "Waffles", "Bramble", "Sora", "Pebble"];
const MIN_AGENTS = 2;
const MAX_AGENTS = 6;

/** The personality sliders — each maps to behavioral phrasing in the prompt. */
const TRAITS: { key: keyof PersonalityTraits; label: string; low: string; high: string }[] = [
  { key: "warmth", label: "Warmth", low: "cold", high: "warm" },
  { key: "energy", label: "Energy", low: "calm", high: "excitable" },
  { key: "confidence", label: "Confidence", low: "timid", high: "bold" },
  { key: "agreeableness", label: "Agreeableness", low: "combative", high: "agreeable" },
  { key: "emotionality", label: "Emotionality", low: "stoic", high: "volatile" },
];

export interface LaunchConfig {
  agents: AgentConfig[];
  scenario: string;
  pace: number;
}

let draftSeq = 0;
const newId = () => `draft-${++draftSeq}-${Date.now().toString(36)}`;

function defaultDraft(existing: AgentConfig[]): AgentConfig {
  const used = existing.map((a) => a.emoji);
  return {
    id: newId(),
    name: NAME_POOL[existing.length % NAME_POOL.length],
    emoji: EMOJI_CHOICES.find((e) => !used.includes(e)) ?? "🐱",
    persona: "",
    disposition: "",
    speechStyle: "",
    likes: "",
    dislikes: "",
    traits: { ...DEFAULT_TRAITS },
    talkativeness: 3,
  };
}

/** Two pre-filled, deliberately contrasting folks (one sunny, one grumpy). */
function initialDrafts(existing: AgentConfig[]): AgentConfig[] {
  if (existing.length) return existing.map((a) => ({ ...a, traits: { ...a.traits } }));
  return [
    {
      id: newId(), name: "Pip", emoji: "🦊",
      persona: "a curious young fox who treats every small thing as a grand adventure",
      disposition: "bright, eager, and easily delighted",
      speechStyle: "fast, exclamatory, lots of questions",
      likes: "snacks, secrets, new friends", dislikes: "sitting still, silence",
      traits: { warmth: 5, energy: 5, confidence: 4, agreeableness: 4, emotionality: 4 },
      talkativeness: 4,
    },
    {
      id: newId(), name: "Mossy", emoji: "🐢",
      persona: "an old tortoise who has seen it all and is unimpressed by most of it",
      disposition: "weary, blunt, and quietly grumpy",
      speechStyle: "slow, clipped, dryly sarcastic, never gushes",
      likes: "quiet, moss, being left alone", dislikes: "noise, enthusiasm, small talk",
      traits: { warmth: 1, energy: 1, confidence: 4, agreeableness: 1, emotionality: 1 },
      talkativeness: 2,
    },
  ];
}

export function SetupScreen({ onLaunch }: { onLaunch: (config: LaunchConfig) => void }) {
  const existing = useGameStore.getState().agents;
  const [drafts, setDrafts] = useState<AgentConfig[]>(() => initialDrafts(existing));
  const [scenario, setScenario] = useState(useGameStore.getState().scenario);
  const [pace, setPace] = useState(useGameStore.getState().pace);
  const [error, setError] = useState("");

  const update = (id: string, patch: Partial<AgentConfig>) =>
    setDrafts((d) => d.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const remove = (id: string) => setDrafts((d) => d.filter((a) => a.id !== id));
  const add = () => setDrafts((d) => (d.length >= MAX_AGENTS ? d : [...d, defaultDraft(d)]));

  const launch = () => {
    if (drafts.length < MIN_AGENTS) return setError(`You need at least ${MIN_AGENTS} folks to have a conversation.`);
    if (drafts.some((a) => !a.name.trim())) return setError("Every folk needs a name.");
    setError("");
    onLaunch({ agents: drafts, scenario, pace });
  };

  return (
    <div className="scene setup">
      <div className="wrap">
        <header className="title-card">
          <div className="cloud">☁️ &nbsp;&nbsp;&nbsp; ☁️</div>
          <h1 className="pixel">My Little Community</h1>
          <p>Build a few little folks, set them loose in the meadow, and watch them chat.</p>
        </header>

        <div className="settings-row">
          <div className="panel">
            <label className="fld">
              <span className="pixel">Scene / Setting (optional)</span>
              <input
                type="text"
                value={scenario}
                placeholder="gathered around a campfire planning a picnic"
                onChange={(e) => setScenario(e.target.value)}
              />
            </label>
            <label className="fld last">
              <span className="pixel">Conversation Pace</span>
              <div className="slider-row">
                <input type="range" min={1} max={5} value={pace} onChange={(e) => setPace(Number(e.target.value))} />
                <span className="talk-label">{PACE_LABELS[pace]}</span>
              </div>
            </label>
          </div>
          <div className="panel hint-panel">
            <p className="hint">Personality, disposition and the trait sliders all shape how each folk actually talks — a grumpy, cold, combative folk will <i>sound</i> that way, not chirpy.</p>
            <p className="hint">Click any folk in the meadow to watch their mood and opinions shift live.</p>
          </div>
        </div>

        <div className="agents-head">
          <h2 className="pixel">Your Little Folks</h2>
          <button className="btn pink sm" onClick={add} disabled={drafts.length >= MAX_AGENTS}>+ Add Folk</button>
        </div>

        <div className="agent-list">
          {drafts.map((a) => (
            <AgentCard key={a.id} agent={a} onChange={(p) => update(a.id, p)} onRemove={() => remove(a.id)} />
          ))}
        </div>

        <div className="start-bar">
          <div className="err">{error}</div>
          <button className="btn pink launch" onClick={launch}>▶ Send Them Into the Meadow</button>
        </div>
      </div>
    </div>
  );
}

function AgentCard({
  agent,
  onChange,
  onRemove,
}: {
  agent: AgentConfig;
  onChange: (patch: Partial<AgentConfig>) => void;
  onRemove: () => void;
}) {
  const setTrait = (key: keyof PersonalityTraits, value: number) =>
    onChange({ traits: { ...agent.traits, [key]: value } });

  return (
    <div className="panel agent-card">
      <button className="remove" title="remove" onClick={onRemove}>×</button>

      <div className="card-top">
        <label className="fld grow">
          <span className="pixel">Name</span>
          <input type="text" maxLength={18} value={agent.name} onChange={(e) => onChange({ name: e.target.value })} />
        </label>
      </div>

      <span className="pixel fld-label">Icon</span>
      <div className="emoji-picker">
        {EMOJI_CHOICES.map((e) => (
          <button key={e} className={`emoji-opt ${e === agent.emoji ? "sel" : ""}`} onClick={() => onChange({ emoji: e })}>
            {e}
          </button>
        ))}
      </div>

      <label className="fld top-gap">
        <span className="pixel">Who they are</span>
        <textarea
          rows={2}
          value={agent.persona}
          placeholder="a sleepy poet who speaks only in riddles"
          onChange={(e) => onChange({ persona: e.target.value })}
        />
      </label>

      <label className="fld">
        <span className="pixel">Disposition / baseline mood</span>
        <input
          type="text"
          value={agent.disposition}
          placeholder="anxious and easily flustered"
          onChange={(e) => onChange({ disposition: e.target.value })}
        />
      </label>

      <label className="fld">
        <span className="pixel">Speech style</span>
        <input
          type="text"
          value={agent.speechStyle}
          placeholder="terse, sarcastic, never apologizes"
          onChange={(e) => onChange({ speechStyle: e.target.value })}
        />
      </label>

      <label className="fld">
        <span className="pixel">Likes</span>
        <input type="text" value={agent.likes} placeholder="rain, puns, naps" onChange={(e) => onChange({ likes: e.target.value })} />
      </label>

      <label className="fld">
        <span className="pixel">Dislikes</span>
        <input type="text" value={agent.dislikes} placeholder="loud noises, mondays" onChange={(e) => onChange({ dislikes: e.target.value })} />
      </label>

      <span className="pixel fld-label top-gap">Personality</span>
      <div className="traits-grid">
        {TRAITS.map((t) => (
          <div className="trait" key={t.key}>
            <div className="trait-ends">
              <span className="mini">{t.low}</span>
              <span className="trait-label">{t.label}</span>
              <span className="mini">{t.high}</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={agent.traits[t.key]}
              onChange={(e) => setTrait(t.key, Number(e.target.value))}
            />
          </div>
        ))}
      </div>

      <label className="fld last top-gap">
        <span className="pixel">Talkativeness — {TALK_LABELS[agent.talkativeness]}</span>
        <div className="slider-row">
          <span className="mini">shy</span>
          <input
            type="range"
            min={1}
            max={5}
            value={agent.talkativeness}
            onChange={(e) => onChange({ talkativeness: Number(e.target.value) as Talkativeness })}
          />
          <span className="mini">loud</span>
        </div>
      </label>
    </div>
  );
}
