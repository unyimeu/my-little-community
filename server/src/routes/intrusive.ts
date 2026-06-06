import { Router } from "express";
import { IntrusiveRequestSchema, IntrusiveThoughtSchema, type IntrusiveThought } from "../schema";
import { buildIntrusiveSystemPrompt, buildIntrusiveUserPrompt } from "../conversation/intrusive";
import { type LLMProvider, ProviderError } from "../llm/provider";

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

/**
 * POST /api/intrusive — uses a (configurably smaller) model to generate one
 * intrusive thought tailored to the current scene. Falls back to salvaging the
 * raw text; a hard provider failure becomes a 502 (the client then drops back
 * to its built-in list).
 */
export function createIntrusiveRouter(provider: LLMProvider, model: string): Router {
  const router = Router();

  router.post("/intrusive", async (req, res, next) => {
    const parsed = IntrusiveRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", issues: parsed.error.flatten() });
      return;
    }

    try {
      const raw = await provider.complete({
        system: buildIntrusiveSystemPrompt(),
        user: buildIntrusiveUserPrompt(parsed.data),
        json: true,
        model,
        maxTokens: 80,
        temperature: 1.0,
      });

      const obj = parseJsonObject(raw);
      const out = obj ? IntrusiveThoughtSchema.safeParse(obj) : null;

      const body: IntrusiveThought =
        out && out.success && out.data.text.trim()
          ? out.data
          : { tag: "stray", text: (raw || "your mind wanders somewhere random").slice(0, 140) };

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
