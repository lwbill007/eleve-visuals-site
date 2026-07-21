# ÉLEVÉ Visuals

Premium creative studio website with a built-in admin CMS.

## Quick Start (local)

```bash
npm install
cp .env.example .env   # configure Postgres + auth secrets (see below)
docker compose up -d   # optional: local PostgreSQL
npm run db:setup       # migrate + seed (development only)
npm run dev
```

- **Site:** [http://localhost:3000](http://localhost:3000)
- **Admin:** [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

## Database (PostgreSQL)

This project uses **PostgreSQL** for persistent storage (Neon, Vercel Postgres, or local Docker).

### Local Docker Postgres

```bash
docker compose up -d
```

Set in `.env`:

```env
DATABASE_URL="postgresql://eleve:eleve@localhost:5432/eleve?schema=public"
```

### Neon / Vercel Postgres

1. Create a Postgres database in [Neon](https://neon.tech) or Vercel Storage.
2. Set `DATABASE_URL` to Neon's **pooled** connection string and `DIRECT_URL`
   to the direct connection string used by Prisma migrations.
3. Deploy — `npm run build` runs `prisma migrate deploy` automatically.

**Production builds never seed the database.** Run `npm run db:seed` manually only for fresh dev/staging setups.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | Random secret, **32+ characters** |
| `ADMIN_PASSWORD` | Yes | Admin login password, **8+ characters** |
| `BLOB_READ_WRITE_TOKEN` | Prod uploads | Vercel Blob token for admin image uploads |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Optional | Cloudflare Turnstile (pair with secret) |
| `TURNSTILE_SECRET_KEY` | Optional | Cloudflare Turnstile secret |
| `OPENROUTER_API_KEY` | AI features | OpenRouter API key for ÉLEVÉ Control AI |
| `OPENROUTER_MODEL` | Optional | Primary model (default: `qwen/qwen3-32b`) |
| `AI_PROVIDER` | Optional | `openrouter` (default) or `ollama` for local dev |
| `CRON_SECRET` | Production cron | Required in production for `/api/cron/digest` |

Generate a secret: `openssl rand -base64 32`

## ÉLEVÉ Control AI

The admin dashboard includes an AI intelligence layer powered by **OpenRouter**. The application never calls a model directly — all features go through a provider adapter with automatic model fallback.

**Default model chain:** Qwen 3 → DeepSeek → Llama → Mistral. If every model fails, rule-based responses keep the admin working.

### Local setup

Add to `.env`:

```env
OPENROUTER_API_KEY="sk-or-..."
OPENROUTER_MODEL="qwen/qwen3-32b"
```

Optional overrides:

```env
OPENROUTER_FALLBACK_MODELS="deepseek/deepseek-chat-v3-0324,meta-llama/llama-3.3-70b-instruct,mistralai/mistral-small-3.1-24b-instruct"
AI_CACHE_TTL_MS="300000"
```

For offline local development without OpenRouter:

```env
AI_PROVIDER="ollama"
OLLAMA_BASE_URL="http://127.0.0.1:11434"
OLLAMA_MODEL="llama3.2"
```

### Vercel production

In **Project → Settings → Environment Variables**, set:

| Variable | Value |
|----------|--------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key |
| `OPENROUTER_MODEL` | `qwen/qwen3-32b` (optional) |
| `NEXT_PUBLIC_SITE_URL` | `https://www.eleve-visuals.com` |

Redeploy after adding variables. No Gemini or Google AI credentials are required.

## Admin CMS

Sign in at `/admin/login` to manage:

| Section | What you can edit |
|---------|-------------------|
| **Dashboard** | Overview, unread submissions |
| **Portfolio** | Add/edit/delete projects, upload images, set featured |
| **Services** | Edit copy, pricing, includes, service images |
| **Testimonials** | Add client quotes, mark featured |
| **Site Content** | Hero, about, sessions, contact, brand story, page copy |
| **Submissions** | Booking requests, session applications, contact messages |

### Uploading images

In admin, use the image upload fields. Production uploads go to **Vercel Blob**; locally, files save to `public/uploads/` when no Blob token is set.

**Vercel Blob setup (required for production uploads):**

1. Vercel Dashboard → your project → **Storage** → **Create Database** → **Blob**
2. Set access mode to **Public** (portfolio images must be viewable on the public site without auth)
3. **Connect** the store to this project — Vercel injects `BLOB_READ_WRITE_TOKEN` automatically
4. Redeploy after connecting the store
5. Do not paste a token from a different project or a Private store

The upload API already sets `access: "public"` on each file (`src/app/api/admin/upload/route.ts`). A **Private** store at the project level will still cause upload or display failures for public portfolio pages.

## Scripts

```bash
npm run dev              # Development server
npm run build            # Production build (migrate deploy + next build)
npm run db:migrate       # Create/apply migrations (dev)
npm run db:migrate:deploy # Apply migrations (CI/production)
npm run db:seed          # Seed default content (manual, dev only)
npm run db:setup         # migrate deploy + seed (fresh local setup)
npm run db:studio        # Prisma database browser
npm run test:e2e         # Playwright end-to-end tests
```

## Testing

E2E tests require Postgres and auth env vars. CI uses a Postgres service container automatically.

```bash
npm run db:setup
npm run test:e2e
```

## Production deployment (Vercel)

1. Add a **Neon** or **Vercel Postgres** database.
2. Set environment variables: `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_PASSWORD`, `OPENROUTER_API_KEY`, `CRON_SECRET`.
3. Add **Vercel Blob** — create a **Public** store, connect it to the project (sets `BLOB_READ_WRITE_TOKEN` automatically)
4. Deploy — migrations run during build; content is **not** overwritten.

## Site routes

| Route | Page |
|-------|------|
| `/` | Home |
| `/portfolio` | Filterable gallery |
| `/services` | Service details |
| `/book` | Booking form |
| `/sessions` | ÉLEVÉ Sessions |
| `/sessions/apply` | Session application |
| `/about` | About |
| `/contact` | Contact + FAQ |
| `/admin` | CMS dashboard |

---

Built for ÉLEVÉ Visuals by Bill. Sacramento ↔ Bay Area.
