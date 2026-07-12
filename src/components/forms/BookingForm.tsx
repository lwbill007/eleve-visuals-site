"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { PackageShowcase } from "@/components/booking/PackageShowcase";
import { AddonMarketplace } from "@/components/booking/AddonMarketplace";
import { BookingSuccess } from "@/components/booking/BookingSuccess";
import { SelectableGrid } from "@/components/booking/SelectableCard";
import { trackConversion, trackEngagement } from "@/lib/analytics-client";
import {
  BOOKING_AUTOSAVE_KEY,
  BOOKING_STEPS,
  applyPackageSelection,
  composeProjectVision,
  initialBookingData,
  type BookingFormData,
} from "@/lib/booking";
import {
  budgetRangeFromPackage,
  estimateInquiryValue,
  formatPackagePrice,
  getAddOnById,
  getPackageById,
} from "@/lib/booking-packages";
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
  welcomeAccepted: 1,
  packageId: 2,
  addOnIds: 3,
  feelingPrompt: 4,
  inspirationPrompt: 4,
  purpose: 4,
  goals: 4,
  audience: 4,
  creativeDirection: 4,
  projectVision: 4,
  preferredDate: 5,
  flexibleDate: 5,
  location: 5,
  sessionSetting: 5,
  duration: 5,
  budgetRange: 5,
  projectTimeline: 5,
  deliverables: 5,
  fullName: 6,
  email: 6,
  phone: 6,
  instagram: 6,
  website: 6,
  businessName: 6,
  pinterestLink: 6,
  moodBoardUrl: 6,
  inspirationInstagram: 6,
  driveLink: 6,
  referralSource: 6,
  termsAccepted: 7,
};

