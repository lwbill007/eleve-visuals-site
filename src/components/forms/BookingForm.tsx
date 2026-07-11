"use client";

import { useCallback, useEffect, useState } from "react";
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
import { CategoryGrid, SelectableGrid } from "@/components/booking/SelectableCard";
import { BookingSuccess } from "@/components/booking/BookingSuccess";
import { trackConversion, trackEngagement } from "@/lib/analytics-client";
import {
  BOOKING_AUTOSAVE_KEY,
  BOOKING_STEPS,
  PROJECT_CATEGORIES,
  composeProjectVision,
  initialBookingData,
  serviceTypesFromCategory,
  type BookingFormData,
} from "@/lib/booking";
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
  fullName: 1,
  email: 1,
  phone: 1,
  instagram: 1,
  website: 1,
  projectCategory: 2,
  serviceTypes: 2,
  purpose: 3,
  goals: 3,
  audience: 3,
  creativeDirection: 3,
  projectVision: 3,
  pinterestLink: 4,
  moodBoardUrl: 4,
  inspirationInstagram: 4,
  driveLink: 4,
  preferredDate: 5,
  flexibleDate: 5,
  location: 5,
  sessionSetting: 5,
  duration: 5,
  budgetRange: 6,
  projectTimeline: 6,
  deliverables: 6,
  referralSource: 7,
  termsAccepted: 7,
};

