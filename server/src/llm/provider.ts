/**
 * The provider seam. The route handler depends only on this interface, so
 * swapping OpenAI for another vendor (or adding a second one) means writing a
 * new class here — nothing in the conversation/route layers changes.
 */
export interface CompletionRequest {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  /** When true, ask the provider for a strict JSON object response. */
  json?: boolean;
  /** Optional per-call model override (e.g. a cheaper model for side tasks). */
  model?: string;
}

export interface LLMProvider {
  readonly name: string;
  /** Returns the raw model content (already a JSON string when json:true). */
  complete(req: CompletionRequest): Promise<string>;
}

/** Thrown for upstream/provider failures so the route can map them to a 502. */
export class ProviderError extends Error {
  constructor(message: string, public readonly detail?: string) {
    super(message);
    this.name = "ProviderError";
  }
}
