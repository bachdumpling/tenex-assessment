<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Talk-to-a-Folder — Agent Rules

## Behavior Rule (Always Apply)

Before writing any code or making any implementation decision, ask:

> "Ask me more questions. Fill in all gaps. Don't make any dangerous assumptions."

If a requirement is ambiguous, a file path is unclear, or a design decision has multiple valid approaches, stop and ask. Never guess on things that affect architecture, auth flow, data schema, or API contracts.

---

## Project Overview

**Talk-to-a-Folder** is a RAG-powered web app where users authenticate with Google, paste a Drive folder link, and chat with an agent that can answer questions about any file in that folder. Every answer includes citations linked back to source documents.

---

## Tech Stack (Locked)

| Layer | Choice | Do Not Change |
|---|---|---|
| Framework | Next.js 15, App Router, TypeScript | yes |
| Styling | Tailwind CSS v4 + shadcn (Base UI preset `bd1gALys`) | yes |
| Agent LLM | Claude Sonnet 4.6 via raw Anthropic SDK | yes |
| Embeddings | Gemini `gemini-embedding-001` | yes |
| Vector DB | Supabase pgvector | yes |
| Vector index | HNSW | yes |
| Auth | Auth.js v5 with Google OAuth | yes |
| Deployment | Vercel (frontend) + Supabase (DB) | yes |

---

## Architecture Rules

### Agent Loop
- Use the **raw Anthropic SDK** for the agent loop. No LangChain, no Vercel AI SDK wrapper.
- The agent loop lives in `lib/agent/streaming.ts` and is written manually: receive message → call Claude → handle `tool_use` blocks → call tools → feed `tool_result` back → repeat until `end_turn`.
- LangChain is acceptable only for document text splitting utilities if it saves time. The agent loop itself must be raw.

### Streaming
- `/api/chat/route.ts` returns a raw `ReadableStream` using `new Response(stream)`.
- Do not use `StreamingTextResponse` or any AI SDK helper.
- The stream emits structured JSON events: `{ type: "tool_call" }`, `{ type: "tool_result" }`, `{ type: "text", delta }`, `{ type: "done", citations }`.
- The client handles each event type differently: tool events render as reasoning trace, text events stream into the message bubble, done event triggers citation resolution.

### Citations
- The agent injects `[doc:chunk_id]` markers inline in its text response.
- After streaming completes, `lib/agent/citations.ts` parses all markers, fetches chunk + document metadata, and builds a `Citation[]` array.
- The UI replaces `[doc:chunk_id]` with `<CitationChip index={n} />` components.
- Citations are stored as JSONB in the `messages` table so they survive page refresh.

### No SSE for Ingestion
- Ingestion does NOT use a single long-running SSE route. That would hit Vercel's 10s free tier timeout.
- Instead: the client calls `/api/folder/[folderId]/files` to get the file list, then calls `/api/folder/[folderId]/ingest/[fileId]` once per file.
- `hooks/useIngestion.ts` manages the queue, fires requests with concurrency 2-3, and tracks per-file status in local state.
- Each individual file ingest completes well within 10 seconds.

---

## Infrastructure Rules

### Vercel
- Free tier target. Do not assume Pro features.
- No `maxDuration` exports unless explicitly confirmed Pro is available.
- Each API route must complete within 10 seconds.

### Supabase
- `supabase/migrations/` is the authoritative schema source. Run with `supabase db push`.
- Do not maintain a separate `schema.sql` — the migrations are the record.
- Use HNSW index, not IVFFlat. IVFFlat degrades on small datasets (< ~10k rows).
- Enable pgvector extension in migration `002`.
- Row Level Security: users may only read chunks from folders they have an active session for.

### Google OAuth
- Request only `drive.readonly` scope. Never request full `drive` access.
- Refresh tokens are stored encrypted in Supabase, never in the client.
- All Drive API calls go through `lib/google/tokens.ts:getValidAccessToken()` — single choke point for token refresh.
- Auth.js v5 catch-all handler lives at `app/api/auth/[...nextauth]/route.ts`.
- There is no separate `app/(auth)/callback/route.ts` — Auth.js handles the callback internally.

---

## Database Schema Rules

- `documents` table: one row per Drive file. Columns: `id`, `folder_id`, `drive_file_id` (unique), `name`, `mime_type`, `drive_url`, `status` (pending/processing/indexed/failed/skipped), `error`, `token_count`, `indexed_at`, `created_at`.
- `chunks` table: one row per text chunk. Columns: `id`, `document_id` (FK → documents, cascade delete), `folder_id` (denormalized), `content`, `embedding vector(3072)`, `chunk_index`, `page_number`, `section`, `token_count`, `metadata jsonb`, `created_at`.
- `sessions` table: `id`, `folder_id`, `user_id`, `created_at`.
- `messages` table: `id`, `session_id` (FK → sessions, cascade delete), `role`, `content`, `citations jsonb`, `created_at`.
- Required indexes: `documents(folder_id)`, `chunks(folder_id)`, `chunks(document_id)`, `sessions(folder_id)`, HNSW on `chunks(embedding)`.

### Re-indexing Rule
When a file is re-indexed (modified since last `indexed_at`), always run `DELETE FROM chunks WHERE document_id = $id` before inserting new chunks. Failure to do this creates duplicate chunks and degrades retrieval quality.

---

## Ingestion Pipeline Rules

### Supported File Types
| MIME | Strategy |
|---|---|
| `application/vnd.google-apps.document` | Export as `text/markdown` via Drive export API |
| `application/vnd.google-apps.spreadsheet` | Export as `text/csv` |
| `application/vnd.google-apps.presentation` | Export as `text/plain`, split by slide separator |
| `application/pdf` | Download binary, extract with `pdf-parse` |
| `text/plain`, `text/markdown`, `text/csv` | Download directly |

