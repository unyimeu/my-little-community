import type { IntrusiveContext } from "../engine/ConversationEngine";
import type { IntrusiveThought } from "../domain/types";

/**
 * Asks the backend's small side-model for a context-aware intrusive thought.
 * Throws on failure so the engine can fall back to its built-in list.
 */
export async function generateIntrusiveThought(ctx: IntrusiveContext): Promise<IntrusiveThought> {
  const res = await fetch("/api/intrusive", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ctx),
  });

  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(detail?.error ?? `Request failed (${res.status})`);
  }

  return (await res.json()) as IntrusiveThought;
}
