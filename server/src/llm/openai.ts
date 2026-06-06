import { env } from "../env";
import { type CompletionRequest, type LLMProvider, ProviderError } from "./provider";

const ENDPOINT = "https://api.openai.com/v1/chat/completions";

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";

  constructor(
    private readonly apiKey: string = env.OPENAI_API_KEY,
    private readonly model: string = env.OPENAI_MODEL,
  ) {}

  async complete({
    system,
    user,
    maxTokens = 220,
    temperature = 0.95,
    json = false,
    model,
  }: CompletionRequest): Promise<string> {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: model ?? this.model,
        temperature,
        max_tokens: maxTokens,
        ...(json ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => res.statusText);
      throw new ProviderError(`OpenAI request failed (${res.status})`, detail);
    }

    const data = (await res.json()) as OpenAIChatResponse;
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new ProviderError("OpenAI returned an empty completion");

    return text;
  }
}

/**
 * Models occasionally wrap a line in quotes or prefix "Name:" despite the
 * instructions. Strip those so the bubble shows clean speech.
 */
export function sanitizeLine(text: string): string {
  return text
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .replace(/^[\w '\-]{1,24}:\s+/, "")
    .trim();
}
