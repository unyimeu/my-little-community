import { z } from "zod";

/**
 * The request/response contract for POST /api/generate.
 * zod is the single source of truth: it validates incoming JSON and produces
 * the TypeScript types via z.infer, so the two can't drift.
 *
 * Several fields use .catch() so a slightly malformed model output (the model
 * returns this structure too, via JSON mode) degrades gracefully instead of
 * 500-ing the whole turn.
 */

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

const intensityField = z.coerce.number().catch(3).transform((n) => clamp(Math.round(n), 1, 5));
const sentimentField = z.coerce.number().catch(0).transform((n) => clamp(Math.round(n), -3, 3));

export const TalkativenessSchema = z.coerce.number().int().min(1).max(5);

const traitField = z.coerce.number().catch(3).transform((n) => clamp(Math.round(n), 1, 5));

export const TraitsSchema = z.object({
  warmth: traitField,
  energy: traitField,
  confidence: traitField,
  agreeableness: traitField,
  emotionality: traitField,
});

export const AgentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  emoji: z.string().min(1),
  persona: z.string().default(""),
  disposition: z.string().default(""),
  speechStyle: z.string().default(""),
  likes: z.string().default(""),
  dislikes: z.string().default(""),
  traits: TraitsSchema.default({ warmth: 3, energy: 3, confidence: 3, agreeableness: 3, emotionality: 3 }),
  talkativeness: TalkativenessSchema,
});

export const MoodSchema = z.object({
  label: z.string().min(1).catch("neutral"),
  intensity: intensityField,
});

export const OpinionSchema = z.object({
  agentId: z.string(),
  sentiment: sentimentField,
  note: z.string().catch("").default(""),
});

export const MessageSchema = z.object({
  agentId: z.string(),
  name: z.string(),
  text: z.string(),
  ts: z.number(),
});

export const IntrusiveThoughtSchema = z.object({
  tag: z.string().catch("stray").default("stray"),
  text: z.string(),
});

export const GenerateRequestSchema = z.object({
  speaker: AgentSchema,
  agents: z.array(AgentSchema).min(1),
  transcript: z.array(MessageSchema),
  scenario: z.string().default(""),
  worldEvents: z.array(z.string()).default([]),
  intrusiveThought: IntrusiveThoughtSchema.nullable().default(null),
  speakerMood: MoodSchema.nullable().default(null),
  speakerOpinions: z.array(OpinionSchema).default([]),
});

/** Context sent to the small model that invents a single intrusive thought. */
export const IntrusiveRequestSchema = z.object({
  target: AgentSchema,
  agents: z.array(AgentSchema).min(1),
  transcript: z.array(MessageSchema),
  scenario: z.string().default(""),
  worldEvents: z.array(z.string()).default([]),
});

/** The shape we ask the model to emit (and then re-validate before trusting). */
export const ModelOutputSchema = z.object({
  line: z.string().catch(""),
  mood: MoodSchema.optional(),
  opinionUpdates: z.array(OpinionSchema).catch([]).default([]),
});

export type Traits = z.infer<typeof TraitsSchema>;
export type Agent = z.infer<typeof AgentSchema>;
export type Mood = z.infer<typeof MoodSchema>;
export type Opinion = z.infer<typeof OpinionSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type IntrusiveThought = z.infer<typeof IntrusiveThoughtSchema>;
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
export type IntrusiveRequest = z.infer<typeof IntrusiveRequestSchema>;
export type ModelOutput = z.infer<typeof ModelOutputSchema>;

export interface GenerateResponse {
  line: string;
  mood: Mood;
  opinionUpdates: Opinion[];
}
