-- Drive files indexed per folder (one row per file).
-- RLS: enabled; no permissive policies — only service_role (API) bypasses RLS.

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  folder_id text not null,
  drive_file_id text not null,
  name text not null,
  mime_type text not null,
  drive_url text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'indexed', 'failed', 'skipped')),
  error text,
  token_count integer,
  indexed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint documents_drive_file_id_key unique (drive_file_id)
);

create index documents_folder_id_idx on public.documents (folder_id);

alter table public.documents enable row level security;
