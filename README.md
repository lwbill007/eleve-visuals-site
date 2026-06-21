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
2. Set `DATABASE_URL` to your PostgreSQL connection string (use the **direct** URL if using Neon’s pooler).
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

Generate a secret: `openssl rand -base64 32`

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

In admin, use the image upload fields. With `BLOB_READ_WRITE_TOKEN` set, files upload to Vercel Blob. Locally, files save to `public/uploads/`.

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
2. Set environment variables: `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_PASSWORD`.
3. Add **Vercel Blob** and set `BLOB_READ_WRITE_TOKEN`.
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
