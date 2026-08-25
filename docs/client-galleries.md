# Client Galleries

Private photography delivery, native to ÉLEVÉ. A client opens
`elevevisuals.com/gallery/their-slug`, enters a code, and views, favourites and
downloads their photographs without ever leaving the domain.

## Architecture

```
browser ──presigned PUT──────────────────────────► Cloudflare R2 (private)
   │                                                      ▲
   │ POST /photos          ┌── Next.js (Vercel) ──┐        │
   └──────────────────────►│  key + DB row        │        │ Sharp derives
                           │  POST /process ──────┼────────┘ thumb/display/large
                           └──────────────────────┘
client ◄──302 signed URL──── /api/gallery/[slug]/... ◄── session check
```

**Originals never pass through Vercel.** The browser uploads straight to R2
with a presigned PUT scoped to one key and one content type. That sidesteps the
serverless body limit and costs no function bandwidth. Derivatives are made
server-side, once, on a Node-runtime route.

### Why R2 rather than the existing Vercel Blob store

Blob still holds contract PDFs and session-application media; nothing moved.
Galleries use R2 because **R2 charges nothing for egress**, and photo delivery
is almost entirely egress — a 6 GB gallery downloaded ten times is 60 GB out.

### Why Sharp rather than Cloudflare Images

Transform settings stay in the repo and reviewable, there is no per-image
recurring charge, and the variant matrix is one format (WebP) rather than a
negotiation. `src/lib/storage/image-pipeline.ts`.

### Why `unoptimized` on gallery `next/image`

The thumbnail in R2 is already the exact WebP wanted, and a signed URL's query
string changes hourly. Routing it through Next's optimizer would re-encode the
whole gallery every hour and push every byte back through Vercel's bandwidth —
the cost R2 was chosen to avoid.

## Security model

| Threat | Control |
|---|---|
| Knowing the URL | The URL alone shows only the access gate. Nothing else. |
| Guessing the code | bcrypt hashed, never stored plaintext. Rate limited to 8 attempts/hour/IP (`gallery:code`). |
| Enumerating galleries | Every failure returns an identical 401. A missing gallery still costs one bcrypt comparison against `DECOY_HASH`, so timing reveals nothing. |
| IDOR (`/gallery/A/photo/B`) | Every photo lookup is `findFirst` scoped by `galleryId`. There is no `galleryPhoto.findUnique` in client-facing code, and a test fails the build if one appears. |
| Permanent asset URLs | None exist. The bucket is private; every byte is a signed URL minted after a session check. |
| Leaked download link | Previews expire in 600s, **originals in 120s**. |
| Session theft from the DB | Only a SHA-256 of the session token is stored. |
| Revocation | Bumping `Gallery.accessEpoch` invalidates every outstanding session on its next request. |
| Tier escalation | The client names a tier; `authorizePhotoAccess` decides. Originals are refused unless `allowDownloadOriginals`. |
| Search engines | `noindex, nofollow` on the page, `/gallery/` disallowed in robots.txt, generic `<title>` that never contains a client name. |

Run the tests: `npm run test:galleries`

## Setup

### 1. Create the R2 bucket

1. Cloudflare dashboard → **R2** → **Create bucket** (e.g. `eleve-galleries`).
2. Keep it **private**. Do **not** enable the public `r2.dev` URL — a public
   bucket would bypass every access check above.
3. **Manage R2 API Tokens** → **Create API token** → *Object Read & Write*,
   scoped to this bucket.
4. Copy the Account ID, Access Key ID and Secret Access Key.

### 2. Environment variables

```bash
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
```

Add all four in Vercel → Settings → Environment Variables (Production, Preview
and Development), and to your local `.env`. Without them the admin upload route
returns a 503 that says exactly what is missing — it never silently degrades.

### 3. CORS on the bucket

The browser PUTs directly to R2, so the bucket needs to accept it. R2 → your
bucket → **Settings** → **CORS Policy**:

