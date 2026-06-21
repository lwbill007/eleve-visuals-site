# ÉLEVÉ Visuals

Premium creative studio website with a built-in admin CMS.

## Quick Start

```bash
npm install
cp .env.example .env   # set ADMIN_PASSWORD and AUTH_SECRET
npm run db:push
npm run db:seed
npm run dev
```

- **Site:** [http://localhost:3000](http://localhost:3000)
- **Admin:** [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

Default admin password is set in `.env` as `ADMIN_PASSWORD`.

## Admin CMS

Sign in at `/admin/login` to manage everything:

| Section | What you can edit |
|---------|-------------------|
| **Dashboard** | Overview, unread submissions |
| **Portfolio** | Add/edit/delete projects, upload images, set featured |
| **Services** | Edit copy, pricing, includes, service images |
| **Testimonials** | Add client quotes, mark featured |
| **Site Content** | Hero, about, sessions, contact, brand story, page copy |
| **Submissions** | Booking requests, session applications, contact messages |

### Uploading images

In admin, use the image upload fields on Portfolio, Services, and Site Content. Files save to `public/uploads/` and are served automatically.

## What's changed from the static version

- **No mock data** — no Unsplash placeholders, fake portfolio, or fabricated testimonials
- **SQLite database** — all content and form submissions persist locally
- **Real forms** — booking, contact, and session applications save to the database
- **Admin auth** — password-protected CMS at `/admin`

## Environment variables

```env
DATABASE_URL="file:./dev.db"
ADMIN_PASSWORD="your-secure-password"
AUTH_SECRET="random-32-char-secret"
```

Generate a secret: `openssl rand -base64 32`

## Production deployment

1. Set strong `ADMIN_PASSWORD` and `AUTH_SECRET`
2. For production, consider PostgreSQL (update `DATABASE_URL` in Prisma schema)
3. Run `npm run db:push && npm run db:seed` on first deploy
4. Ensure `public/uploads/` is writable or use cloud storage (S3, Cloudinary)

## Scripts

```bash
npm run dev        # Development server
npm run build      # Production build
npm run db:push    # Apply database schema
npm run db:seed    # Seed default content + services
npm run db:studio  # Prisma database browser
```

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
