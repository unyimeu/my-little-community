import { Router } from "express";
import {
  GenerateRequestSchema,
  ModelOutputSchema,
  type GenerateResponse,
  type Mood,
} from "../schema";
import { buildSystemPrompt, buildUserPrompt } from "../conversation/prompt";
import { type LLMProvider, ProviderError } from "../llm/provider";
import { sanitizeLine } from "../llm/openai";

const NEUTRAL_MOOD: Mood = { label: "neutral", intensity: 2 };

/** Best-effort extraction of a JSON object from model output. */
function parseJsonObject(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}

export function createGenerateRouter(provider: LLMProvider): Router {
  const router = Router();

  router.post("/generate", async (req, res, next) => {
    const parsed = GenerateRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", issues: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;
    try {
      const raw = await provider.complete({
        system: buildSystemPrompt(data.speaker, data.agents),
        user: buildUserPrompt(data),
        json: true,
      });

      const obj = parseJsonObject(raw);
      const model = obj ? ModelOutputSchema.safeParse(obj) : null;

      let body: GenerateResponse;
      if (model && model.success && model.data.line.trim()) {
        const validIds = new Set(
          data.agents.map((a) => a.id).filter((id) => id !== data.speaker.id),
        );
        body = {
          line: sanitizeLine(model.data.line),
          mood: model.data.mood ?? data.speakerMood ?? NEUTRAL_MOOD,
          opinionUpdates: model.data.opinionUpdates.filter((o) => validIds.has(o.agentId)),
        };
      } else {
        // Model ignored the JSON contract — salvage the text as a plain line.
        body = {
          line: sanitizeLine(raw),
          mood: data.speakerMood ?? NEUTRAL_MOOD,
          opinionUpdates: [],
        };
      }

      res.json(body);
    } catch (err) {
      if (err instanceof ProviderError) {
        res.status(502).json({ error: err.message, detail: err.detail });
        return;
      }
      next(err);
    }
  });

  return router;
}