export function BookingForm({
  bookingOptions,
  bookPage,
}: {
  bookingOptions: BookingOptions;
  bookPage: PageCopy["bookPage"];
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

  useEffect(() => {
    setMinDate(getTodayDateString());
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BOOKING_AUTOSAVE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<BookingFormData> & { step?: number };
      setData((prev) => ({ ...prev, ...parsed }));
      if (parsed.step && parsed.step >= 1 && parsed.step <= BOOKING_STEPS.length) {
        setStep(parsed.step);
      }
      setDraftRestored(true);
    } catch {
      /* ignore corrupt draft */
    }
  }, []);

  useEffect(() => {
    const hasContent = Object.values(data).some((v) =>
      Array.isArray(v) ? v.length > 0 : typeof v === "boolean" ? v : typeof v === "string" && v.trim()
    );
    if (!hasContent || submitted) return;

    const timer = setTimeout(() => {
      try {
        localStorage.setItem(BOOKING_AUTOSAVE_KEY, JSON.stringify({ ...data, step }));
        setAutosaved(true);
      } catch {
        /* storage full */
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [data, step, submitted]);

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
      if (!data.fullName.trim()) e.fullName = "Required";
      if (!isValidEmail(data.email)) e.email = "Valid email required";
      const digits = data.phone.replace(/\D/g, "");
      if (digits.length < 10) e.phone = "Enter a valid phone number";
      if (data.instagram && !isValidInstagram(data.instagram)) e.instagram = "Invalid handle";
    }
    if (s === 2) {
      if (!data.projectCategory) e.projectCategory = "Select what we're creating";
    }
    if (s === 3) {
      if (!data.purpose.trim()) e.purpose = "Required";
      if (!data.goals.trim()) e.goals = "Required";
      if (data.projectVision.trim().length < 10) e.projectVision = "At least 10 characters";
    }
    if (s === 4) {
      if (!isValidOptionalUrl(data.pinterestLink)) e.pinterestLink = "Invalid URL";
      if (!isValidOptionalUrl(data.moodBoardUrl)) e.moodBoardUrl = "Invalid URL";
      if (!isValidOptionalUrl(data.driveLink)) e.driveLink = "Invalid URL";
    }
    if (s === 5) {
      if (!isFutureDate(data.preferredDate)) e.preferredDate = "Choose today or a future date";
      if (data.flexibleDate && !isFutureDate(data.flexibleDate)) e.flexibleDate = "Invalid date";
      if (!data.location.trim()) e.location = "Required";
      if (!data.sessionSetting) e.sessionSetting = "Required";
      if (!data.duration) e.duration = "Required";
    }
    if (s === 6) {
      if (!data.budgetRange) e.budgetRange = "Required";
      if (data.deliverables.length === 0) e.deliverables = "Select at least one";
    }
    if (s === 7) {
      if (!data.referralSource) e.referralSource = "Required";
      if (!data.termsAccepted) e.termsAccepted = "Please accept the terms";
    }
    return e;
  };

  const validateStep = (s: number) => {
    const e = getStepErrors(s);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateAllSteps = (): number | null => {
    for (let s = 1; s <= BOOKING_STEPS.length; s++) {
      if (Object.keys(getStepErrors(s)).length > 0) return s;
    }
    return null;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, BOOKING_STEPS.length));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const jumpToField = (field: keyof BookingFormData) => {
    const target = FIELD_STEP[field] ?? 7;
    setStep(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
    requestAnimationFrame(() => {
      document.getElementById(String(field))?.focus();
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalidStep = validateAllSteps();
    if (invalidStep !== null) {
      setStep(invalidStep);
      setFormError("Please complete the highlighted fields.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!spam.canSubmit()) {
      setFormError("Complete the security check below to submit.");
      return;
    }

    setLoading(true);
    setFormError("");
    try {
      const vision = composeProjectVision(data);
      const serviceTypes =
        data.serviceTypes.length > 0
          ? data.serviceTypes
          : serviceTypesFromCategory(data.projectCategory, bookingOptions.serviceTypes);

      const res = await fetch("/api/submit/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          projectVision: vision || data.projectVision,
          serviceTypes,
          ...spam.spamPayload(),
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        inquiryId?: string;
        error?: string;
        details?: unknown;
      };

      if (!res.ok) {
        const mapped = mapApiErrorsToForm<BookingFormData>(
          {
            error: payload.error,
            details:
              payload.details && typeof payload.details === "object"
                ? (payload.details as Record<string, string[] | undefined>)
                : undefined,
          },
          "fullName",
          res.status === 429
        );
        setErrors(mapped);
        const firstKey = Object.keys(mapped)[0] as keyof BookingFormData | undefined;
        setFormError(
          res.status === 429
            ? "Too many submissions — try again later."
            : payload.error || "Something went wrong. Please review and try again."
        );
        if (firstKey) jumpToField(firstKey);
        return;
      }

      if (typeof payload.inquiryId !== "string" || !payload.inquiryId) {
        setFormError("We couldn't confirm your inquiry. Please try again or contact us.");
        return;
      }

      setInquiryId(payload.inquiryId);
      localStorage.removeItem(BOOKING_AUTOSAVE_KEY);
      trackConversion("booking");
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setFormError("Network error — check your connection and try again.");
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
      />
    );
  }

  const stepMotion = reduceMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } }
    : {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 },
      };

  return (
    <form onSubmit={handleSubmit} noValidate className="relative">
      <div className="mb-10">
        <BookingProgress currentStep={step} />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2" aria-live="polite">
          {draftRestored && (
            <span className="text-[0.65rem] tracking-[0.12em] text-accent uppercase">
              Draft restored
            </span>
          )}
          {autosaved && (
            <span className="ml-auto text-[0.65rem] tracking-[0.15em] text-muted uppercase">
              Draft saved
            </span>
          )}
        </div>
      </div>

      {formError && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
        >
          {formError}
        </div>
      )}

      <div className="rounded-none border border-stone/30 bg-charcoal/20 p-6 backdrop-blur-sm md:p-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={stepMotion.initial}
            animate={stepMotion.animate}
            exit={stepMotion.exit}
            transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === 1 && (
              <fieldset className="space-y-6">
                <legend className="font-display mb-2 block text-2xl text-cream">About You</legend>
                <p className="mb-6 text-sm text-fog">
                  So we know who we&apos;re creating with.
                </p>
                <div className="grid gap-6 md:grid-cols-2">
                  <FormField label="Full Name" name="fullName" required error={errors.fullName}>
                    <TextInput
                      id="fullName"
                      name="fullName"
                      value={data.fullName}
                      onChange={(e) => update("fullName", e.target.value)}
                      error={!!errors.fullName}
                      aria-invalid={!!errors.fullName}
                      autoComplete="name"
                    />
                  </FormField>
                  <FormField label="Email" name="email" required error={errors.email}>
                    <TextInput
                      id="email"
                      name="email"
                      type="email"
                      value={data.email}
                      onChange={(e) => update("email", e.target.value)}
                      error={!!errors.email}
                      aria-invalid={!!errors.email}
                      autoComplete="email"
                    />
                  </FormField>
                  <FormField label="Phone" name="phone" required error={errors.phone}>
                    <TextInput
                      id="phone"
                      name="phone"
                      type="tel"
                      value={data.phone}
                      onChange={(e) => update("phone", formatPhone(e.target.value))}
                      error={!!errors.phone}
                      aria-invalid={!!errors.phone}
                      autoComplete="tel"
                    />
                  </FormField>
                  <FormField label="Instagram" name="instagram" error={errors.instagram} hint="Optional">
                    <TextInput
                      id="instagram"
                      name="instagram"
                      value={data.instagram}
                      onChange={(e) => update("instagram", e.target.value)}
                      error={!!errors.instagram}
                      placeholder="@handle"
                    />
                  </FormField>
                  <FormField label="Website" name="website" className="md:col-span-2" hint="Optional">
                    <TextInput
                      id="website"
                      name="website"
                      value={data.website}
                      onChange={(e) => update("website", e.target.value)}
                      placeholder="https://"
                    />
                  </FormField>
                </div>
              </fieldset>
            )}

            {step === 2 && (
              <fieldset className="space-y-6">
                <legend className="font-display mb-2 block text-2xl text-cream">
                  What Are We Creating?
                </legend>
                <p className="mb-6 text-sm text-fog">
                  Choose the production shape that fits — we&apos;ll refine the brief together.
                </p>
                <CategoryGrid
                  options={PROJECT_CATEGORIES.map((c) => ({
                    id: c.id,
                    label: c.label,
                    description: c.description,
                  }))}
                  selected={data.projectCategory}
                  onSelect={(id) => update("projectCategory", id)}
                />
                {errors.projectCategory && (
                  <p className="field-error" role="alert">
                    {errors.projectCategory}
                  </p>
                )}
                <div className="pt-4">
                  <p className="mb-3 text-sm text-cream-dim">Detail services (optional)</p>
                  <SelectableGrid
                    options={bookingOptions.serviceTypes}
                    selected={data.serviceTypes}
                    multi
                    onToggle={(v) => {
                      const next = data.serviceTypes.includes(v)
                        ? data.serviceTypes.filter((x) => x !== v)
                        : [...data.serviceTypes, v];
                      update("serviceTypes", next);
                    }}
                  />
                </div>
              </fieldset>
            )}

            {step === 3 && (
              <fieldset className="space-y-6">
                <legend className="font-display mb-2 block text-2xl text-cream">Vision</legend>
                <p className="mb-6 text-sm text-fog">
                  Purpose, goals, audience, and the story we&apos;re telling.
                </p>
                <FormField label="Purpose" name="purpose" required error={errors.purpose}>
                  <TextArea
                    id="purpose"
                    name="purpose"
                    rows={3}
                    value={data.purpose}
                    onChange={(e) => update("purpose", e.target.value)}
                    error={!!errors.purpose}
                    placeholder="Why does this project matter?"
                  />
                </FormField>
                <FormField label="Goals" name="goals" required error={errors.goals}>
                  <TextArea
                    id="goals"
                    name="goals"
                    rows={3}
                    value={data.goals}
                    onChange={(e) => update("goals", e.target.value)}
                    error={!!errors.goals}
                    placeholder="What does success look like?"
                  />
                </FormField>
                <FormField label="Audience" name="audience" hint="Optional">
                  <TextInput
                    id="audience"
                    name="audience"
                    value={data.audience}
                    onChange={(e) => update("audience", e.target.value)}
                    placeholder="Who is this for?"
                  />
                </FormField>
                <FormField label="Creative direction" name="creativeDirection" hint="Optional">
                  <TextArea
                    id="creativeDirection"
                    name="creativeDirection"
                    rows={3}
                    value={data.creativeDirection}
                    onChange={(e) => update("creativeDirection", e.target.value)}
                    placeholder="Tone, aesthetic, references…"
                  />
                </FormField>
                <FormField label="Story" name="projectVision" required error={errors.projectVision}>
                  <TextArea
                    id="projectVision"
                    name="projectVision"
                    rows={4}
                    value={data.projectVision}
                    onChange={(e) => update("projectVision", e.target.value)}
                    error={!!errors.projectVision}
                    placeholder="Tell us the narrative behind the work."
                  />
                </FormField>
              </fieldset>
            )}

            {step === 4 && (
              <fieldset className="space-y-6">
                <legend className="font-display mb-2 block text-2xl text-cream">Inspiration</legend>
                <p className="mb-6 text-sm text-fog">
                  Links to mood boards and references. File uploads coming soon — Drive/Dropbox links
                  work today.
                </p>
                <FormField label="Pinterest" name="pinterestLink" error={errors.pinterestLink}>
                  <TextInput
                    id="pinterestLink"
                    value={data.pinterestLink}
                    onChange={(e) => update("pinterestLink", e.target.value)}
                    error={!!errors.pinterestLink}
                    placeholder="https://"
                  />
                </FormField>
                <FormField label="Mood board URL" name="moodBoardUrl" error={errors.moodBoardUrl}>
                  <TextInput
                    id="moodBoardUrl"
                    value={data.moodBoardUrl}
                    onChange={(e) => update("moodBoardUrl", e.target.value)}
                    error={!!errors.moodBoardUrl}
                    placeholder="https://"
                  />
                </FormField>
                <FormField label="Inspiration Instagram" name="inspirationInstagram">
                  <TextInput
                    id="inspirationInstagram"
                    value={data.inspirationInstagram}
                    onChange={(e) => update("inspirationInstagram", e.target.value)}
                    placeholder="@account or URL"
                  />
                </FormField>
                <FormField
                  label="Brand assets / Drive"
                  name="driveLink"
                  error={errors.driveLink}
                  hint="Logo, guidelines, previous work"
                >
                  <TextInput
                    id="driveLink"
                    value={data.driveLink}
                    onChange={(e) => update("driveLink", e.target.value)}
                    error={!!errors.driveLink}
                    placeholder="https://"
                  />
                </FormField>
              </fieldset>
            )}

            {step === 5 && (
              <fieldset className="space-y-6">
                <legend className="font-display mb-2 block text-2xl text-cream">Planning</legend>
                <p className="mb-6 text-sm text-fog">Dates, location, and how we shoot.</p>
                <div className="grid gap-6 md:grid-cols-2">
                  <FormField label="Preferred date" name="preferredDate" required error={errors.preferredDate}>
                    <TextInput
                      id="preferredDate"
                      type="date"
                      min={minDate}
                      value={data.preferredDate}
                      onChange={(e) => update("preferredDate", e.target.value)}
                      error={!!errors.preferredDate}
                    />
                  </FormField>
                  <FormField label="Flexible alternate" name="flexibleDate" error={errors.flexibleDate}>
                    <TextInput
                      id="flexibleDate"
                      type="date"
                      min={minDate}
                      value={data.flexibleDate}
                      onChange={(e) => update("flexibleDate", e.target.value)}
                      error={!!errors.flexibleDate}
                    />
                  </FormField>
                </div>
                <FormField label="Location" name="location" required error={errors.location}>
                  <TextInput
                    id="location"
                    value={data.location}
                    onChange={(e) => update("location", e.target.value)}
                    error={!!errors.location}
                    placeholder="City, venue, or 'open to recommendations'"
                  />
                </FormField>
                <div>
                  <p className="mb-3 text-sm text-cream-dim">
                    Session setting <span className="text-accent">*</span>
                  </p>
                  <SelectableGrid
                    options={bookingOptions.sessionSettings}
                    selected={data.sessionSetting}
                    onToggle={(v) => update("sessionSetting", v)}
                    columns="xs:grid-cols-2"
                  />
                  {errors.sessionSetting && (
                    <p className="field-error mt-2">{errors.sessionSetting}</p>
                  )}
                </div>
                <div>
                  <p className="mb-3 text-sm text-cream-dim">
                    Estimated duration <span className="text-accent">*</span>
                  </p>
                  <SelectableGrid
                    options={bookingOptions.durations}
                    selected={data.duration}
                    onToggle={(v) => update("duration", v)}
                    columns="xs:grid-cols-2"
                  />
                  {errors.duration && <p className="field-error mt-2">{errors.duration}</p>}
                </div>
              </fieldset>
            )}

            {step === 6 && (
              <fieldset className="space-y-6">
                <legend className="font-display mb-2 block text-2xl text-cream">Investment</legend>
                <p className="mb-6 text-sm text-fog">
                  Investment range and deliverables — we&apos;ll tailor a proposal, not a price list.
                </p>
                <div>
                  <p className="mb-3 text-sm text-cream-dim">
                    Investment range <span className="text-accent">*</span>
                  </p>
                  <SelectableGrid
                    options={bookingOptions.budgetRanges}
                    selected={data.budgetRange}
                    onToggle={(v) => update("budgetRange", v)}
                    columns="xs:grid-cols-2"
                  />
                  {errors.budgetRange && <p className="field-error mt-2">{errors.budgetRange}</p>}
                </div>
                <FormField label="Timeline notes" name="projectTimeline" hint="Optional">
                  <TextInput
                    id="projectTimeline"
                    value={data.projectTimeline}
                    onChange={(e) => update("projectTimeline", e.target.value)}
                    placeholder="e.g. Need finals before September launch"
                  />
                </FormField>
                <div>
                  <p className="mb-3 text-sm text-cream-dim">
                    Deliverables <span className="text-accent">*</span>
                  </p>
                  <SelectableGrid
                    options={bookingOptions.deliverables}
                    selected={data.deliverables}
                    multi
                    onToggle={(v) => {
                      const next = data.deliverables.includes(v)
                        ? data.deliverables.filter((x) => x !== v)
                        : [...data.deliverables, v];
                      update("deliverables", next);
                    }}
                  />
                  {errors.deliverables && <p className="field-error mt-2">{errors.deliverables}</p>}
                </div>
              </fieldset>
            )}

            {step === 7 && (
              <fieldset className="space-y-6">
                <legend className="font-display mb-2 block text-2xl text-cream">Review</legend>
                <p className="mb-6 text-sm text-fog">
                  Confirm your production brief — edit any step before submitting.
                </p>

                <dl className="space-y-4 rounded-lg border border-stone/25 bg-ink/40 p-5 text-sm">
                  {(
                    [
                      [1, "About You", `${data.fullName} · ${data.email}`],
                      [2, "Creating", data.projectCategory || "—"],
                      [3, "Vision", data.purpose || data.projectVision.slice(0, 80)],
                      [5, "Planning", `${data.preferredDate || "—"} · ${data.location || "—"}`],
                      [6, "Investment", data.budgetRange || "—"],
                    ] as const
                  ).map(([s, label, value]) => (
                    <div key={label} className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <dt className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">
                          {label}
                        </dt>
                        <dd className="mt-1 text-cream-dim">{value || "—"}</dd>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(s)}
                        className="text-[0.65rem] tracking-[0.08em] text-accent uppercase hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </dl>

                <div>
                  <p className="mb-3 text-sm text-cream-dim">
                    How did you hear about ÉLEVÉ? <span className="text-accent">*</span>
                  </p>
                  <SelectableGrid
                    options={bookingOptions.referralSources}
                    selected={data.referralSource}
                    onToggle={(v) => update("referralSource", v)}
                    columns="xs:grid-cols-2"
                  />
                  {errors.referralSource && (
                    <p className="field-error mt-2">{errors.referralSource}</p>
                  )}
                </div>

                <CheckboxField
                  name="termsAccepted"
                  checked={data.termsAccepted}
                  onChange={(e) => update("termsAccepted", e.target.checked)}
                  label={
                    <>
                      I agree to the{" "}
                      <Link href="/booking-terms" className="text-accent link-underline">
                        booking terms
                      </Link>
                    </>
                  }
                />
                {errors.termsAccepted && (
                  <p className="field-error">{errors.termsAccepted}</p>
                )}

                <FormSpamFields
                  honeypot={spam.honeypot}
                  onHoneypotChange={spam.setHoneypot}
                  formLoadedAt={spam.formLoadedAt}
                  turnstileToken={spam.turnstileToken}
                  onTurnstileVerify={spam.setTurnstileToken}
                  onTurnstileExpire={() => spam.setTurnstileToken("")}
                />
              </fieldset>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-stone/20 pt-6">
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              className="min-h-11 px-4 text-sm tracking-[0.08em] text-fog uppercase hover:text-cream"
            >
              Back
            </button>
          ) : (
            <span />
          )}
          {step < BOOKING_STEPS.length ? (
            <button
              type="button"
              onClick={goNext}
              className="min-h-11 rounded-lg border border-accent/40 bg-accent/15 px-6 text-[0.7rem] tracking-[0.12em] text-accent uppercase hover:bg-accent/25"
            >
              Continue
            </button>
          ) : (
            <SubmitButton loading={loading} disabled={!spam.canSubmit()}>
              Start production →
            </SubmitButton>
          )}
        </div>
      </div>
    </form>
  );
}
