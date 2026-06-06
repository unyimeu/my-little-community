import type { Agent, GenerateRequest, Opinion } from "../schema";

/** How many past lines a speaker is shown. Keeps prompts bounded + cheap. */
export const HISTORY_WINDOW = 12;

const TALKATIVENESS_DESCRIPTION: Record<number, string> = {
  1: "very shy — you mostly listen and speak briefly and only occasionally",
  2: "somewhat reserved and soft-spoken",
  3: "balanced — you speak about as much as anyone",
  4: "fairly chatty and outgoing",
  5: "very loud and talkative — you love talking and often steer things",
};

/** Map each non-neutral trait value to a vivid behavioral clause. */
const TRAIT_PHRASES: Record<keyof Agent["traits"], Record<number, string>> = {
  warmth: {
    1: "cold, distant, and unaffectionate",
    2: "a little reserved and standoffish",
    4: "warm and friendly",
    5: "extremely warm, affectionate, and openly caring",
  },
  energy: {
    1: "low-energy, languid, and slow to react",
    2: "fairly mellow and unhurried",
    4: "energetic and lively",
    5: "hyper, restless, and intense",
  },
  confidence: {
    1: "timid, hesitant, and full of self-doubt",
    2: "somewhat unsure of yourself",
    4: "confident and self-assured",
    5: "bold, brash, and supremely sure of yourself",
  },
  agreeableness: {
    1: "combative, contrarian, and quick to argue",
    2: "a bit prickly and skeptical of others",
    4: "agreeable and easygoing",
    5: "deeply accommodating, almost to a fault",
  },
  emotionality: {
    1: "emotionally flat, stoic, and very hard to ruffle",
    2: "fairly even-keeled",
    4: "emotionally expressive and easily moved",
    5: "volatile and dramatic, swinging quickly between feelings",
  },
};

function traitClauses(traits: Agent["traits"]): string[] {
  const out: string[] = [];
  (Object.keys(TRAIT_PHRASES) as Array<keyof Agent["traits"]>).forEach((key) => {
    const phrase = TRAIT_PHRASES[key][traits[key]];
    if (phrase) out.push(phrase);
  });
  return out;
}

function sentimentWord(sentiment: number): string {
  if (sentiment <= -3) return "you actively dislike / resent them";
  if (sentiment === -2) return "you dislike them";
  if (sentiment === -1) return "you're wary of them";
  if (sentiment === 0) return "you feel neutral about them";
  if (sentiment === 1) return "you rather like them";
  if (sentiment === 2) return "you're fond of them";
  return "you adore them";
}

export function buildSystemPrompt(speaker: Agent, agents: Agent[]): string {
  const others =
    agents
      .filter((a) => a.id !== speaker.id)
      .map((a) => a.name)
      .join(", ") || "no one yet";

  const traits = traitClauses(speaker.traits);

  return [
    `You are ${speaker.name}, a character hanging out with others in a virtual meadow. Stay fully and consistently in character at all times.`,
    speaker.persona && `Who you are: ${speaker.persona}`,
    speaker.disposition && `Your baseline disposition: ${speaker.disposition}.`,
    traits.length && `Your nature: you are ${traits.join("; ")}.`,
    speaker.speechStyle && `How you talk: ${speaker.speechStyle}.`,
    speaker.likes && `You like: ${speaker.likes}.`,
    speaker.dislikes && `You dislike: ${speaker.dislikes}.`,
    `Temperament: ${TALKATIVENESS_DESCRIPTION[speaker.talkativeness]}.`,
    `The others here are: ${others}.`,
    // The anti-cheerfulness guardrail — the heart of "follow their personality".
    `IMPORTANT: Do not default to cheerful, bubbly, or polite. Express your ACTUAL temperament and current mood, even if that means being curt, sarcastic, gloomy, irritable, anxious, arrogant, cold, or hostile. A grumpy character sounds grumpy; a shy one barely speaks; a mean one is unkind. Never sand off your edges to be nice.`,
    `Speak only as ${speaker.name}, in a single short spoken line (1-2 sentences) reacting to what was just said. No quotation marks, no name prefix, never mention being an AI.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildUserPrompt(req: GenerateRequest, historyWindow = HISTORY_WINDOW): string {
  const { speaker, agents, transcript, scenario, worldEvents, intrusiveThought, speakerMood, speakerOpinions } = req;
  const nameOf = (id: string) => agents.find((a) => a.id === id)?.name ?? "someone";
  const lines: string[] = [];

  if (scenario) lines.push(`The setting: ${scenario}.`);

  const recent = transcript.slice(-historyWindow);
  if (recent.length === 0) {
    lines.push("No one has spoken yet — you naturally open the conversation, in your own voice.");
  } else {
    lines.push("Recent conversation:");
    for (const m of recent) lines.push(`${m.name}: ${m.text}`);
  }

  const events = worldEvents.slice(-3);
  if (events.length) lines.push(`Things happening around you: ${events.join("; ")}.`);

  if (speakerMood) {
    lines.push(`Right now you feel ${speakerMood.label} (${speakerMood.intensity}/5). Let this clearly color how you speak.`);
  }

  const opinions = speakerOpinions.filter((o: Opinion) => o.agentId !== speaker.id && o.sentiment !== 0);
  if (opinions.length) {
    lines.push("Your current feelings about the others:");
    for (const o of opinions) {
      lines.push(`- ${nameOf(o.agentId)}: ${sentimentWord(o.sentiment)}${o.note ? ` (${o.note})` : ""}.`);
    }
  }

  if (intrusiveThought) {
    lines.push(
      `(Private — no one else knows this) An intrusive thought crosses your mind: ${intrusiveThought.text}. ` +
        `You may subtly act on it or ignore it; don't announce that it's intrusive.`,
    );
  }

  const roster = agents
    .filter((a) => a.id !== speaker.id)
    .map((a) => `${a.name} (id: ${a.id})`)
    .join(", ");

  lines.push("");
  lines.push(
    `Respond with ONLY a JSON object (no markdown, no extra text) of exactly this shape:`,
  );
  lines.push(
    `{"line": "<what you say out loud, in character>", "mood": {"label": "<one or two words for how you feel now>", "intensity": <1-5>}, "opinionUpdates": [{"agentId": "<id from the roster>", "sentiment": <-3 to 3>, "note": "<short reason>"}]}`,
  );
  lines.push(
    `"opinionUpdates" should contain an entry only for an agent whose conversation just shifted how you feel about them; otherwise use an empty array. Roster for ids: ${roster || "(none)"}.`,
  );

  return lines.join("\n");
}
