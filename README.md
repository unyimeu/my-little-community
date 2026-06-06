# 🌱 My Little Community

A cozy sandbox where you create a few prompt-defined little folks — name, icon,
personality, likes/dislikes, and how talkative they are — drop them into a sunny
meadow, and watch them hold an autonomous conversation. You can pause, whisper
world events into the scene ("a bird flew across the sky…"), and the folks
occasionally get private *intrusive thoughts* that nudge — but never force — what
they say next.

The architecture deliberately mirrors how projects like a16z's **AI Town** are
laid out: a **pure game/turn engine**, a **rendering layer**, and an **LLM/network
layer** are each kept separate so any one can change without touching the others.

---

## Quick start

> Requires **Node ≥ 20** (uses the built-in global `fetch`).

```bash
# 1. install everything (npm workspaces — installs client + server)
npm install

# 2. give the server your OpenAI key
copy server\.env.example server\.env
#    then edit server/.env and set OPENAI_API_KEY=sk-...

# 3. run client + server together
npm run dev
```

- Client (Vite): http://localhost:5173
- Server (Express API): http://localhost:8787

Vite proxies `/api/*` to the server in dev, so the browser only ever talks to its
own origin — no CORS dance, and **your API key never leaves the server**.

### Other scripts

| command             | what it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | run server + client concurrently              |
| `npm test`          | run the engine + prompt unit tests (vitest)   |
| `npm run typecheck` | strict `tsc --noEmit` across both workspaces  |
| `npm run build`     | production build (server `tsc`, client `vite`)|

---

## Architecture

```
my-little-community/
├── server/                      # stateless proxy — holds the key, talks to OpenAI
│   └── src/
│       ├── index.ts             # express app + middleware + error handler
│       ├── env.ts               # zod-validated env (fails loudly if key missing)
│       ├── schema.ts            # zod contract for /api/generate (source of truth)
│       ├── llm/
│       │   ├── provider.ts      # LLMProvider interface + ProviderError (the seam)
│       │   └── openai.ts        # OpenAIProvider implementation
│       ├── conversation/
│       │   ├── prompt.ts        # PURE buildSystemPrompt / buildUserPrompt
│       │   └── prompt.test.ts
│       └── routes/
│           └── generate.ts      # validate → build prompts → provider → line
│
└── client/                      # Vite + React + TS, DOM/SVG rendering
    └── src/
        ├── domain/              # types, intrusive thoughts, meadow layout (pure)
        ├── engine/
        │   ├── TurnEngine.ts        # PURE "speaking pressure" turn selection
        │   ├── TurnEngine.test.ts
        │   └── ConversationEngine.ts# orchestrates the loop via injected ports
        ├── api/generateClient.ts    # fetch wrapper around the backend
        ├── state/
        │   ├── useGameStore.ts      # zustand store (engine state + UI state)
        │   └── engineContext.tsx    # wires the engine's ports to the store + DOM
        └── components/              # SetupScreen, Meadow, SpeechBubble, HUD, …
```

### Why it's split this way

- **The conversation loop lives on the client; the server is a stateless proxy.**
  The client owns pacing, pause/resume, and turn selection, and calls
  `POST /api/generate` for one spoken line at a time. The server just holds the
  key, builds the prompt, and calls OpenAI. This keeps the secret server-side
  without putting game state in the backend.

- **`zod` is the single source of truth at the API boundary.** `schema.ts`
  validates incoming requests *and* generates the TypeScript types via `z.infer`,
  so the wire contract and the types can't drift apart.

- **`LLMProvider` is a seam, not an abstraction for its own sake.** Routes depend
  only on the interface, so adding or swapping a provider is a new class — nothing
  else changes. (Today there's one: OpenAI.)

- **`ConversationEngine` knows nothing about React, the DOM, or the network.** It
  receives an `EnginePorts` object — `getState`, `setState`, `generate`, render
  `hooks`, and an injectable `rng`. That's what makes it unit-testable and is why
  the same engine could be driven by a different UI.

- **Render timing drives pacing.** The engine calls `hooks.speak(agent, line)` and
  *awaits the returned promise*; the `SpeechBubble` resolves it (`completeSpeak`)
  when its typewriter animation finishes. The engine never touches the DOM, yet
  the next turn waits for the bubble to finish.

- **A generation counter discards stale async turns.** Hitting *End* or restarting
  bumps a counter; any in-flight `generate()` from an older generation is ignored
  when it resolves.

### The turn model

`TurnEngine` uses a "speaking pressure" scheme: each tick, every agent gains
pressure ∝ talkativeness (+ noise); the highest speaks and resets. Loud agents
dominate, shy agents build slowly but are **never starved**, and the
just-spoke agent is penalized so the same folk rarely talks twice in a row. These
properties are asserted in `TurnEngine.test.ts` with a seeded PRNG.

---

## Notes & tradeoffs

- Pausing mid-"thinking" discards that in-flight reply — intentional, so *Pause*
  feels immediate.
- The Story Log shows spoken lines; world events surface as the on-meadow banner.
- Rendering is plain DOM/SVG (chosen for simplicity). The layout and components
  are isolated enough that swapping in PixiJS/Canvas later would only touch the
  `components/` + `domain/layout.ts` layer.
