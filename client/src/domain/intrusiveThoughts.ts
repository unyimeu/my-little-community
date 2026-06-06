import type { IntrusiveThought } from "./types";

/**
 * Private nudges occasionally whispered to a single agent. They are never
 * shown to the other agents — only to the player (as a little puff) and to
 * the target's own prompt.
 */
export const INTRUSIVE_THOUGHTS: readonly IntrusiveThought[] = [
  { tag: "romance", text: "you feel a sudden flutter of romance toward someone here" },
  { tag: "joke", text: "you have a strong urge to crack a silly joke right now" },
  { tag: "random", text: "you feel like doing or proposing something totally random" },
  { tag: "topic", text: "you really want to abruptly change the subject" },
  { tag: "deep", text: "a strangely deep, philosophical question pops into your head" },
  { tag: "memory", text: "a random old memory of yours suddenly surfaces" },
  { tag: "mischief", text: "you feel a little mischievous and want to stir the pot" },
  { tag: "kind", text: "you feel an urge to give someone an unexpected compliment" },
  { tag: "snack", text: "you suddenly, urgently want to talk about food" },
  { tag: "wonder", text: "you briefly wonder whether any of this is even real" },
  { tag: "secret", text: "you feel like sharing a small made-up secret" },
  { tag: "song", text: "a tune is stuck in your head and you want to mention it" },
];

/** rng is injectable so tests are deterministic. */
export function pickIntrusiveThought(rng: () => number = Math.random): IntrusiveThought {
  return INTRUSIVE_THOUGHTS[Math.floor(rng() * INTRUSIVE_THOUGHTS.length)];
}