Unsupported types: set `status = 'skipped'` with a reason. Never silently drop files.

### Chunking Strategy (`lib/ingestion/chunker.ts`)
1. Split on heading boundaries first (H1, H2 for Docs; slide titles for Slides)
2. If section exceeds ~512 tokens, split on paragraph boundaries
3. If paragraph exceeds 512 tokens, split on sentence boundaries with 50-token overlap
4. Each chunk carries: `section` (nearest heading), `page_number` (PDFs), `chunk_index`
- Target chunk size: ~400 tokens. This determines citation quality throughout the system.

### Embedding (`lib/ingestion/embedder.ts`)
- Use `task_type: RETRIEVAL_DOCUMENT` when embedding chunks at ingest time.
- Use `task_type: RETRIEVAL_QUERY` when embedding the user's query at search time.
- Batch embedding calls in groups of 50 (Gemini limit).
- Embedding dimension: 3072 (matches `vector(3072)` in schema).

---

## Frontend Rules

### Component Structure
- `components/chat/` — all chat UI: `ChatPanel`, `MessageBubble`, `CitationChip`, `CitationDrawer`, `ReasoningTrace`
- `components/folder/` — all folder UI: `FolderTree`, `FileCard`, `IngestionProgress`, `FolderLinkInput`
- `components/ui/` — shadcn primitives only, do not add business logic here

### Citation Rendering
- `MessageBubble.tsx` uses `react-markdown` with a custom renderer.
- The custom renderer replaces `[doc:chunk_id]` tokens with `<CitationChip>` components.
- Do not resolve citations during streaming. Buffer the full message text first, then do a second pass after the `done` event to replace markers.
- Reason: citations appearing and disappearing mid-stream is poor UX.

### Reasoning Trace
- Every assistant message has a collapsible `<ReasoningTrace>` section rendered above it.
- It shows: which files were searched, how many chunks were retrieved, which were cited.
- Data comes from `tool_call` and `tool_result` stream events, not from the final text.
- This is a key feature — do not cut it.

### Design Tone
- Dark mode default.
- Monospace font for citation snippets (they are document excerpts).
- Animate citation drawer sliding in, do not pop.
- On ingestion complete: auto-generate one folder summary (free agent call) and 3 starter questions from file names.

---

## Agent Tools (Locked)

Three tools only. Do not add more without asking.

1. `search_documents` — vector similarity search filtered by `folder_id`, returns ranked chunks with metadata
2. `get_document_overview` — returns file list for the folder with names, types, and index status
3. `get_chunk_context` — returns surrounding chunks for a given `chunk_id` (window ± 2 chunks)

System prompt must instruct the agent to:
- Always inject `[doc:chunk_id]` markers inline when citing a source
- Never fabricate information not present in the documents
- Use `get_document_overview` before searching if it is unclear which files to search
- Use `get_chunk_context` when a single chunk appears incomplete

---

## File Structure (Canonical)

```
app/
  (auth)/login/page.tsx
  (auth)/callback/route.ts
  (app)/layout.tsx
  (app)/page.tsx
  (app)/folder/[folderId]/page.tsx
  (app)/folder/[folderId]/loading.tsx
  api/auth/[...nextauth]/route.ts
  api/folder/[folderId]/files/route.ts
  api/folder/[folderId]/ingest/[fileId]/route.ts
  api/chat/route.ts
components/
  chat/ChatPanel.tsx
  chat/MessageBubble.tsx
  chat/CitationChip.tsx
  chat/CitationDrawer.tsx
  chat/ReasoningTrace.tsx
  folder/FolderTree.tsx
  folder/FileCard.tsx
  folder/IngestionProgress.tsx
  folder/FolderLinkInput.tsx
  ui/  (shadcn primitives)
lib/
  agent/index.ts
  agent/tools.ts
  agent/prompts.ts
  agent/streaming.ts
  agent/citations.ts
  ingestion/pipeline.ts
  ingestion/chunker.ts
  ingestion/embedder.ts
  ingestion/extractors/google-docs.ts
  ingestion/extractors/google-sheets.ts
  ingestion/extractors/google-slides.ts
  ingestion/extractors/pdf.ts
  ingestion/extractors/plaintext.ts
  db/supabase.ts
  db/queries/documents.ts
  db/queries/chunks.ts
  db/queries/sessions.ts
  google/auth.ts
  google/tokens.ts
  google/drive.ts
  utils/folder-url.ts
  utils/mime-types.ts
hooks/
  useChat.ts
  useIngestion.ts
  useFolderTree.ts
  useCitations.ts
types/
  agent.ts
  documents.ts
  drive.ts
  citations.ts
supabase/migrations/
  001_documents.sql
  002_chunks_vectors.sql
  003_sessions.sql
middleware.ts
```

---

## Environment Variables

```
NEXTAUTH_URL
NEXTAUTH_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
TOKEN_ENCRYPTION_KEY
ANTHROPIC_API_KEY
GEMINI_API_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

---

## What NOT to Do

- Do not use LangChain for the agent loop
- Do not use `StreamingTextResponse` or Vercel AI SDK
- Do not use IVFFlat — use HNSW
- Do not use a single long-running SSE route for ingestion
- Do not request `drive` scope — only `drive.readonly`
- Do not store tokens in the client
- Do not create a separate `lib/db/schema.sql` — migrations are authoritative
- Do not add tools beyond the three defined above without asking
- Do not resolve citations during streaming — wait for `done` event
- Do not skip the `DELETE FROM chunks` step before re-indexing
