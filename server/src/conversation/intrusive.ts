import type { IntrusiveRequest } from "../schema";

/**
 * Prompt for the small side-model that invents a single, context-aware
 * intrusive thought (instead of pulling from a fixed list). Kept separate from
 * the main conversation prompt so the two can evolve independently.
 */

export const INTRUSIVE_HISTORY_WINDOW = 6;

export function buildIntrusiveSystemPrompt(): string {
  return [
    "You invent a single private 'intrusive thought' for a character in a lighthearted social simulation set in a sunny meadow.",
    "An intrusive thought is a sudden, involuntary impulse or stray idea that pops into someone's head — it can be funny, awkward, random, affectionate, mischievous, anxious, petty, smug, or oddly philosophical.",
    "It must connect to what is currently happening or to this character specifically, but be a slight tangent or impulse rather than a summary of the conversation.",
    "Keep it short and phrase it as a private nudge addressed to the character (\"you suddenly...\").",
  ].join(" ");
}

export function buildIntrusiveUserPrompt(req: IntrusiveRequest, historyWindow = INTRUSIVE_HISTORY_WINDOW): string {
  const { target, transcript, scenario, worldEvents } = req;
  const lines: string[] = [];

  lines.push(`The character is ${target.name}${target.persona ? `, ${target.persona}` : ""}.`);
  if (target.disposition) lines.push(`Their disposition: ${target.disposition}.`);
  if (scenario) lines.push(`Setting: ${scenario}.`);

  const recent = transcript.slice(-historyWindow);
  if (recent.length) {
    lines.push("Recent conversation:");
    for (const m of recent) lines.push(`${m.name}: ${m.text}`);
  } else {
    lines.push("The conversation hasn't really started yet.");
  }

  const events = worldEvents.slice(-3);
  if (events.length) lines.push(`Things happening around them: ${events.join("; ")}.`);

  lines.push("");
  lines.push(
    `Respond with ONLY a JSON object: {"tag": "<one-word category, e.g. romance, joke, random, anxious, petty, deep>", "text": "<the intrusive thought addressed to them as 'you...', max 18 words>"}.`,
  );
  return lines.join("\n");
}
