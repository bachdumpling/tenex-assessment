-- Encrypted Google refresh tokens (server + service role only).

create table public.google_oauth_tokens (
  user_id text primary key,
  encrypted_refresh_token text not null,
  updated_at timestamptz not null default now()
);

create index google_oauth_tokens_updated_at_idx on public.google_oauth_tokens (updated_at);

alter table public.google_oauth_tokens enable row level security;
