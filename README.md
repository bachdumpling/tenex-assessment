# Talk to a Folder

RAG-style chat over a **Google Drive folder**: sign in with Google, paste a folder link, index supported files, then ask questions with inline citations and a collapsible reasoning trace.

Architecture, data flow, and schema are described in [PLAN.md](./PLAN.md). Day-to-day agent and stack rules live in [AGENTS.md](./AGENTS.md).

## Prerequisites

- Node.js 20+ (see Vercel / Next.js defaults)
- A [Supabase](https://supabase.com) project with the Postgres + pgvector stack
- A Google Cloud project with **Google Drive API** enabled and OAuth client (web) credentials
- API keys: [Anthropic](https://console.anthropic.com) (Claude), [Google AI Studio](https://aistudio.google.com) (Gemini embeddings)

## Environment variables

Create a `.env` (or `.env.local`) with:

| Variable | Purpose |
|----------|---------|
| `NEXTAUTH_URL` | Public app URL (e.g. `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Random secret for Auth.js |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth web client |
| `TOKEN_ENCRYPTION_KEY` | Encrypts refresh tokens at rest (**at least 16 characters**) |
| `ANTHROPIC_API_KEY` | Claude (agent) |
| `GEMINI_API_KEY` | Gemini embeddings |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (reserved for future client patterns) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only DB access from Next.js API routes |

Never commit real secrets. On Vercel, set the same names under **Project → Settings → Environment Variables** for Preview and Production.

## Local development

1. Install dependencies: `npm install`
2. Apply database migrations: `supabase db push` (from project root, with Supabase CLI linked to your project), or run the SQL in `supabase/migrations/` in order in the Supabase SQL editor.
3. Run the app: `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000), sign in with Google, paste a Drive folder URL, then open the folder workspace.

Google OAuth **Authorized redirect URIs** must include:

- `http://localhost:3000/api/auth/callback/google` (local)
- `https://<your-production-domain>/api/auth/callback/google` (production)

Use **`drive.readonly`** scope only (see [AGENTS.md](./AGENTS.md)).

## Security model (RLS + API)

- Tables `documents`, `chunks`, `sessions`, and `messages` have **Row Level Security enabled** in migrations. The app’s server code uses the **Supabase service role** client for reads/writes, so PostgREST is not exposed to the browser for these tables.
- **Who can search which folder** is enforced in Next.js: e.g. `/api/chat` checks Google Drive access to the folder and ownership of the chat session before running vector search. See [AGENTS.md](./AGENTS.md) for the full rule set.

## Deploy checklist (Vercel + Supabase)

- [ ] All env vars set on Vercel for Production (and Preview if you use it).
- [ ] Production `NEXTAUTH_URL` matches the deployment URL.
- [ ] Google OAuth redirect URI added for the production domain.
- [ ] Supabase migrations applied to the production database.
- [ ] **Do not** add `maxDuration` in route handlers unless you have confirmed a Vercel plan that supports it; this repo targets Hobby-style limits per [AGENTS.md](./AGENTS.md).

## Scripts

- `npm run dev` — Next.js dev server  
- `npm run build` — production build  
- `npm run start` — run production build locally  
- `npm run lint` — ESLint  

## License

Private use unless otherwise stated by the author.
