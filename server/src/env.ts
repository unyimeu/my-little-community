import "dotenv/config";
import { z } from "zod";

/**
 * Validate environment at boot so a missing key fails loudly and early,
 * rather than surfacing as a confusing 500 on the first request.
 */
const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required (see server/.env.example)"),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  /** A cheaper/smaller model used only to invent context-aware intrusive thoughts. */
  OPENAI_INTRUSIVE_MODEL: z.string().default("gpt-4o-mini"),
  PORT: z.coerce.number().int().positive().default(8787),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("\n✗ Invalid server environment:\n");
  for (const [key, errors] of Object.entries(parsed.error.flatten().fieldErrors)) {
    console.error(`  - ${key}: ${errors?.join(", ")}`);
  }
  console.error("");
  process.exit(1);
}

export const env = parsed.data;
