import type { GenerateContext } from "../engine/ConversationEngine";
import type { TurnResult } from "../domain/types";

/**
 * Calls the backend proxy. The frontend never sees the OpenAI key or talks to
 * OpenAI directly — it only knows about its own /api/generate endpoint, which
 * returns the spoken line plus the speaker's updated mood and opinion shifts.
 */
export async function generateLine(ctx: GenerateContext, signal?: AbortSignal): Promise<TurnResult> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify(ctx),
  });

  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(detail?.error ?? `Request failed (${res.status})`);
  }

  return (await res.json()) as TurnResult;
}
