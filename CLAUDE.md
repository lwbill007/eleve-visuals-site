# ÉLEVÉ Visuals — Development Context

Premium photography/film/creative-direction studio site with an operational admin OS (Pipeline, CRM, AI Operations, Financial Center) layered on top. Two audiences: the public marketing site and the internal admin panel used to actually run the business.

## Stack

Next.js 15 (App Router) · TypeScript · React 19 · Tailwind · Prisma 6 + PostgreSQL · Vercel (deploy) · Cloudflare (DNS/proxy in front of Vercel) · Stripe (deposits) · Resend (transactional email) · Vercel Blob (storage, public + private stores) · OpenRouter (primary LLM) with a local Ollama fallback.

## Core principles

1. Inspect before building — search for an existing function/component/pattern before writing a new one. This codebase has a strong existing-pattern-per-concern shape (see below); duplicating one instead of reusing it is the most common way to introduce drift.
2. Production is sacred — no destructive migrations, no bypassing payment/auth checks, no deleting prod data without explicit approval.
3. Never fabricate data. This is a load-bearing philosophy here, not a platitude — see "Anti-fabrication" below.
4. Never hardcode or log secrets. Real API keys live in Vercel env vars / `.env` (gitignored), never in code or commit messages.
5. Prefer the smallest correct change over a rewrite. Match existing file/component conventions exactly rather than introducing a new style.

## Anti-fabrication (read this before touching AI or metrics code)

The admin OS has a "Business Truth Registry" (`src/lib/ai/platform/truth-resolver.ts`) that labels every metric Verified / Calculated / Estimated / Predicted / Unknown based on real data provenance — never invents a number to fill a gap. The same philosophy shows up as `MissingMetricCard`/`OsCapabilityGrid` components across the admin UI: an unbuilt feature shows an honest "Unknown, here's what's required to unlock it" card instead of a fake value or a hidden section. When adding a new metric or AI-surfaced insight, follow this pattern — do not backfill a plausible-looking number for something not actually measured. A connector's health should reflect whether it *actually synced recently*, not just whether an env var is present (see `src/lib/ai/platform/connectors.ts`).

## Booking pipeline (canonical stages)

Defined in `src/lib/booking-pipeline.ts` (`PRODUCTION_STATUSES`) — this is the single source of truth, not any UI label list:

```
lead → qualified → discovery → proposal → booked → planning → production → editing → delivered → follow_up → archived
```

Contract signing and the Stripe deposit both happen client-side via a private per-booking link (`/b/[token]`, token-gated, no client login) while a booking sits at `proposal`. A cleared deposit auto-advances the booking to `booked` (`src/lib/payments.ts`). Stage changes are otherwise manual only (admin dropdown) — nothing else currently hooks into a status change.

## Payments

Stripe is wired for deposits only (50% of `estimateSubmissionValue()`, the one source of truth for a booking's dollar value — always call this rather than re-deriving pricing). Checkout Session creation: `src/lib/stripe-client.ts`. Webhook ingestion (already handles `payment_intent.succeeded`, `checkout.session.completed`, `charge.refunded`): `src/lib/payments.ts` + `src/app/api/webhooks/stripe/route.ts`, signature-verified by a hand-rolled HMAC check (no Stripe SDK in that one file, deliberately — don't add the SDK there without reason). Only `status: "succeeded" AND verificationStatus: "verified"` Payment rows count as real revenue anywhere in the app.

## AI layer

Every AI call funnels through `aiComplete()`/`aiStream()` in `src/lib/ai/adapter.ts` — that's the one chokepoint for provider routing, caching, and the daily call cap. Don't call OpenRouter/Ollama directly from feature code. `src/lib/admin-request-guard.ts`'s `guardMutatingAdminAi()` (rate-limit + CSRF) gates every mutating/LLM-costing admin route — apply it to new ones. OpenRouter's free tier has a daily request cap; when it's hit, features fall back to a rules-based path rather than failing — that's intentional, not a bug to "fix" in code.

## Database

Prisma + PostgreSQL only — never SQLite (`file:./dev.db` is explicitly wrong for this project). Local dev: `embedded-postgres` (see the vault's `Local Development.md`) needs no Docker, but is session-scoped — it doesn't survive a machine restart. `Submission.data` is a JSON string column (not a Prisma `Json` type) holding an evolving set of keys (`ops`, `qualification`, `contract`, `termsAccepted`, ...) — always `JSON.parse`/merge/`JSON.stringify` rather than clobbering the whole field, following the pattern in `src/app/api/admin/submissions/route.ts`.

## API conventions

Admin routes: `requireAdmin()` or `requireMinimumRole(role)` from `src/lib/auth.ts`. Public mutating routes (contract sign, deposit checkout, form submits): `checkRateLimit()` from `src/lib/rate-limit.ts`, keyed by a named bucket added to that file's `LIMITS` map. Client-scoped, unauthenticated access (contract signing, deposit payment) uses a short-purpose-scoped JWT pattern — see `src/lib/booking-access-token.ts` and `src/lib/session-upload-token.ts` for the two existing examples — reuse that pattern rather than inventing new auth for a new client-facing flow.

## Documentation

Deeper architecture notes, changelogs, and open issues live in a personal Obsidian vault at `eleve/` in this repo root — **gitignored, not shipped with the code**. Check `eleve/Open Issues.md` and `eleve/README.md` there for current in-progress work and known gaps before assuming something is finished or broken.
