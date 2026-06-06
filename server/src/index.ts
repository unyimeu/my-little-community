import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { env } from "./env";
import { OpenAIProvider } from "./llm/openai";
import { createGenerateRouter } from "./routes/generate";
import { createIntrusiveRouter } from "./routes/intrusive";

const app = express();

app.use(cors());
app.use(express.json({ limit: "256kb" }));

const provider = new OpenAIProvider();

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, provider: provider.name });
});

app.use("/api", createGenerateRouter(provider));
app.use("/api", createIntrusiveRouter(provider, env.OPENAI_INTRUSIVE_MODEL));

// Centralized error handler — last middleware wins.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(env.PORT, () => {
  console.log(`🌱 My Little Community API listening on http://localhost:${env.PORT}`);
  console.log(`   provider: ${provider.name} · model: ${env.OPENAI_MODEL} · intrusive: ${env.OPENAI_INTRUSIVE_MODEL}`);
});
