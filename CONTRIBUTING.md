# Contributing

Thanks for taking a look! This project is a small full-stack TypeScript app
(Vite + React client, Express server) using npm workspaces.

## Local setup

```bash
npm install
cp server/.env.example server/.env   # then add your OPENAI_API_KEY
npm run dev
```

- Client: http://localhost:5173 · Server API: http://localhost:8787
- Node 20+ required.

## Before you open a pull request

Run the full gate locally — CI runs exactly the same three commands and must
pass before a PR can merge:

```bash
npm run typecheck
npm test
npm run build
```

## Workflow

1. Create a branch off `main`: `git checkout -b feat/short-description`
   (prefixes: `feat/`, `fix/`, `docs/`, `chore/`, `refactor/`, `test/`).
2. Keep commits focused. We use [Conventional Commits](https://www.conventionalcommits.org/):
   `feat: add agent grouping`, `fix: stop bubble from clearing early`, `docs: ...`.
3. Push and open a PR. Fill in the template; link any issue with `Closes #N`.
4. CI must be green. Squash-merge once approved.

## Architecture notes

- The conversation loop lives in `client/src/engine/` and is framework-agnostic
  (pure, unit-tested). Keep React/DOM/network concerns out of it.
- The server is a stateless proxy. Anything LLM-specific belongs behind the
  `LLMProvider` interface in `server/src/llm/`.
- The wire contract is defined once with zod in `server/src/schema.ts`.

## Never commit

- `server/.env` or any API key (already gitignored — keep it that way).
- `node_modules/` or `dist/`.
