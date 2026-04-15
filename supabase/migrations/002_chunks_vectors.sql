-- pgvector + chunks. Extension enabled here per project rules.

create extension if not exists vector with schema extensions;

create table public.chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  folder_id text not null,
  content text not null,
  embedding vector(3072) not null,
  chunk_index integer not null,
  page_number integer,
  section text,
  token_count integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index chunks_folder_id_idx on public.chunks (folder_id);
create index chunks_document_id_idx on public.chunks (document_id);

-- HNSW on `vector` is limited to 2000 dims; Gemini uses 3072. Store full `vector`,
-- index via `halfvec` cast (pgvector pattern — same README "Halfvec" section).
create index chunks_embedding_hnsw_idx
  on public.chunks
  using hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);

alter table public.chunks enable row level security;
