# Talk-to-a-Folder — Build Plan

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BROWSER (React)                            │
│                                                                     │
│  ┌──────────────┐    ┌────────────────────────────────────────┐    │
│  │  FolderTree  │    │              Chat Panel                │    │
│  │              │    │                                        │    │
│  │ • file list  │    │  ┌──────────────────────────────────┐  │    │
│  │ • status dot │    │  │  MessageBubble                   │  │    │
│  │   (indexed/  │    │  │  "The Q4 budget [1] shows..."    │  │    │
│  │    pending/  │    │  │            ↑                     │  │    │
│  │    failed)   │    │  │       CitationChip               │  │    │
│  │              │    │  └──────────────────────────────────┘  │    │
│  │ click file → │    │                                        │    │
│  │ pre-fills    │    │  ┌──────────────────────────────────┐  │    │
│  │ chat input   │    │  │  Reasoning Trace (collapsible)   │  │    │
│  └──────────────┘    │  │  > searched 3 files, 8 chunks    │  │    │
│                      │  │  > cited 4 sources               │  │    │
│  ┌──────────────┐    │  └──────────────────────────────────┘  │    │
│  │  Citation    │◄───┤                                        │    │
│  │  Drawer      │    └────────────────────────────────────────┘    │
│  │  (slide-in)  │                                                   │
│  │ [1] doc.gdoc │                                                   │
│  │     section  │                                                   │
│  │     snippet  │                                                   │
│  │     ↗ Drive  │                                                   │
│  └──────────────┘                                                   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────▼──────────────────────────────────────┐
│                        NEXT.JS API (Vercel)                         │
│                                                                     │
│  /api/auth/*          /api/folder/[id]/          /api/chat          │
│  Auth.js v5           files → file list          Streaming response │
│  Google OAuth         ingest/[fileId] →          ─────────────────  │
│  token refresh        per-file, called           1. recv message    │
│                       once per file by           2. run agent loop  │
│                       the client hook            3. call tools      │
│                       1. extract text            4. stream tokens   │
│                       2. chunk + embed           5. emit citations  │
│                       3. upsert vectors                             │
└──────┬──────────────────────────────────────────────────┬───────────┘
       │                                                  │
┌──────▼──────────┐                           ┌──────────▼───────────┐
│  GOOGLE APIs    │                           │   SUPABASE           │
│                 │                           │                      │
│  OAuth 2.0      │                           │  documents table     │
│  Drive API      │                           │  ┌────────────────┐  │
│  (readonly)     │                           │  │ id, folder_id  │  │
│                 │                           │  │ drive_file_id  │  │
│  File export:   │                           │  │ name, status   │  │
│  • Docs → md   │                           │  └────────────────┘  │
│  • Sheets → csv│                           │                      │
│  • Slides → txt│                           │  chunks table        │
│  • PDF binary  │                           │  ┌────────────────┐  │
└─────────────────┘                           │  │ id, doc_id     │  │
                                              │  │ content        │  │
┌─────────────────┐                           │  │ embedding vec  │  │
│  AI MODELS      │                           │  │ section, page  │  │
│                 │                           │  └────────────────┘  │
│  Gemini         │                           │   (pgvector HNSW)    │
│  embedding-001  │                           │                      │
│  → RETRIEVAL_   │                           │  sessions + messages │
│    DOCUMENT     │                           │  (with citations     │
│  → RETRIEVAL_   │                           │   stored as JSONB)   │
│    QUERY        │                           └──────────────────────┘
│                 │
│  Claude         │
│  Sonnet 4.6     │
│  → tool use     │
│  → streaming    │
└─────────────────┘


Agent Tool Loop (inside /api/chat):

  user message
       │
       ▼
  ┌─────────────────────────────────────┐
  │  Claude Sonnet 4.6                  │
  │  system prompt + conversation       │
  │  history + folder context           │
  └──────────────┬──────────────────────┘
                 │ tool_use block
        ┌────────┼────────────────┐
        ▼        ▼                ▼
  search_      get_document_  get_chunk_
  documents    overview       context
        │        │                │
        └────────┴────────────────┘
                 │ tool_result
                 ▼
  ┌─────────────────────────────────────┐
  │  Claude synthesizes answer          │
  │  injects [doc:chunk_id] markers     │
  │  streams tokens to client           │
  └──────────────┬──────────────────────┘
                 │
                 ▼
        citation assembly:
        parse [doc:*] markers →
        fetch chunk metadata →
        build Citation[] array →
        replace markers with [1],[2]...
```

---

## Project Structure

```
talk-to-folder/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── callback/route.ts            # Auth.js handles OAuth callback here
│   ├── (app)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                     # home: paste folder link
│   │   └── folder/[folderId]/
│   │       ├── page.tsx                 # chat + file explorer
│   │       └── loading.tsx
│   └── api/
│       ├── auth/
│       │   └── [...nextauth]/route.ts   # Auth.js catch-all handler
│       ├── folder/[folderId]/
│       │   ├── files/route.ts           # list all files in folder from Drive
│       │   └── ingest/[fileId]/route.ts # ingest one file (extract→chunk→embed→upsert)
│       └── chat/route.ts                # streaming agent endpoint
├── components/
│   ├── chat/
│   │   ├── ChatPanel.tsx
│   │   ├── MessageBubble.tsx            # renders markdown + citation tokens
│   │   ├── CitationChip.tsx             # inline [1] badge
│   │   ├── CitationDrawer.tsx           # slide-in source panel
│   │   └── ReasoningTrace.tsx           # collapsible tool call trace
│   ├── folder/
│   │   ├── FolderTree.tsx
│   │   ├── FileCard.tsx                 # per-file status + metadata
│   │   ├── IngestionProgress.tsx
│   │   └── FolderLinkInput.tsx          # URL paste + validation
│   └── ui/                              # Radix-based primitives
├── lib/
│   ├── agent/
│   │   ├── index.ts                     # agent orchestrator entry point
│   │   ├── tools.ts                     # tool definitions
│   │   ├── prompts.ts
│   │   ├── streaming.ts                 # Claude streaming + tool use loop
│   │   └── citations.ts                 # citation assembly + deduplication
│   ├── ingestion/
│   │   ├── pipeline.ts                  # orchestrator
│   │   ├── extractors/
│   │   │   ├── google-docs.ts
│   │   │   ├── google-sheets.ts
│   │   │   ├── google-slides.ts
│   │   │   ├── pdf.ts
│   │   │   └── plaintext.ts
│   │   ├── chunker.ts                   # hierarchical semantic chunking
│   │   └── embedder.ts                  # Gemini batch embedding
│   ├── db/
│   │   ├── supabase.ts
│   │   └── queries/
│   │       ├── documents.ts
│   │       ├── chunks.ts                # vector search
│   │       └── sessions.ts
│   ├── google/
│   │   ├── auth.ts
│   │   ├── tokens.ts                    # refresh token logic
│   │   └── drive.ts                     # typed Drive API wrappers
│   └── utils/
│       ├── folder-url.ts                # parse Drive URLs to folder IDs
│       └── mime-types.ts                # MIME → extractor mapping
├── hooks/
│   ├── useChat.ts
│   ├── useIngestion.ts                  # fires per-file ingest calls, tracks progress state
│   ├── useFolderTree.ts
│   └── useCitations.ts
├── types/
│   ├── agent.ts
│   ├── documents.ts
│   ├── drive.ts
│   └── citations.ts
├── supabase/
│   └── migrations/                      # authoritative schema source
│       ├── 001_documents.sql
│       ├── 002_chunks_vectors.sql
│       └── 003_sessions.sql
└── middleware.ts                         # auth guard
```

---

## Database Schema

`supabase/migrations/` is the authoritative schema source. Run with `supabase db push`. Do not maintain a separate `schema.sql` — the migrations are the record.

```sql
-- 001_documents.sql
create table documents (
  id            uuid primary key default gen_random_uuid(),
  folder_id     text not null,
  drive_file_id text not null unique,
  name          text not null,
  mime_type     text not null,
  drive_url     text not null,
  status        text not null default 'pending', -- pending|processing|indexed|failed|skipped
  error         text,
  token_count   int,
  indexed_at    timestamptz,
  created_at    timestamptz default now()
);

create index on documents (folder_id);

-- 002_chunks_vectors.sql
create extension if not exists vector;

create table chunks (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid references documents(id) on delete cascade,
  folder_id    text not null,
  content      text not null,
  embedding    vector(3072),           -- gemini-embedding-001
  chunk_index  int not null,
  page_number  int,
  section      text,                   -- nearest heading or slide title
  token_count  int,
  metadata     jsonb default '{}'::jsonb,
  created_at   timestamptz default now()
);

-- HNSW over IVFFlat: no minimum dataset size, better recall on small folders
create index on chunks using hnsw (embedding vector_cosine_ops);
create index on chunks (folder_id);
create index on chunks (document_id);

-- 003_sessions.sql
create table sessions (
  id         uuid primary key default gen_random_uuid(),
  folder_id  text not null,
  user_id    text,
  created_at timestamptz default now()
);

create index on sessions (folder_id);

create table messages (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  role       text not null,            -- user|assistant
  content    text not null,
  citations  jsonb,                    -- [{chunkId, documentId, snippet, score}]
  created_at timestamptz default now()
);
```

---

## Phases

### Phase 1 — Foundation
- Scaffold Next.js 15 app (TypeScript, Tailwind, App Router)
- Supabase project setup, run all three migrations
- Google OAuth via Auth.js v5 — `(auth)/login`, `(auth)/callback`, `api/auth/[...nextauth]`
- `lib/google/tokens.ts` — `getValidAccessToken()` as single choke point for token refresh
- `lib/google/drive.ts` — list files in a folder given a valid token
- `lib/utils/folder-url.ts` — parse Drive URLs to folder IDs
- `lib/utils/mime-types.ts` — MIME to extractor mapping
- `types/` — scaffold all four type files (`agent`, `documents`, `drive`, `citations`)
- `components/folder/FolderLinkInput.tsx` — URL paste + validation
- Landing page (`app/(app)/page.tsx`) wired to FolderLinkInput
- `middleware.ts` protecting all `/(app)` routes

**Exit criteria:** User can log in with Google, paste a Drive link, and be routed to `/folder/[folderId]`.

---

### Phase 2 — Ingestion Pipeline
- `/api/folder/[folderId]/files/route.ts` — calls Drive API, returns list of files with id, name, mimeType, modifiedTime
- Extractors: Google Docs, Sheets, Slides (Drive export API), PDF (`pdf-parse`), plaintext
- `lib/ingestion/chunker.ts` — hierarchical chunking: heading boundaries → paragraph → sentence with 50-token overlap
- `lib/ingestion/embedder.ts` — Gemini `gemini-embedding-001` with `RETRIEVAL_DOCUMENT` task type, batched in groups of 50
- `/api/folder/[folderId]/ingest/[fileId]/route.ts` — single file: extract → chunk → embed → upsert; idempotency check on `drive_file_id`; `DELETE FROM chunks WHERE document_id = $id` before re-embedding to prevent duplicates on re-index; fast enough to complete well within Vercel's 10s free tier limit
- `hooks/useIngestion.ts` — fetches file list from `/files`, then calls `/ingest/[fileId]` for each file sequentially (or with concurrency 2-3); tracks `{ pending, processing, done, failed }` per file in local state
- `hooks/useFolderTree.ts` — reads file list + per-file status from `useIngestion` state
- `components/folder/FolderTree.tsx` + `FileCard.tsx` — file list with per-file status dots driven by hook state
- `components/folder/IngestionProgress.tsx` — progress bar: `done / total` files

**Exit criteria:** Pasting a folder link indexes all supported files with per-file progress visible. Re-indexing a modified file replaces its chunks cleanly. Works on Vercel free tier.

---

### Phase 3 — Agent
- `lib/agent/tools.ts` — three tools: `search_documents`, `get_document_overview`, `get_chunk_context`
- `lib/db/queries/chunks.ts` — pgvector cosine similarity search filtered by `folder_id`
- `lib/agent/prompts.ts` — system prompt with citation marker instructions (`[doc:chunk_id]`)
- `lib/agent/streaming.ts` — Claude Sonnet 4.6 streaming with tool use loop; emits structured events: `{ type: "tool_call" }`, `{ type: "tool_result" }`, `{ type: "text", delta }`, `{ type: "done", citations }`
- `lib/agent/citations.ts` — parse `[doc:*]` markers, fetch chunk + document metadata, assemble `Citation[]`
- `lib/agent/index.ts` — agent orchestrator that wires tools, prompts, and streaming loop together
- `/api/chat/route.ts` — raw `ReadableStream` response; no AI SDK wrapper
- Finalize and export all types from `types/agent.ts` and `types/citations.ts` before Phase 4 begins

**Exit criteria:** Ask a question and receive a streaming answer with `[doc:*]` markers resolved into numbered citations. Tool call events are visible in the stream.

---

### Phase 4 — Chat UI
- `hooks/useChat.ts` — streaming consumer; two-pass render: stream raw text first, resolve citations after `done` event
- `hooks/useCitations.ts` — citation panel open/close state and active citation tracking
- `components/chat/MessageBubble.tsx` — `react-markdown` with custom renderer replacing `[doc:*]` with `CitationChip`
- `components/chat/CitationChip.tsx` — inline `[1]` badge; hover shows document name, click opens CitationDrawer
- `components/chat/CitationDrawer.tsx` — slide-in panel: document name, section, snippet, "Open in Drive" link
- `components/chat/ReasoningTrace.tsx` — collapsible section above each answer showing files searched and chunks retrieved, sourced from `tool_call`/`tool_result` stream events
- `components/chat/ChatPanel.tsx` — composes all chat components, owns message list state
- Auto-generate folder summary on ingestion complete (one agent call, pre-fills first assistant message)
- Auto-generate 3 starter question suggestions from file names

**Exit criteria:** Full end-to-end flow: question → streaming answer → citation chips → drawer with source previews → reasoning trace visible.

---

### Phase 5 — Polish + Deploy
- Stale content detection: on folder load, compare Drive `modifiedTime` against `indexed_at`; show re-index banner if any files changed
- `app/(app)/folder/[folderId]/loading.tsx` — skeleton UI for the folder page
- Dark mode, empty states, error boundaries
- `README.md` with setup steps, env var list, and architecture diagram
- Supabase RLS: users can only query chunks from folders they have an active session for
- Vercel: configure all env vars, add `maxDuration = 60` on ingest + chat routes, add production OAuth redirect URI in Google Cloud Console
- Smoke test against a real Drive folder with mixed file types (Docs, Sheets, PDF)

***REMOVED***

---

## Key Technical Decisions

| Decision | Choice | Why |
|---|---|---|
| Agent LLM | Claude Sonnet 4.6 | Strong tool use and streaming; current generation |
| Embeddings | Gemini `embedding-001` | Higher quality for doc retrieval; separate `RETRIEVAL_DOCUMENT` / `RETRIEVAL_QUERY` task types improve precision |
| Vector index | HNSW (not IVFFlat) | No minimum dataset size; IVFFlat degrades on small folders (< ~10k rows) |
| Vector DB | Supabase pgvector | No extra infra, production-ready |
| Auth | Auth.js v5 | Handles Google refresh token rotation correctly |
***REMOVED***
***REMOVED***
***REMOVED***
| Ingestion approach | Per-file API calls from client | No long-running server job; each file completes in < 10s; works on Vercel free tier; progress tracked in client state; naturally resumable |

---

## Features

| Feature | Priority | Notes |
|---|---|---|
***REMOVED***
| Paste Drive folder link | Must have | Primary entry point |
| File ingestion: Docs, Sheets, Slides, PDF, plaintext | Must have | Covers all common Drive file types |
| Per-file ingestion progress | Must have | UX clarity during indexing |
| Chat interface | Must have | Core interaction model |
| Agent with tool use (3 tools) | Must have | The architectural centerpiece |
***REMOVED***
| Citation drawer (source name, section, snippet, Drive link) | Must have | Makes citations usable, not just decorative |
***REMOVED***
| Dark mode | Must have | Design baseline |
| Folder file list with per-file status dots | Must have | Feedback during ingestion |
| Stale content detection + re-index banner | Nice to have | Shows production thinking |
| Auto-generated folder summary on ingestion complete | Nice to have | Removes cold-start friction |
| Auto-generated starter questions from file names | Nice to have | Removes cold-start friction |
| Conversation history across page refreshes | Nice to have | Sessions + messages table already supports it |
***REMOVED***
| Multi-folder support (switch between indexed folders) | Nice to have | Good product extension |
***REMOVED***
| Write / edit Drive files | Won't have | Read-only by design (`drive.readonly`) |
***REMOVED***
| Mobile (Expo) version | Won't have | Web-only was the chosen path |
***REMOVED***

---

## Environment Variables

```bash
# Auth
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
TOKEN_ENCRYPTION_KEY=        # encrypts stored refresh tokens at rest

# AI
ANTHROPIC_API_KEY=
GEMINI_API_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```
