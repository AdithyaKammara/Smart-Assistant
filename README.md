# Riya · Smart Assistant (v2)

A rebuild of my 2023 NxtWave workshop chatbot (Gradio + LangChain on Colab) as a
production-style web app: streaming responses, tool calling, input validation,
tests and CI.

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind CSS v4 |
| LLM | Vercel AI SDK 7 (`streamText`, `useChat`, tools) |
| Models | Vercel AI Gateway (any `provider/model` via `CHAT_MODEL`) |
| Data | Supabase Postgres + Auth + pgvector (schema in `supabase/migrations`) |
| Tests / CI | Vitest, GitHub Actions (lint, typecheck, test, build) |

## Architecture

```
Browser (useChat) ──POST /api/chat──▶ Route handler
                                       ├─ Zod validation (roles, size, count)
                                       ├─ streamText(system prompt + tools)
                                       └─ AI Gateway ──▶ model provider
        ◀── streamed UI message parts ──┘
```

## Getting started

```bash
npm install
cp .env.example .env.local   # add AI_GATEWAY_API_KEY
npm run dev                  # http://localhost:3000
```

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run build` | Production build |

## What changed from v1

- Each browser keeps its own conversation (v1 shared one global memory across all users).
- Token streaming, a stop button and retry on errors.
- The server validates requests: no client-supplied system prompts, and caps on
  message count and length.
- The model can be swapped with an env var; no provider lock-in.
- Tool calling (`getCurrentTime` to start).
- Tests and CI on every push.

## Roadmap

- [x] **Phase 1:** streaming chat, tools, validation, tests, CI
- [ ] **Phase 2:** Supabase Auth + saved threads (schema ready in `supabase/migrations/0001_init.sql`)
- [ ] **Phase 3:** RAG: upload PDFs → chunk → embed → pgvector search with citations
- [ ] **Phase 4:** voice in (speech-to-text) and out (text-to-speech)
- [ ] **Phase 5:** rate limiting, Langfuse tracing, an eval set, Playwright end-to-end tests
