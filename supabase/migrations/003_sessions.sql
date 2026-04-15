-- Chat sessions per user + folder; messages with persisted citations.

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  folder_id text not null,
  user_id text not null,
  created_at timestamptz not null default now()
);

create index sessions_folder_id_idx on public.sessions (folder_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  citations jsonb,
  created_at timestamptz not null default now()
);

create index messages_session_id_idx on public.messages (session_id);

alter table public.sessions enable row level security;
alter table public.messages enable row level security;