const ease = [0.16, 1, 0.3, 1] as const;

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

  const selectedPackage = useMemo(() => getPackageById(data.packageId), [data.packageId]);
  const estimate = useMemo(
    () => estimateInquiryValue(data.packageId, data.addOnIds),
    [data.packageId, data.addOnIds]
  );

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
      /* ignore */
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
    setData((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "addOnIds" && prev.packageId) {
        next.budgetRange = budgetRangeFromPackage(prev.packageId, value as string[]);
      }
      return next;
    });
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
      if (!data.welcomeAccepted) e.welcomeAccepted = "Continue when you're ready to begin";
    }
    if (s === 2) {
      if (!data.packageId) e.packageId = "Select an experience to continue";
    }
    if (s === 4) {
      if (data.feelingPrompt.trim().length < 10) {
        e.feelingPrompt = "At least 10 characters";
      }
      const story = data.projectVision.trim() || data.feelingPrompt.trim();
      if (story.length < 10) e.projectVision = "Share a bit more of the story";
    }
    if (s === 5) {
      if (!isFutureDate(data.preferredDate)) e.preferredDate = "Choose today or a future date";
      if (data.flexibleDate && !isFutureDate(data.flexibleDate)) e.flexibleDate = "Invalid date";
      if (!data.location.trim()) e.location = "Required";
      if (!data.sessionSetting) e.sessionSetting = "Required";
      if (!data.duration) e.duration = "Required";
      if (!data.budgetRange) e.budgetRange = "Required";
      if (data.deliverables.length === 0) e.deliverables = "Select at least one";
    }
    if (s === 6) {
      if (!data.fullName.trim()) e.fullName = "Required";
      if (!isValidEmail(data.email)) e.email = "Valid email required";
      const digits = data.phone.replace(/\D/g, "");
      if (digits.length < 10) e.phone = "Enter a valid phone number";
      if (data.instagram && !isValidInstagram(data.instagram)) e.instagram = "Invalid handle";
      if (!isValidOptionalUrl(data.website)) e.website = "Invalid URL";
      if (!isValidOptionalUrl(data.pinterestLink)) e.pinterestLink = "Invalid URL";
      if (!isValidOptionalUrl(data.moodBoardUrl)) e.moodBoardUrl = "Invalid URL";
      if (!isValidOptionalUrl(data.driveLink)) e.driveLink = "Invalid URL";
      if (!data.referralSource) e.referralSource = "Required";
    }
    if (s === 7) {
      if (!data.termsAccepted) e.termsAccepted = "Please accept the terms";
    }
    return e;
  };

  const goNext = () => {
    const e = getStepErrors(step);
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, BOOKING_STEPS.length));
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const goBack = () => {
    setErrors({});
    setFormError("");
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    const e = getStepErrors(7);
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    if (!spam.canSubmit()) {
      setFormError("Complete the security check to submit.");
      return;
    }

    setLoading(true);
    setFormError("");
    try {
      const projectVision = composeProjectVision({
        ...data,
        projectVision: data.projectVision.trim() || data.feelingPrompt.trim(),
        purpose: data.purpose.trim() || data.feelingPrompt.trim(),
        goals: data.goals.trim() || data.inspirationPrompt.trim(),
      });

      const payload = {
        ...data,
        projectVision,
        purpose: data.purpose.trim() || data.feelingPrompt.trim(),
        goals: data.goals.trim() || data.inspirationPrompt.trim(),
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
        localStorage.removeItem(BOOKING_AUTOSAVE_KEY);
      } catch {
        /* ignore */
      }
      trackConversion("booking");
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
      />
    );
  }

  const continueLabel =
    step === 1 ? "Begin" : step === BOOKING_STEPS.length ? "Submit inquiry" : "Continue";

  return (
    <div className="relative pb-28 md:pb-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <BookingProgress currentStep={step} />
        <div className="flex items-center gap-3 text-xs text-muted" aria-live="polite">
          {draftRestored && <span className="text-accent">Draft restored</span>}
          {autosaved && <span>Saved</span>}
          {estimate > 0 && (
            <span className="text-cream-dim">
              Est. from {formatPackagePrice(estimate)}
            </span>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
          transition={{ duration: 0.45, ease }}
        >
          {step === 1 && (
            <section className="space-y-8">
              <div className="max-w-2xl">
                <p className="label-caps text-accent">Welcome</p>
                <h2 className="font-display mt-3 text-3xl text-cream md:text-5xl">
                  You&apos;re not booking a slot.
                  <span className="mt-2 block text-accent">You&apos;re beginning a production.</span>
                </h2>
                <p className="mt-6 text-base leading-relaxed text-fog md:text-lg">
                  ÉLEVÉ is a Northern California creative studio. We partner with brands, artists,
                  and ambitious individuals who treat imagery as infrastructure—not an afterthought.
                </p>
              </div>
              <ol className="grid gap-4 sm:grid-cols-2">
                {[
                  ["01", "Choose an experience", "Portrait, motion, hybrid, or creative partnership."],
                  ["02", "Share your vision", "What you want people to feel—and why now."],
                  ["03", "Creative consultation", "We review, refine, and propose."],
                  ["04", "Produce & deliver", "Retainer, planning, production, gallery."],
                ].map(([n, t, d]) => (
                  <li key={n} className="border border-stone/35 bg-charcoal/25 p-5">
                    <p className="label-caps text-accent">{n}</p>
                    <p className="mt-2 font-display text-xl text-cream">{t}</p>
                    <p className="mt-2 text-sm text-fog">{d}</p>
                  </li>
                ))}
              </ol>
              <CheckboxField
                name="welcomeAccepted"
                checked={data.welcomeAccepted}
                onChange={(ev) => update("welcomeAccepted", ev.target.checked)}
                error={errors.welcomeAccepted}
                label="I understand this is an inquiry—not an instant booking or payment."
              />
            </section>
          )}

          {step === 2 && (
            <PackageShowcase
              selectedId={data.packageId}
              error={errors.packageId}
              onSelect={(pkg) => {
                setData((prev) =>
                  applyPackageSelection(
                    { ...prev, addOnIds: prev.packageId === pkg.id ? prev.addOnIds : [] },
                    pkg.id,
                    bookingOptions.serviceTypes,
                    bookingOptions.deliverables
                  )
                );
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.packageId;
                  return next;
                });
              }}
            />
          )}

          {step === 3 && (
            <AddonMarketplace
              packageId={data.packageId}
              selectedIds={data.addOnIds}
              onChange={(ids) => update("addOnIds", ids)}
            />
          )}

          {step === 4 && (
            <section className="space-y-6">
              <div>
                <p className="label-caps text-accent">Vision</p>
                <h2 className="font-display mt-2 text-3xl text-cream md:text-4xl">
                  Tell us about your vision
                </h2>
                <p className="mt-3 max-w-2xl text-sm text-fog md:text-base">
                  The best productions start with feeling—not specs. Be honest and specific.
                </p>
              </div>
              <FormField
                label="What are you hoping people feel when they see these images?"
                error={errors.feelingPrompt}
                name="feelingPrompt"
              >
                <TextArea
                  id="feelingPrompt"
                  rows={4}
                  value={data.feelingPrompt}
                  onChange={(e) => update("feelingPrompt", e.target.value)}
                  aria-invalid={!!errors.feelingPrompt}
                  placeholder="Confidence. Desire. Belonging. Authority. Softness. Momentum…"
                />
              </FormField>
              <FormField
                label="What inspired this project?"
                error={errors.inspirationPrompt}
                name="inspirationPrompt"
              >
                <TextArea
                  id="inspirationPrompt"
                  rows={3}
                  value={data.inspirationPrompt}
                  onChange={(e) => update("inspirationPrompt", e.target.value)}
                  placeholder="A launch, a milestone, a brand shift, a personal chapter…"
                />
              </FormField>
              <FormField label="Who is this for?" name="audience" error={errors.audience}>
                <TextInput
                  id="audience"
                  value={data.audience}
                  onChange={(e) => update("audience", e.target.value)}
                  placeholder="Clients, followers, hiring managers, collectors…"
                />
              </FormField>
              <FormField
                label="Creative direction notes"
                name="creativeDirection"
                error={errors.creativeDirection}
              >
                <TextArea
                  id="creativeDirection"
                  rows={3}
                  value={data.creativeDirection}
                  onChange={(e) => update("creativeDirection", e.target.value)}
                  placeholder="Tone, references, must-haves, hard nos…"
                />
              </FormField>
              <FormField
                label="Anything else we should know about the story?"
                name="projectVision"
                error={errors.projectVision}
              >
                <TextArea
                  id="projectVision"
                  rows={3}
                  value={data.projectVision}
                  onChange={(e) => update("projectVision", e.target.value)}
                />
              </FormField>
            </section>
          )}

          {step === 5 && (
            <section className="space-y-6">
              <div>
                <p className="label-caps text-accent">Project Details</p>
                <h2 className="font-display mt-2 text-3xl text-cream md:text-4xl">
                  Logistics & deliverables
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Preferred date" name="preferredDate" error={errors.preferredDate}>
                  <TextInput
                    id="preferredDate"
                    type="date"
                    min={minDate}
                    value={data.preferredDate}
                    onChange={(e) => update("preferredDate", e.target.value)}
                    aria-invalid={!!errors.preferredDate}
                  />
                </FormField>
                <FormField label="Flexible alternate" name="flexibleDate" error={errors.flexibleDate}>
                  <TextInput
                    id="flexibleDate"
                    type="date"
                    min={minDate}
                    value={data.flexibleDate}
                    onChange={(e) => update("flexibleDate", e.target.value)}
                  />
                </FormField>
              </div>
              <FormField label="Location" name="location" error={errors.location}>
                <TextInput
                  id="location"
                  value={data.location}
                  onChange={(e) => update("location", e.target.value)}
                  placeholder="City, neighborhood, or venue"
                  aria-invalid={!!errors.location}
                />
              </FormField>
              <FormField label="Setting" name="sessionSetting" error={errors.sessionSetting}>
                <SelectableGrid
                  options={bookingOptions.sessionSettings}
                  selected={data.sessionSetting}
                  onToggle={(v) => update("sessionSetting", v)}
                />
              </FormField>
              <FormField label="Duration preference" name="duration" error={errors.duration}>
                <SelectableGrid
                  options={bookingOptions.durations}
                  selected={data.duration}
                  onToggle={(v) => update("duration", v)}
                />
              </FormField>
              <FormField label="Investment range" name="budgetRange" error={errors.budgetRange}>
                <SelectableGrid
                  options={bookingOptions.budgetRanges}
                  selected={data.budgetRange}
                  onToggle={(v) => update("budgetRange", v)}
                />
                {estimate > 0 && (
                  <p className="mt-2 text-xs text-fog">
                    Based on your experience: from {formatPackagePrice(estimate)}. Adjust if your
                    range differs.
                  </p>
                )}
              </FormField>
              <FormField label="Timeline notes" name="projectTimeline">
                <TextInput
                  id="projectTimeline"
                  value={data.projectTimeline}
                  onChange={(e) => update("projectTimeline", e.target.value)}
                  placeholder="Launch date, soft deadline, flexible…"
                />
              </FormField>
              <FormField label="Deliverables" name="deliverables" error={errors.deliverables}>
                <SelectableGrid
                  options={bookingOptions.deliverables}
                  selected={data.deliverables}
                  onToggle={(v) => {
                    const next = data.deliverables.includes(v)
                      ? data.deliverables.filter((x) => x !== v)
                      : [...data.deliverables, v];
                    update("deliverables", next);
                  }}
                  multi
                />
              </FormField>
            </section>
          )}

          {step === 6 && (
            <section className="space-y-6">
              <div>
                <p className="label-caps text-accent">About You</p>
                <h2 className="font-display mt-2 text-3xl text-cream md:text-4xl">
                  How do we reach you?
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Full name" name="fullName" error={errors.fullName}>
                  <TextInput
                    id="fullName"
                    value={data.fullName}
                    onChange={(e) => update("fullName", e.target.value)}
                    aria-invalid={!!errors.fullName}
                    autoComplete="name"
                  />
                </FormField>
                <FormField label="Business / brand (optional)" name="businessName">
                  <TextInput
                    id="businessName"
                    value={data.businessName}
                    onChange={(e) => update("businessName", e.target.value)}
                  />
                </FormField>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Email" name="email" error={errors.email}>
                  <TextInput
                    id="email"
                    type="email"
                    value={data.email}
                    onChange={(e) => update("email", e.target.value)}
                    aria-invalid={!!errors.email}
                    autoComplete="email"
                  />
                </FormField>
                <FormField label="Phone" name="phone" error={errors.phone}>
                  <TextInput
                    id="phone"
                    type="tel"
                    value={data.phone}
                    onChange={(e) => update("phone", formatPhone(e.target.value))}
                    aria-invalid={!!errors.phone}
                    autoComplete="tel"
                  />
                </FormField>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Instagram" name="instagram" error={errors.instagram}>
                  <TextInput
                    id="instagram"
                    value={data.instagram}
                    onChange={(e) => update("instagram", e.target.value)}
                    placeholder="@handle"
                  />
                </FormField>
                <FormField label="Website" name="website" error={errors.website}>
                  <TextInput
                    id="website"
                    value={data.website}
                    onChange={(e) => update("website", e.target.value)}
                    placeholder="https://"
                  />
                </FormField>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Pinterest" name="pinterestLink" error={errors.pinterestLink}>
                  <TextInput
                    id="pinterestLink"
                    value={data.pinterestLink}
                    onChange={(e) => update("pinterestLink", e.target.value)}
                    placeholder="https://"
                  />
                </FormField>
                <FormField label="Moodboard URL" name="moodBoardUrl" error={errors.moodBoardUrl}>
                  <TextInput
                    id="moodBoardUrl"
                    value={data.moodBoardUrl}
                    onChange={(e) => update("moodBoardUrl", e.target.value)}
                    placeholder="https://"
                  />
                </FormField>
                <FormField label="Inspiration Instagram" name="inspirationInstagram">
                  <TextInput
                    id="inspirationInstagram"
                    value={data.inspirationInstagram}
                    onChange={(e) => update("inspirationInstagram", e.target.value)}
                  />
                </FormField>
                <FormField label="Drive / Dropbox" name="driveLink" error={errors.driveLink}>
                  <TextInput
                    id="driveLink"
                    value={data.driveLink}
                    onChange={(e) => update("driveLink", e.target.value)}
                    placeholder="https://"
                  />
                </FormField>
              </div>
              <FormField label="How did you find ÉLEVÉ?" name="referralSource" error={errors.referralSource}>
                <SelectableGrid
                  options={bookingOptions.referralSources}
                  selected={data.referralSource}
                  onToggle={(v) => update("referralSource", v)}
                />
              </FormField>
            </section>
          )}

          {step === 7 && (
            <section className="space-y-8">
              <div>
                <p className="label-caps text-accent">Review</p>
                <h2 className="font-display mt-2 text-3xl text-cream md:text-4xl">
                  Everything looks intentional?
                </h2>
              </div>

              <div className="space-y-4 border border-stone/35 bg-charcoal/20 p-5 md:p-8">
                <ReviewRow label="Experience" value={selectedPackage?.name || "—"} onEdit={() => setStep(2)} />
                <ReviewRow
                  label="Add-ons"
                  value={
                    data.addOnIds.length
                      ? data.addOnIds.map((id) => getAddOnById(id)?.name).filter(Boolean).join(", ")
                      : "None"
                  }
                  onEdit={() => setStep(3)}
                />
                <ReviewRow
                  label="Estimated starting value"
                  value={estimate > 0 ? formatPackagePrice(estimate) : "—"}
                  onEdit={() => setStep(2)}
                />
                <ReviewRow
                  label="Feeling"
                  value={data.feelingPrompt || "—"}
                  onEdit={() => setStep(4)}
                />
                <ReviewRow
                  label="When / where"
                  value={[data.preferredDate, data.location].filter(Boolean).join(" · ") || "—"}
                  onEdit={() => setStep(5)}
                />
                <ReviewRow
                  label="Contact"
                  value={[data.fullName, data.email, data.phone].filter(Boolean).join(" · ")}
                  onEdit={() => setStep(6)}
                />
              </div>

              <CheckboxField
                name="termsAccepted"
                checked={data.termsAccepted}
                onChange={(ev) => update("termsAccepted", ev.target.checked)}
                error={errors.termsAccepted}
                label={
                  <>
                    I agree to the{" "}
                    <Link href="/booking-terms" className="text-accent link-underline">
                      booking terms
                    </Link>
                    .
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

              {formError && (
                <p className="text-sm text-red-400" role="alert" aria-live="assertive">
                  {formError}
                </p>
              )}
            </section>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Desktop nav */}
      <div className="mt-10 hidden items-center justify-between gap-4 md:flex">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 1 || loading}
          className="text-sm text-fog transition-colors hover:text-cream disabled:opacity-30"
        >
          Back
        </button>
        {step < BOOKING_STEPS.length ? (
          <button
            type="button"
            onClick={goNext}
            className="border border-accent/50 bg-accent/10 px-8 py-3 text-sm tracking-[0.14em] text-accent uppercase transition-colors hover:bg-accent/20"
          >
            {continueLabel}
          </button>
        ) : (
          <SubmitButton type="button" loading={loading} onClick={handleSubmit}>
            Submit inquiry →
          </SubmitButton>
        )}
      </div>

      {/* Mobile sticky continue */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone/40 bg-ink/95 p-3 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-2">
          {step > 1 && (
            <button
              type="button"
              onClick={goBack}
              disabled={loading}
              className="px-4 py-3 text-sm text-fog"
            >
              Back
            </button>
          )}
          {step < BOOKING_STEPS.length ? (
            <button
              type="button"
              onClick={goNext}
              className="min-h-12 flex-1 border border-accent/50 bg-accent/15 text-sm tracking-[0.12em] text-accent uppercase"
            >
              {continueLabel}
            </button>
          ) : (
            <div className="flex-1">
              <SubmitButton type="button" loading={loading} onClick={handleSubmit} className="w-full min-h-12">
                Submit inquiry →
              </SubmitButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-stone/25 pb-4 last:border-0 last:pb-0">
      <div className="min-w-0">
        <p className="label-caps text-muted">{label}</p>
        <p className="mt-1 text-sm leading-relaxed text-cream-dim whitespace-pre-wrap">{value}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-xs tracking-[0.1em] text-accent uppercase hover:text-cream"
      >
        Edit
      </button>
    </div>
  );
}