```json
[
  {
    "AllowedOrigins": ["https://elevevisuals.com", "http://localhost:3000"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

### 4. Migrate

```bash
npm run db:migrate
```

Production runs `prisma migrate deploy` automatically via `vercel-build`.
The migration is purely additive — eight new tables, zero `DROP` statements,
nothing touching an existing table.

## Storage layout

```
gallery/{galleryId}/
  originals/{photoId}.{ext}     as uploaded, untouched
  large/{photoId}.webp          3200px q88   print-quality download
  display/{photoId}.webp        1800px q82   lightbox
  thumbnails/{photoId}.webp      640px q72   grid
  archives/{archiveId}.zip      temporary
```

Grouped by gallery so deletion is one prefix sweep; split by variant so derived
versions can eventually be expired while originals are kept.

## End to end

1. **Admin → Galleries → New gallery.** Client, title, session type.
2. **Settings.** Expiry, downloads, quality, favourites. *Originals are off by
   default* — they are the only irreplaceable asset.
3. **Create.** The gallery is created as a draft and the access code is shown
   **once**. Only its bcrypt hash is stored.
4. **Upload.** Drag a batch in. Three concurrent lanes, real progress, per-file
   retry. States: `uploading → processing → ready | failed`.
5. **Publish.**
6. **Send** the link and code (there is a *Copy client message* button).
7. **Client** opens the link, enters the code, gets a 30-day session cookie.
8. **Client** views, favourites, downloads.
9. **Admin** sees views, unique access, favourites, downloads, last opened, and
   real storage usage read from the bucket.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Upload returns 503 | R2 env vars missing. The message names them. |
| Upload progress reaches 100% then fails | CORS on the bucket. See step 3. |
| A photo sits at `failed` | `processingError` on the row and the detail page say why. The file is kept; retry re-runs only that photo. |
| Client sees the gate again | Session revoked, code regenerated, gallery unpublished or expired. |
| Storage shows "Unknown" | The bucket could not be read. Not zero — unknown. Check credentials. |
| Gallery 404s for the client | It is a draft, expired, or archived. That is deliberate: a client is never told which. |

## Production-readiness audit, 2026-08-25

Seven defects found and fixed; each has a regression test confirmed to fail
against the pre-audit code.

| Severity | Defect | Fix |
|---|---|---|
| High | `gallery:download` was 60/hour, so a client saving a 400-photo wedding gallery hit "Too many downloads" partway through their own delivery | raised to 800 |
| High | `failOn: "none"` let Sharp accept a **truncated** upload, decode the bytes it had, and store the half-image as `ready` | `failOn: "truncated"` |
| Medium | Nothing ever wrote `status="expired"`, so the admin's expired filter returned an empty list forever — reading as "none expired" rather than "broken filter" | resolved against `expiresAt`, plus a cron that persists the status |
| Medium | Abandoned uploads left rows stuck at `uploading` invisible to client *and* admin, with no cleanup | `/api/cron/gallery-cleanup`, and the detail page now lists everything not `ready` |
| Medium | Destructive admin routes lacked the origin check this codebase applies to high-risk mutations | `rejectIfCrossOrigin` on PATCH and DELETE |
| Medium | Pre-signing display URLs put **496 KB** of live signed credentials into a 500-photo page for images the client may never open | display URLs minted on demand via `/photo/[id]/view` |
| Low | An extension taken from a filename could put slashes and CRLF into object keys | `safeExtension()` |

**Measured, not assumed:**

- presigned R2 URL: **508 chars**, 0.15 ms to sign
- Sharp: **279–847 ms** per photo, RSS **+34–85 MB** for 24–61 MP
- EXIF orientation 6 correctly reported as rotated; small originals never upscaled

**Not exploitable, verified rather than assumed:** a filename cannot escape the
gallery prefix. S3 and R2 keys are opaque strings and never resolve `..`, so
`deletePrefix` still reclaims everything. The fix is hygiene, not a breach.

## Not yet built

- ZIP "download everything" — `GalleryArchive` model and rate-limit bucket
  exist; the job runner does not.
- Comments/proofing — schema, flag and admin toggle exist; no UI.
- Watermarking — `watermarkBuffer()` exists and is tested by type only; it is
  not yet wired into the derivation step.
- Section management UI — every gallery gets one "Full Gallery" section; the
  client-side section navigation works, but sections cannot yet be added from
  the admin.
- Drag-to-reorder photos.
