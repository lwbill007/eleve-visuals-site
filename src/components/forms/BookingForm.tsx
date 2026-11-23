"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { BookingOptions, PageCopy } from "@/lib/types";
import {
  FormField,
  TextInput,
  TextArea,
  CheckboxField,
} from "@/components/ui/Form";
import { SubmitButton } from "@/components/ui/Button";
import { FormSpamFields, useFormSpam } from "@/components/forms/FormSpamFields";
import { BookingProgress } from "@/components/booking/BookingProgress";
import { BookingSuccess } from "@/components/booking/BookingSuccess";
import { PackageShowcase } from "@/components/booking/PackageShowcase";
import { BookingScopeSummary } from "@/components/booking/BookingScopeSummary";
import { trackConversion, trackEngagement, trackFunnel } from "@/lib/analytics-client";
import { readCampaignTag, type CampaignTag } from "@/lib/seasonal/inquiry-tag";
import {
  BOOKING_AUTOSAVE_KEY,
  BOOKING_STEPS,
  applyPackageSelection,
  composeProjectVision,
  initialBookingData,
  normalizeBookingPayload,
  type BookingFormData,
} from "@/lib/booking";
import { formatPackageRate, getPackageById } from "@/lib/booking-packages";
import { cn } from "@/lib/utils";
import {
  isValidEmail,
  isValidInstagram,
  formatPhone,
  getTodayDateString,
  mapApiErrorsToForm,
  type FormErrors,
} from "@/lib/utils";

function isFutureDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return value >= getTodayDateString();
}

function isValidOptionalUrl(value: string): boolean {
  if (!value.trim()) return true;
  return /^https?:\/\/.+/i.test(value.trim());
}

const FIELD_STEP: Partial<Record<keyof BookingFormData, number>> = {
  inquiryServiceId: 1,
  packageId: 1,
  budgetRange: 2,
  preferredDate: 2,
  projectTimeline: 2,
  flexibleDate: 2,
  feelingPrompt: 3,
  projectVision: 3,
  pinterestLink: 3,
  moodBoardUrl: 3,
  driveLink: 3,
  fullName: 4,
  email: 4,
  phone: 4,
  instagram: 4,
  referralSource: 4,
  termsAccepted: 4,
};

const ease = [0.16, 1, 0.3, 1] as const;
const BOOKING_DRAFT_TTL_MS = 2 * 60 * 60 * 1000;
const BOOKING_IDEMPOTENCY_KEY = "eleve-booking-idempotency-v1";

