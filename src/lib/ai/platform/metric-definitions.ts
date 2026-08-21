/**
 * ÉLEVÉ OS — Metric Integrity Layer.
 *
 * Documentation-as-code, not a computation engine. Every dashboard card, AI narrative, and
 * report that says "revenue," "pipeline," "booking," "inquiry"/"lead," "conversion," or
 * "visitor"/"session" should trace back to one of the definitions below. Most of the real
 * computation already exists and is correct — this module's job is making the *choice*
 * explicit and discoverable, not re-implementing it, so the same word can't quietly mean two
 * different numbers on two different pages again.
 *
 * If you're adding a new card or AI answer for one of these seven concepts, call the function
 * this file points to instead of writing a new Prisma query. If you find a real duplicate,
 * migrate it (see resolve-command-kpis.ts's revenue fields for the pattern) rather than adding
 * another one.
 */

export const METRIC_DEFINITIONS = {
  revenue: {
    concept: "revenue",
    definition:
      "Settled, source-verified cash: Payment rows with status='succeeded' AND verificationStatus='verified'. Calendar day/month boundaries.",
    canonicalWhere: "VERIFIED_SETTLED_PAYMENT_WHERE (src/lib/payments.ts)",
    canonicalFn: "getPaymentRevenueSummary() / getVerifiedRevenueByEmail() (src/lib/payments.ts)",
    policy:
      "Financial Center shows verified-only revenue — $0/Unknown when no settled payments exist, by design; it 'owns' this number per its own page copy. Other surfaces (Truth Registry, GROW Analytics, the AI assistant) may additionally show a clearly-labeled PIPELINE ESTIMATE (see `pipeline` below) as a planning aid when verified revenue is $0 or incomplete. This split is intentional: never blend the two into one unlabeled number.",
  },
  pipeline: {
    concept: "pipeline",
    definition:
      "Sum of self-reported budget estimates for OPEN deals only — excludes delivered/follow_up/archived and any other closed stage.",
    canonicalWhere: "isOpenPipelineValueStatus() (src/lib/booking-pipeline.ts)",
    canonicalFn: "getAdminPipeline().openPipelineValue (src/lib/admin-os-server.ts)",
    policy:
      "`openPipelineValue` is THE 'pipeline value' shown anywhere — Pipeline page banner, Dashboard KPI, GROW Analytics, AI Operations Truth Registry, AI assistant answers. `allStagesValue` (all 11 stages, including closed/archived deals) is a distinct, separately-labeled concept — 'all deals ever' — and must never be the default 'pipeline value.' This distinction exists because business-operator.ts used to silently return allStagesValue while labeling it 'Open Pipeline Value' everywhere downstream; that bug is why this file exists.",
  },
  booking: {
    concept: "booking",
    definition:
      "Submission rows WHERE type='booking'. No status exclusion — archived bookings still count as bookings; a booking doesn't stop being a booking because the deal closed or died.",
    canonicalWhere: "Submission WHERE type = 'booking'",
    canonicalFn: "Counted directly via prisma.submission.count / .findMany with type='booking'",
    policy:
      "'Growth vs. last month' for bookings uses CALENDAR month boundaries (1st of this month vs. 1st of last month), not a rolling 30-day window — this matches how a human reads 'vs last month' and is the convention business-operator.ts's month.bookingsChange already used. admin-os-server.ts's bookingGrowth was migrated to match; don't reintroduce a rolling-window variant without renaming it to something other than '...vs last month.'",
  },
  inquiry: {
    concept: "inquiry / lead",
    definition:
      "Submission rows WHERE type IN ('booking', 'contact'). EXCLUDES type='session' (ÉLEVÉ Sessions program applications) — this is a deliberate business-semantics decision, not an oversight: Sessions applications are a distinct casting/creative-program funnel with its own metric, not commercial lead volume.",
    canonicalWhere: "Submission WHERE type IN ('booking', 'contact')",
    canonicalFn: "getAdminDashboardOS().metrics.leads (src/lib/admin-os-server.ts)",
    policy:
      "ÉLEVÉ Sessions applications keep their own separate, already-correct metric — sessions.applications / SessionVolume — never blended into 'leads.' Calendar MTD boundary, matching the `booking` convention above.",
  },
  conversion: {
    concept: "conversion rate",
    definition:
      "All conversions (booking + contact + session AnalyticsEvent conversions) ÷ inquiry-intent pageviews (/book, /contact, /sessions/apply) over a trailing window.",
    canonicalWhere: "analytics-server.ts's getAnalyticsSummary()",
    canonicalFn: "getAnalyticsSummary(days).totals.conversionRate (src/lib/analytics-server.ts)",
    policy:
      "This is THE conversion rate — it already feeds truth-resolver.ts and ~40 other files. `analytics-funnel.ts`'s `bookingFunnelCompletionRate` (booking-form completions ÷ booking-form starts) measures a narrower, genuinely different thing — 'did someone who started the booking form finish it' — and must never be labeled 'conversion rate' in UI or narrative text; it was previously mislabeled that way on GROW Analytics' summary card. When computing a period-over-period CHANGE in conversion rate, isolate each period's own numerator/denominator first and divide once — never subtract two already-divided rates from windows of different or overlapping sizes (e.g. a 7-day rate minus a 30-day rate, or two cumulative-window rates), which doesn't measure anything meaningful. `inquiryViews` is exposed on getAnalyticsSummary()'s return specifically so callers can do this correctly.",
  },
  visitor: {
    concept: "visitor / session (site analytics)",
    definition:
      "Deduped by AnalyticsEvent.sessionId (a client-generated crypto.randomUUID() in sessionStorage — not a durable cross-visit visitor ID, resets every tab session).",
    canonicalWhere: "new Set(pageviews.map(p => p.sessionId)).size",
    canonicalFn: "getAnalyticsSummary(days).totals.uniqueSessions (src/lib/analytics-server.ts)",
    policy:
      "`uniqueSessions` is the one canonical figure for this concept. UI copy should say 'Site Sessions' or 'Web Sessions,' never bare 'Sessions' — ÉLEVÉ's own 'Sessions' product line (SessionVolume, casting/creative program) is a completely unrelated use of the same word. Fields literally named `visitors30`/`visitors7` used to hold RAW PAGEVIEW COUNTS (not deduped) in business-operator.ts, admin-os-server.ts, and types.ts — the name was the bug. Those fields are now `pageviews30`/`pageviews7`; a raw pageview count must never be presented as 'visitors.' Don't compute this with a second independent query when `uniqueSessions` is already available — GROW Analytics used to show 'Visitors' and 'Sessions' as two separate stat cards for what was, for a given window, the identical count computed twice.",
  },
  client: {
    concept: "client / contact",
    definition:
      "Three genuinely different things share the word 'contact' in this codebase — keep them apart: " +
      "(1) Client — a person, deduped by email, aggregated across EVERY submission type (booking + contact + session). " +
      "(2) contact submission — a single Submission row WHERE type='contact' (someone filled out the general contact form; an event, not a person). " +
      "(3) 'unique booking emails' — deduped by email but ONLY from booking submissions; narrower than (1), unrelated to (2).",
    canonicalWhere: "Client: no type filter, prisma.submission.findMany() grouped by contactEmail",
    canonicalFn: "getAdminCRMContacts() / buildCrmAggregates() (src/lib/admin-os-server.ts) — the /admin/crm page's own definition",
    policy:
      "The CRM page already gets this right and calls the cross-type person entity 'Clients,' never 'Contacts' — that's the terminology to extend elsewhere, not reinvent. `dashboard.metrics.subscribers` (booking-only unique emails) is a real, narrower, legitimately-scoped metric used for a couple of AI narrative lines (newsletter reach, sponsor-deck email growth) — it must never be labeled 'Contacts' or 'Clients,' since both of those already mean the broader cross-type entity. It was previously mislabeled 'Contacts' on the AI Operations Truth Registry (now 'Unique Booking Emails') and 'unique contacts in CRM' in a newsletter-recommendation narrative (now 'unique booking emails'). Note: reusing the narrower booking-only figure for 'newsletter reach' or 'email growth' likely undercounts real audience size (misses contact-form-only and session-only emails) — flagged as a separate, deliberately-not-fixed finding, not part of the terminology fix itself.",
  },
} as const;

export type MetricConceptId = keyof typeof METRIC_DEFINITIONS;
