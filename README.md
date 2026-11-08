# Riya · Smart Assistant (v2)

A rebuild of my 2023 NxtWave workshop chatbot (Gradio + LangChain on Colab) as a
production-style web app. Riya streams answers, remembers your chats, answers
from your own PDFs with citations, and can listen and speak.

## Features

- **Streaming chat** with tool calling (current time, document search) and markdown replies
- **Accounts and saved chats**: Supabase email/password auth; every chat is stored per user with row level security
- **Answers from your PDFs (RAG)**: upload a PDF → text is chunked → embedded with Gemini → searched with pgvector; answers cite sources as [1], [2]
- **Voice**: dictate with the mic and have any reply read aloud (browser-native Web Speech API, no extra key)
- **Guard rails**: request validation, an atomic per-user hourly rate limit in Postgres, PDF size and page caps
- **Observability**: optional Langfuse tracing of every model call through OpenTelemetry
- **Quality**: unit tests, a behaviour eval set against the real model, Playwright end-to-end tests, CI on every push

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router, `proxy.ts`) + TypeScript |
| UI | Tailwind CSS v4, Hallmark "Ribbon" theme (Instrument Sans, Figtree), light and dark |
| LLM | Vercel AI SDK 7 (`streamText`, `useChat`, tools, `embedMany`) |
| Models | Google Gemini or Groq (free tiers), or Vercel AI Gateway, chosen by which key is set |
| Data | Supabase Postgres + Auth + pgvector |
| Tracing | Langfuse via `@ai-sdk/otel` and `@vercel/otel` |
| Tests | Vitest (unit + evals), Playwright (desktop + mobile), GitHub Actions |

## Architecture

```
Browser (useChat, sends only the new message)
  │
  ├─ proxy.ts ── refreshes the Supabase session, sends signed-out visitors to /login
  │
  ├─ POST /api/chat
  │    ├─ auth → validate (Zod) → consume_chat_quota() (atomic rate limit)
  │    ├─ load history from Supabase (the client cannot rewrite it)
  │    ├─ streamText(system prompt, tools: getCurrentTime, searchDocuments)
  │    │                                    └─ embed query → match_document_chunks() (pgvector, RLS)
  │    └─ on finish: save the turn to threads + messages
  │
  └─ POST /api/documents ── PDF → text (page/size caps) → chunks → Gemini embeddings → document_chunks
```

## Getting started

1. **Install**

   ```bash
   npm install
   cp .env.example .env.local
   ```

2. **Model key**: add one key to `.env.local` (Gemini is recommended; it is free and also powers PDF search).

   | Provider | Key variable | Free, no card? | Get a key |
   |---|---|---|---|
   | Google Gemini (`gemini-3.5-flash-lite`) | `GOOGLE_GENERATIVE_AI_API_KEY` | Yes | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
   | Groq (`openai/gpt-oss-120b`) | `GROQ_API_KEY` | Yes | [console.groq.com/keys](https://console.groq.com/keys) |
   | Vercel AI Gateway | `AI_GATEWAY_API_KEY` | Needs a card | [vercel.com/ai-gateway](https://vercel.com/ai-gateway) |

3. **Supabase**: create a free project at [supabase.com](https://supabase.com/dashboard), then
   - paste the Project URL and anon key into `.env.local`,
   - run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) in the SQL editor,
   - optionally turn off *Confirm email* under Authentication → Providers → Email for quicker local sign-ups.

4. **Run**

   ```bash
   npm run dev   # http://localhost:3000
   ```

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm test` | Unit tests (Vitest) |
| `npm run eval` | Behaviour evals against the real model (needs a model key) |
| `npm run e2e` | Playwright tests, desktop and mobile; set `E2E_EMAIL`/`E2E_PASSWORD` for the signed-in test |
| `npm run typecheck` | Generate route types, then `tsc` |
| `npm run lint` | ESLint |
| `npm run build` | Production build |

## What changed from v1

- v1 shared one global memory across every visitor; v2 stores each user's chats privately.
- PlayHT voice cloning was listed in v1 but never wired up; v2 has working voice in and out.
- Tokens stream in, with stop and retry; markdown, code and tables render properly.
- Requests are validated, rate limited and traced; the model is swappable by env var.
- Tests, evals and CI run on every push.

## Roadmap

- [x] **Phase 1:** streaming chat, tools, validation, tests, CI
- [x] **Phase 2:** Supabase Auth + saved threads
- [x] **Phase 3:** RAG: upload PDFs → chunk → embed → pgvector search with citations
- [x] **Phase 4:** voice in (speech-to-text) and out (text-to-speech)
- [x] **Phase 5:** rate limiting, Langfuse tracing, an eval set, Playwright end-to-end tests
- [ ] Next: OCR for scanned PDFs, hosted speech for Firefox, deleting and renaming chats