export function BookingForm({
  bookingOptions,
  bookPage,
  responseTime = "Within 24–48 hours on business days",
  initialPackageId = "",
}: {
  bookingOptions: BookingOptions;
  bookPage: PageCopy["bookPage"];
  responseTime?: string;
  initialPackageId?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<BookingFormData>(initialBookingData);
  const [errors, setErrors] = useState<FormErrors<BookingFormData>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [inquiryId, setInquiryId] = useState<string>();
  const [formError, setFormError] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);
  const [autosaved, setAutosaved] = useState(false);
  const spam = useFormSpam();
  const [minDate, setMinDate] = useState("");
  const idempotencyKeyRef = useRef("");
  const initialSelectionHandledRef = useRef(false);
  const campaignTagRef = useRef<CampaignTag | null>(null);

  useEffect(() => {
    campaignTagRef.current = readCampaignTag();
  }, []);

  const selectedPackage = useMemo(() => getPackageById(data.packageId), [data.packageId]);

  useEffect(() => {
    setMinDate(getTodayDateString());
  }, []);

  useEffect(() => {
    if (initialSelectionHandledRef.current) return;
    initialSelectionHandledRef.current = true;
    let restoredData: Partial<BookingFormData> | undefined;
    try {
      const raw = sessionStorage.getItem(BOOKING_AUTOSAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          savedAt?: number;
          data?: Pick<
            BookingFormData,
            | "inquiryServiceId"
            | "packageId"
            | "projectCategory"
            | "serviceTypes"
            | "deliverables"
            | "budgetRange"
            | "preferredDate"
            | "flexibleDate"
            | "location"
            | "sessionSetting"
            | "projectTimeline"
          >;
        };
        if (!parsed.savedAt || Date.now() - parsed.savedAt > BOOKING_DRAFT_TTL_MS) {
          sessionStorage.removeItem(BOOKING_AUTOSAVE_KEY);
        } else if (parsed.data?.packageId && getPackageById(parsed.data.packageId)) {
          restoredData = parsed.data;
          setDraftRestored(true);
        }
      }
    } catch {
      /* ignore */
    }

    const requestedPackage = getPackageById(initialPackageId);
    const restoredPackage = getPackageById(restoredData?.packageId ?? "");
    const selectedPackage = requestedPackage ?? restoredPackage;
    if (selectedPackage) {
      setData((prev) => ({
        ...applyPackageSelection({ ...prev, ...restoredData }, selectedPackage.id, {
          serviceTypes: bookingOptions.serviceTypes,
          deliverables: bookingOptions.deliverables,
          budgetRanges: bookingOptions.budgetRanges,
          durations: bookingOptions.durations,
        }),
        inquiryServiceId: selectedPackage.family,
      }));
      setStep(requestedPackage ? 1 : 2);
    }
  }, [bookingOptions, initialPackageId]);

  useEffect(() => {
    try {
      idempotencyKeyRef.current =
        sessionStorage.getItem(BOOKING_IDEMPOTENCY_KEY) || crypto.randomUUID();
      sessionStorage.setItem(BOOKING_IDEMPOTENCY_KEY, idempotencyKeyRef.current);
    } catch {
      idempotencyKeyRef.current = crypto.randomUUID();
    }
  }, []);

  useEffect(() => {
    const hasContent = Object.values(data).some((v) =>
      Array.isArray(v) ? v.length > 0 : typeof v === "boolean" ? v : typeof v === "string" && v.trim()
    );
    if (!hasContent || submitted) return;
    const timer = setTimeout(() => {
      try {
        const safeData = {
          inquiryServiceId: data.inquiryServiceId,
          packageId: data.packageId,
          projectCategory: data.projectCategory,
          serviceTypes: data.serviceTypes,
          deliverables: data.deliverables,
          budgetRange: data.budgetRange,
          preferredDate: data.preferredDate,
          flexibleDate: data.flexibleDate,
          location: data.location,
          sessionSetting: data.sessionSetting,
          projectTimeline: data.projectTimeline,
        };
        sessionStorage.setItem(
          BOOKING_AUTOSAVE_KEY,
          JSON.stringify({ savedAt: Date.now(), data: safeData })
        );
        setAutosaved(true);
      } catch {
        /* storage full */
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [data, submitted]);

  useEffect(() => {
    if (!autosaved) return;
    const hide = setTimeout(() => setAutosaved(false), 2000);
    return () => clearTimeout(hide);
  }, [autosaved]);

  useEffect(() => {
    if (!draftRestored) return;
    const hide = setTimeout(() => setDraftRestored(false), 4000);
    return () => clearTimeout(hide);
  }, [draftRestored]);

  useEffect(() => {
    if (submitted) return;
    trackEngagement({
      event: "form_step",
      path: "/book",
      step,
      label: BOOKING_STEPS[step - 1]?.label ?? `Step ${step}`,
    });
  }, [step, submitted]);

  const update = useCallback(<K extends keyof BookingFormData>(key: K, value: BookingFormData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setFormError("");
  }, []);

  const getStepErrors = (s: number): FormErrors<BookingFormData> => {
    const e: FormErrors<BookingFormData> = {};
    if (s === 1) {
      if (!data.packageId) {
        e.packageId = "Select an experience to continue";
      }
    }
    if (s === 2) {
      if (data.preferredDate && !isFutureDate(data.preferredDate)) {
        e.preferredDate = "Choose today or a future date";
      }
      if (data.flexibleDate && !isFutureDate(data.flexibleDate)) {
        e.flexibleDate = "Invalid date";
      } else if (
        data.preferredDate &&
        data.flexibleDate &&
        data.flexibleDate < data.preferredDate
      ) {
        e.flexibleDate = "Latest workable date must be on or after your preferred date";
      }
    }
    if (s === 3) {
      if (data.feelingPrompt.trim() && data.feelingPrompt.trim().length < 10) {
        e.feelingPrompt = "At least 10 characters, or leave blank";
      }
      if (!isValidOptionalUrl(data.pinterestLink)) e.pinterestLink = "Invalid URL";
      if (!isValidOptionalUrl(data.moodBoardUrl)) e.moodBoardUrl = "Invalid URL";
      if (!isValidOptionalUrl(data.driveLink)) e.driveLink = "Invalid URL";
    }
    if (s === 4) {
      if (!data.fullName.trim()) e.fullName = "Required";
      if (!isValidEmail(data.email)) e.email = "Valid email required";
      const digits = data.phone.replace(/\D/g, "");
      if (digits.length < 10) e.phone = "Enter a valid phone number";
      if (data.instagram && !isValidInstagram(data.instagram)) e.instagram = "Invalid handle";
      if (!data.termsAccepted) e.termsAccepted = "Please accept the terms";
    }
    return e;
  };

  const goNext = () => {
    const e = getStepErrors(step);
    if (Object.keys(e).length) {
      setErrors(e);
      const first = Object.keys(e)[0];
      requestAnimationFrame(() => document.getElementById(first)?.focus());
      return;
    }
    setErrors({});
    const funnelLabel =
      step === 1
        ? "booking_step_1"
        : step === 2
          ? "booking_step_2"
          : step === 3
            ? "booking_step_3"
            : "booking_step_4";
    trackFunnel(funnelLabel, {
      path: "/book",
      step,
      ...(campaignTagRef.current ? { metadata: { ...campaignTagRef.current } } : {}),
    });
    setStep((s) => Math.min(s + 1, BOOKING_STEPS.length));
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const goBack = () => {
    setErrors({});
    setFormError("");
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    const e = getStepErrors(4);
    if (Object.keys(e).length) {
      setErrors(e);
      const first = Object.keys(e)[0];
      requestAnimationFrame(() => document.getElementById(first)?.focus());
      return;
    }

    if (!spam.canSubmit()) {
      setFormError("Complete the security check to submit.");
      return;
    }

    trackFunnel("booking_step_4", { path: "/book", step: 4 });
    setLoading(true);
    setFormError("");
    try {
      const projectVision = composeProjectVision({
        ...data,
        projectVision: data.projectVision.trim() || data.feelingPrompt.trim(),
        purpose: data.purpose.trim() || data.feelingPrompt.trim(),
        goals: data.goals.trim() || data.inspirationPrompt.trim(),
      });

      const composed = {
        ...data,
        welcomeAccepted: true,
        projectVision,
        purpose: data.purpose.trim() || data.feelingPrompt.trim(),
        goals: data.goals.trim() || data.inspirationPrompt.trim(),
      };

      const payload = {
        ...normalizeBookingPayload(composed as unknown as Record<string, unknown>, bookingOptions),
        idempotencyKey: idempotencyKeyRef.current || crypto.randomUUID(),
        ...(campaignTagRef.current ?? {}),
        ...spam.spamPayload(),
      };

      const res = await fetch("/api/submit/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        inquiryId?: string;
        error?: string;
        details?: Record<string, string[]>;
      };

      if (!res.ok || !json.ok || !json.inquiryId) {
        if (json.details) {
          const mapped = mapApiErrorsToForm<BookingFormData>(
            { error: json.error, details: json.details },
            "fullName"
          );
          setErrors(mapped);
          const firstKey = Object.keys(mapped)[0] as keyof BookingFormData | undefined;
          if (firstKey && FIELD_STEP[firstKey]) {
            setStep(FIELD_STEP[firstKey]!);
          }
        }
        setFormError(json.error || "Something went wrong. Please try again.");
        return;
      }

      try {
        sessionStorage.removeItem(BOOKING_AUTOSAVE_KEY);
        sessionStorage.removeItem(BOOKING_IDEMPOTENCY_KEY);
      } catch {
        /* ignore */
      }
      trackConversion("booking");
      trackFunnel("submission_completed", {
        path: "/book",
        ...(campaignTagRef.current ? { metadata: { ...campaignTagRef.current } } : {}),
      });
      setInquiryId(json.inquiryId);
      setSubmitted(true);
    } catch {
      setFormError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <BookingSuccess
        title={bookPage.successTitle}
        message={bookPage.successMessage}
        nextSteps={bookPage.nextSteps}
        inquiryId={inquiryId}
        status="lead"
        packageName={selectedPackage?.name}
        responseTime={responseTime}
      />
    );
  }

  return (
    <div className="relative pb-28 md:pb-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <BookingProgress currentStep={step} />
        <div className="flex items-center gap-3 text-xs text-muted" aria-live="polite">
          {draftRestored && <span className="text-accent">Draft restored</span>}
          {autosaved && <span>Saved</span>}
          <span className="text-cream-dim">Reply {responseTime}</span>
        </div>
      </div>

      <p className="mb-8 max-w-2xl text-sm text-fog">
        This is an inquiry — not an instant booking or payment. Share the essentials; we refine
        creative scope together after you submit.
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
          transition={{ duration: 0.45, ease }}
        >
          {step === 1 && (
            <section className="space-y-6">
              <PackageShowcase
                selectedId={data.packageId}
                error={errors.packageId}
                onSelect={(pkg) => {
                  setData((prev) => ({
                    ...applyPackageSelection(prev, pkg.id, {
                      serviceTypes: bookingOptions.serviceTypes,
                      deliverables: bookingOptions.deliverables,
                      budgetRanges: bookingOptions.budgetRanges,
                      durations: bookingOptions.durations,
                    }),
                    inquiryServiceId: pkg.family,
                  }));
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.inquiryServiceId;
                    delete next.packageId;
                    return next;
                  });
                  trackEngagement({
                    event: "cta_click",
                    path: "/book",
                    label: `package_${pkg.id}`,
                  });
                }}
              />
              <p className="border-l border-accent/40 pl-4 text-sm leading-relaxed text-fog">
                ÉLEVÉ Sessions is a separate casting experience, not a client package.{" "}
                <Link href="/sessions" className="text-accent link-underline">
                  Browse the currently open volume
                </Link>
                .
              </p>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-6">
              <div>
                <p className="label-caps text-accent">Step 2 · Plan the logistics</p>
                <h2 className="font-display mt-2 text-3xl text-cream md:text-4xl">
                  Where and when should we create?
                </h2>
                <p className="mt-3 max-w-2xl text-sm text-fog md:text-base">
                  Your package already sets the starting budget. These details help us identify
                  travel, studio, access, or scheduling needs before we quote anything additional.
                </p>
              </div>

              {selectedPackage && (
                <BookingScopeSummary pkg={selectedPackage} onChange={() => setStep(1)} />
              )}

              <FormField label="City or location (optional)" name="location">
                <TextInput
                  id="location"
                  value={data.location}
                  onChange={(e) => update("location", e.target.value)}
                  placeholder="Sacramento, Oakland, a venue, or undecided"
                />
              </FormField>

              <FormField label="Preferred setting (optional)" name="sessionSetting">
                <div
                  className="grid gap-2 sm:grid-cols-2"
                  role="radiogroup"
                  aria-label="Preferred setting"
                >
                  {[...bookingOptions.sessionSettings, "Not sure yet"].map((setting) => {
                    const selected = data.sessionSetting === setting;
                    return (
                      <button
                        key={setting}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => update("sessionSetting", setting)}
                        className={cn(
                          "min-h-12 border px-4 py-3 text-left text-sm transition-colors",
                          selected
                            ? "border-accent bg-accent/10 text-cream"
                            : "border-stone/35 text-fog hover:border-cream/30"
                        )}
                      >
                        {setting}
                      </button>
                    );
                  })}
                </div>
              </FormField>

              <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  label="Preferred date (optional)"
                  error={errors.preferredDate}
                  name="preferredDate"
                >
                  <TextInput
                    id="preferredDate"
                    type="date"
                    min={minDate}
                    value={data.preferredDate}
                    onChange={(e) => update("preferredDate", e.target.value)}
                    aria-invalid={!!errors.preferredDate}
                  />
                </FormField>
                <FormField
                  label="Latest workable date (optional)"
                  error={errors.flexibleDate}
                  name="flexibleDate"
                >
                  <TextInput
                    id="flexibleDate"
                    type="date"
                    min={minDate}
                    value={data.flexibleDate}
                    onChange={(e) => update("flexibleDate", e.target.value)}
                    aria-invalid={!!errors.flexibleDate}
                  />
                </FormField>
              </div>

              <FormField
                label="Timeline notes (optional)"
                error={errors.projectTimeline}
                name="projectTimeline"
              >
                <TextInput
                  id="projectTimeline"
                  value={data.projectTimeline}
                  onChange={(e) => update("projectTimeline", e.target.value)}
                  placeholder="Launch date, event window, or ASAP…"
                />
              </FormField>

              <p className="border-l border-accent/40 pl-4 text-sm leading-relaxed text-fog">
                No payment is collected here. If your request adds cost, the amount and reason
                appear in writing before you decide whether to book.
              </p>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-6">
              <div>
                <p className="label-caps text-accent">Step 3 · Optional</p>
                <h2 className="font-display mt-2 text-3xl text-cream md:text-4xl">
                  Share a spark of vision
                </h2>
                <p className="mt-3 max-w-2xl text-sm text-fog md:text-base">
                  Skip anything you don&apos;t have yet. We refine creative direction after your inquiry.
                </p>
              </div>

              <FormField
                label="What should people feel when they see this work?"
                error={errors.feelingPrompt}
                name="feelingPrompt"
              >
                <TextArea
                  id="feelingPrompt"
                  rows={4}
                  value={data.feelingPrompt}
                  onChange={(e) => update("feelingPrompt", e.target.value)}
                  aria-invalid={!!errors.feelingPrompt}
                  placeholder="Confidence. Momentum. Softness. Authority…"
                />
              </FormField>

              <div className="grid gap-5 md:grid-cols-2">
                <FormField label="Pinterest / mood board URL" error={errors.pinterestLink} name="pinterestLink">
                  <TextInput
                    id="pinterestLink"
                    type="url"
                    value={data.pinterestLink}
                    onChange={(e) => update("pinterestLink", e.target.value)}
                    placeholder="https://"
                  />
                </FormField>
                <FormField label="Mood board / Drive link" error={errors.moodBoardUrl} name="moodBoardUrl">
                  <TextInput
                    id="moodBoardUrl"
                    type="url"
                    value={data.moodBoardUrl || data.driveLink}
                    onChange={(e) => {
                      update("moodBoardUrl", e.target.value);
                      update("driveLink", e.target.value);
                    }}
                    placeholder="https://"
                  />
                </FormField>
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="space-y-6">
              <div>
                <p className="label-caps text-accent">Step 4</p>
                <h2 className="font-display mt-2 text-3xl text-cream md:text-4xl">
                  How do we reach you?
                </h2>
                <p className="mt-3 max-w-2xl text-sm text-fog md:text-base">
                  Expect a personal reply {responseTime} with next steps.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <FormField label="Full name" error={errors.fullName} name="fullName" required>
                  <TextInput
                    id="fullName"
                    autoComplete="name"
                    value={data.fullName}
                    onChange={(e) => update("fullName", e.target.value)}
                    aria-invalid={!!errors.fullName}
                  />
                </FormField>
                <FormField label="Email" error={errors.email} name="email" required>
                  <TextInput
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={data.email}
                    onChange={(e) => update("email", e.target.value)}
                    aria-invalid={!!errors.email}
                  />
                </FormField>
                <FormField label="Phone" error={errors.phone} name="phone" required>
                  <TextInput
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    value={data.phone}
                    onChange={(e) => update("phone", formatPhone(e.target.value))}
                    aria-invalid={!!errors.phone}
                  />
                </FormField>
                <FormField label="Instagram (optional)" error={errors.instagram} name="instagram">
                  <TextInput
                    id="instagram"
                    value={data.instagram}
                    onChange={(e) => update("instagram", e.target.value)}
                    placeholder="@handle"
                    aria-invalid={!!errors.instagram}
                  />
                </FormField>
              </div>

              <FormField label="How did you find ÉLEVÉ? (optional)" error={errors.referralSource} name="referralSource">
                <select
                  id="referralSource"
                  className="min-h-12 w-full border border-stone/40 bg-ink px-4 text-sm text-cream"
                  value={data.referralSource}
                  onChange={(e) => update("referralSource", e.target.value)}
                >
                  <option value="">Select…</option>
                  {bookingOptions.referralSources.map((src) => (
                    <option key={src} value={src}>
                      {src}
                    </option>
                  ))}
                </select>
              </FormField>

              <CheckboxField
                name="termsAccepted"
                checked={data.termsAccepted}
                onChange={(e) => update("termsAccepted", e.target.checked)}
                error={errors.termsAccepted}
                label={
                  <>
                    I agree to the{" "}
                    <Link href="/booking-terms" className="text-accent link-underline">
                      booking terms
                    </Link>
                    . This submits an inquiry only — no payment.
                  </>
                }
              />

              <FormSpamFields
                honeypot={spam.honeypot}
                onHoneypotChange={spam.setHoneypot}
                formLoadedAt={spam.formLoadedAt}
                turnstileToken={spam.turnstileToken}
                onTurnstileVerify={spam.setTurnstileToken}
                onTurnstileExpire={() => spam.setTurnstileToken("")}
              />

              {selectedPackage && (
                <BookingScopeSummary pkg={selectedPackage} heading="Review before submitting" />
              )}
            </section>
          )}
        </motion.div>
      </AnimatePresence>

      {formError && (
        <p className="mt-6 text-sm text-red-300" role="alert">
          {formError}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone/30 bg-ink/95 backdrop-blur-md md:static md:mt-10 md:border-0 md:bg-transparent md:backdrop-blur-none">
        <div className="container-wide flex max-w-6xl items-center justify-between gap-3 px-5 py-3 md:px-0 md:py-0">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 1}
            className="min-h-11 px-4 text-xs tracking-[0.15em] text-fog uppercase disabled:opacity-30"
          >
            Back
          </button>
          {step < BOOKING_STEPS.length ? (
            <div className="flex items-center gap-3">
              {selectedPackage && (
                <span className="hidden text-right text-xs text-fog sm:block">
                  {selectedPackage.name}<br />
                  <span className="text-cream">{formatPackageRate(selectedPackage)}</span>
                </span>
              )}
              <button
                type="button"
                onClick={goNext}
                className="min-h-12 bg-cream px-6 text-xs tracking-[0.15em] text-ink uppercase sm:px-8"
              >
                {step === 3 ? "Review inquiry" : step === 1 ? "Plan this package" : "Continue"}
              </button>
            </div>
          ) : (
            <SubmitButton
              type="button"
              loading={loading}
              onClick={handleSubmit}
              className="min-h-12"
            >
              Submit inquiry
            </SubmitButton>
          )}
        </div>
      </div>
    </div>
  );
}
