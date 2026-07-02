"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
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
import { SelectableGrid } from "@/components/booking/SelectableCard";
import { BookingSuccess } from "@/components/booking/BookingSuccess";
import { trackConversion } from "@/lib/analytics-client";
import {
  BOOKING_AUTOSAVE_KEY,
  BOOKING_STEPS,
  initialBookingData,
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

const stepMotion = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export function BookingForm({
  bookingOptions,
  bookPage,
}: {
  bookingOptions: BookingOptions;
  bookPage: PageCopy["bookPage"];
}) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<BookingFormData>(initialBookingData);
  const [errors, setErrors] = useState<FormErrors<BookingFormData>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [inquiryId, setInquiryId] = useState<string>();
  const [autosaved, setAutosaved] = useState(false);
  const spam = useFormSpam();
  const minDate = getTodayDateString();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BOOKING_AUTOSAVE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<BookingFormData> & { step?: number };
      setData((prev) => ({ ...prev, ...parsed }));
      if (parsed.step && parsed.step >= 1 && parsed.step <= BOOKING_STEPS.length) {
        setStep(parsed.step);
      }
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
        /* storage full or unavailable */
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [data, step, submitted]);

  useEffect(() => {
    if (!autosaved) return;
    const hide = setTimeout(() => setAutosaved(false), 2000);
    return () => clearTimeout(hide);
  }, [autosaved]);

  const update = useCallback(<K extends keyof BookingFormData>(
    key: K,
    value: BookingFormData[K]
  ) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const toggleArrayItem = (key: "serviceTypes" | "deliverables", item: string) => {
    const list = data[key];
    const next = list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
    update(key, next);
  };

  const getStepErrors = (currentStep: number): FormErrors<BookingFormData> => {
    const next: FormErrors<BookingFormData> = {};

    if (currentStep === 1) {
      if (!data.fullName.trim()) next.fullName = "Full name is required";
      if (!data.email.trim()) next.email = "Email is required";
      else if (!isValidEmail(data.email)) next.email = "Enter a valid email";
      if (!data.phone.trim()) next.phone = "Phone number is required";
      else if (data.phone.replace(/\D/g, "").length < 10)
        next.phone = "Enter a valid 10-digit phone number";
      if (data.instagram && !isValidInstagram(data.instagram))
        next.instagram = "Enter a valid Instagram handle";
      if (data.website && !isValidOptionalUrl(data.website))
        next.website = "Enter a valid URL starting with http:// or https://";
    }

    if (currentStep === 2) {
      if (data.serviceTypes.length === 0)
        next.serviceTypes = "Select at least one service";
    }

    if (currentStep === 3) {
      if (!data.preferredDate) next.preferredDate = "Preferred date is required";
      else if (!isFutureDate(data.preferredDate))
        next.preferredDate = "Preferred date must be today or in the future";
      if (data.flexibleDate && !isFutureDate(data.flexibleDate))
        next.flexibleDate = "Flexible date must be today or in the future";
      if (!data.location.trim()) next.location = "Location is required";
      if (!data.sessionSetting) next.sessionSetting = "Select a session setting";
      if (!data.duration) next.duration = "Select an estimated duration";
    }

    if (currentStep === 4) {
      if (!data.projectVision.trim())
        next.projectVision = "Tell us about your project vision";
      else if (data.projectVision.trim().length < 10)
        next.projectVision = "Please share at least 10 characters about your vision";
      if (data.pinterestLink && !isValidOptionalUrl(data.pinterestLink))
        next.pinterestLink = "Enter a valid URL";
      if (data.moodBoardUrl && !isValidOptionalUrl(data.moodBoardUrl))
        next.moodBoardUrl = "Enter a valid URL";
      if (data.driveLink && !isValidOptionalUrl(data.driveLink))
        next.driveLink = "Enter a valid URL";
      if (data.inspirationInstagram && !isValidInstagram(data.inspirationInstagram) && !isValidOptionalUrl(data.inspirationInstagram)) {
        next.inspirationInstagram = "Enter a valid @handle or URL";
      }
    }

    if (currentStep === 5) {
      if (data.deliverables.length === 0)
        next.deliverables = "Select at least one deliverable";
    }

    if (currentStep === 6) {
      if (!data.budgetRange) next.budgetRange = "Select a budget range";
    }

    if (currentStep === 7) {
      if (!data.referralSource) next.referralSource = "Let us know how you found ÉLEVÉ";
      if (!data.termsAccepted) next.termsAccepted = "You must agree to the booking terms";
    }

    return next;
  };

  const validateStep = (currentStep: number): boolean => {
    const next = getStepErrors(currentStep);
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateAllSteps = (): number | null => {
    const allErrors: FormErrors<BookingFormData> = {};
    for (let s = 1; s <= BOOKING_STEPS.length; s++) {
      Object.assign(allErrors, getStepErrors(s));
    }
    setErrors(allErrors);
    if (Object.keys(allErrors).length === 0) return null;
    for (let s = 1; s <= BOOKING_STEPS.length; s++) {
      if (Object.keys(getStepErrors(s)).length > 0) return s;
    }
    return 1;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalidStep = validateAllSteps();
    if (invalidStep !== null) {
      if (invalidStep !== step) {
        setStep(invalidStep);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }
    if (!spam.canSubmit()) return;

    setLoading(true);
    const res = await fetch("/api/submit/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, ...spam.spamPayload() }),
    });
    setLoading(false);

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setErrors(
        mapApiErrorsToForm<BookingFormData>(
          payload,
          "fullName",
          res.status === 429
        )
      );
      return;
    }

    const payload = await res.json().catch(() => ({}));
    if (typeof payload.inquiryId === "string") setInquiryId(payload.inquiryId);
    localStorage.removeItem(BOOKING_AUTOSAVE_KEY);
    trackConversion("booking");
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (submitted) {
    return (
      <BookingSuccess
        title={bookPage.successTitle}
        message={bookPage.successMessage}
        nextSteps={bookPage.nextSteps}
        inquiryId={inquiryId}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="relative">
      <div className="mb-10">
        <BookingProgress currentStep={step} />
        {autosaved && (
          <span className="mt-2 block text-right text-[0.65rem] tracking-[0.15em] text-muted uppercase">
            Draft saved
          </span>
        )}
      </div>

      <div className="rounded-none border border-stone/30 bg-charcoal/20 p-6 backdrop-blur-sm md:p-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={stepMotion.initial}
            animate={stepMotion.animate}
            exit={stepMotion.exit}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === 1 && (
              <fieldset className="space-y-6">
                <legend className="label-caps mb-2 block text-accent">
                  Step 1 — Contact Information
                </legend>
                <p className="mb-6 text-sm text-fog">
                  Social profiles help us better understand your style and creative direction.
                </p>
                <div className="grid gap-6 md:grid-cols-2">
                  <FormField label="Full Name" name="fullName" required error={errors.fullName}>
                    <TextInput
                      id="fullName"
                      name="fullName"
                      value={data.fullName}
                      onChange={(e) => update("fullName", e.target.value)}
                      error={!!errors.fullName}
                      autoComplete="name"
                    />
                  </FormField>
                  <FormField label="Email Address" name="email" required error={errors.email}>
                    <TextInput
                      id="email"
                      name="email"
                      type="email"
                      value={data.email}
                      onChange={(e) => update("email", e.target.value)}
                      error={!!errors.email}
                      autoComplete="email"
                    />
                  </FormField>
                  <FormField label="Phone Number" name="phone" required error={errors.phone}>
                    <TextInput
                      id="phone"
                      name="phone"
                      type="tel"
                      value={data.phone}
                      onChange={(e) => update("phone", formatPhone(e.target.value))}
                      error={!!errors.phone}
                      autoComplete="tel"
                    />
                  </FormField>
                  <FormField label="Instagram Handle" name="instagram" error={errors.instagram}>
                    <TextInput
                      id="instagram"
                      name="instagram"
                      value={data.instagram}
                      onChange={(e) => update("instagram", e.target.value)}
                      error={!!errors.instagram}
                      placeholder="@yourhandle"
                    />
                  </FormField>
                  <FormField
                    label="Website or Portfolio"
                    name="website"
                    error={errors.website}
                    className="md:col-span-2"
                  >
                    <TextInput
                      id="website"
                      name="website"
                      type="url"
                      value={data.website}
                      onChange={(e) => update("website", e.target.value)}
                      error={!!errors.website}
                      placeholder="https://"
                    />
                  </FormField>
                </div>
              </fieldset>
            )}

            {step === 2 && (
              <fieldset className="space-y-6">
                <legend className="label-caps mb-2 block text-accent">
                  Step 2 — Select Your Service
                </legend>
                <p className="mb-4 text-sm text-fog">Select all services that apply to your project.</p>
                <SelectableGrid
                  options={bookingOptions.serviceTypes}
                  selected={data.serviceTypes}
                  onToggle={(v) => toggleArrayItem("serviceTypes", v)}
                  multi
                />
                {errors.serviceTypes && (
                  <p className="field-error">{errors.serviceTypes}</p>
                )}
              </fieldset>
            )}

            {step === 3 && (
              <fieldset className="space-y-6">
                <legend className="label-caps mb-2 block text-accent">
                  Step 3 — Session Information
                </legend>
                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    label="Preferred Date"
                    name="preferredDate"
                    required
                    error={errors.preferredDate}
                  >
                    <TextInput
                      id="preferredDate"
                      name="preferredDate"
                      type="date"
                      min={minDate}
                      value={data.preferredDate}
                      onChange={(e) => update("preferredDate", e.target.value)}
                      error={!!errors.preferredDate}
                    />
                  </FormField>
                  <FormField
                    label="Flexible Date"
                    name="flexibleDate"
                    error={errors.flexibleDate}
                    hint="Optional backup date"
                  >
                    <TextInput
                      id="flexibleDate"
                      name="flexibleDate"
                      type="date"
                      min={minDate}
                      value={data.flexibleDate}
                      onChange={(e) => update("flexibleDate", e.target.value)}
                      error={!!errors.flexibleDate}
                    />
                  </FormField>
                  <FormField
                    label="Location"
                    name="location"
                    required
                    error={errors.location}
                    className="md:col-span-2"
                  >
                    <TextInput
                      id="location"
                      name="location"
                      value={data.location}
                      onChange={(e) => update("location", e.target.value)}
                      error={!!errors.location}
                      placeholder="City, venue, or address"
                    />
                  </FormField>
                </div>
                <div>
                  <p className="mb-3 text-sm text-cream-dim">Session Setting</p>
                  <SelectableGrid
                    options={bookingOptions.sessionSettings}
                    selected={data.sessionSetting}
                    onToggle={(v) => update("sessionSetting", v)}
                    columns="grid-cols-1 xs:grid-cols-2 sm:grid-cols-4"
                  />
                  {errors.sessionSetting && (
                    <p className="field-error mt-2">{errors.sessionSetting}</p>
                  )}
                </div>
                <div>
                  <p className="mb-3 text-sm text-cream-dim">Estimated Duration</p>
                  <SelectableGrid
                    options={bookingOptions.durations}
                    selected={data.duration}
                    onToggle={(v) => update("duration", v)}
                    columns="grid-cols-1 xs:grid-cols-2 sm:grid-cols-3"
                  />
                  {errors.duration && (
                    <p className="field-error mt-2">{errors.duration}</p>
                  )}
                </div>
              </fieldset>
            )}

            {step === 4 && (
              <fieldset className="space-y-6">
                <legend className="label-caps mb-2 block text-accent">
                  Step 4 — Project Vision
                </legend>
                <FormField
                  label="Your Vision"
                  name="projectVision"
                  required
                  error={errors.projectVision}
                >
                  <TextArea
                    id="projectVision"
                    name="projectVision"
                    value={data.projectVision}
                    onChange={(e) => update("projectVision", e.target.value)}
                    error={!!errors.projectVision}
                    rows={6}
                    placeholder="Describe the story you want to tell. Include inspiration, references, wardrobe ideas, locations, mood, goals, or anything that will help us bring your vision to life."
                  />
                </FormField>
                <div className="grid gap-6 md:grid-cols-2">
                  <FormField label="Pinterest Link" name="pinterestLink" error={errors.pinterestLink}>
                    <TextInput
                      id="pinterestLink"
                      name="pinterestLink"
                      value={data.pinterestLink}
                      onChange={(e) => update("pinterestLink", e.target.value)}
                      error={!!errors.pinterestLink}
                      placeholder="https://"
                    />
                  </FormField>
                  <FormField label="Mood Board URL" name="moodBoardUrl" error={errors.moodBoardUrl}>
                    <TextInput
                      id="moodBoardUrl"
                      name="moodBoardUrl"
                      value={data.moodBoardUrl}
                      onChange={(e) => update("moodBoardUrl", e.target.value)}
                      error={!!errors.moodBoardUrl}
                      placeholder="https://"
                    />
                  </FormField>
                  <FormField
                    label="Instagram Inspiration"
                    name="inspirationInstagram"
                    error={errors.inspirationInstagram}
                  >
                    <TextInput
                      id="inspirationInstagram"
                      name="inspirationInstagram"
                      value={data.inspirationInstagram}
                      onChange={(e) => update("inspirationInstagram", e.target.value)}
                      placeholder="@account or link"
                      error={!!errors.inspirationInstagram}
                    />
                  </FormField>
                  <FormField label="Google Drive Link" name="driveLink" error={errors.driveLink}>
                    <TextInput
                      id="driveLink"
                      name="driveLink"
                      value={data.driveLink}
                      onChange={(e) => update("driveLink", e.target.value)}
                      error={!!errors.driveLink}
                      placeholder="https://"
                    />
                  </FormField>
                </div>
              </fieldset>
            )}

            {step === 5 && (
              <fieldset className="space-y-6">
                <legend className="label-caps mb-2 block text-accent">
                  Step 5 — Deliverables
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {bookingOptions.deliverables.map((item) => (
                    <CheckboxField
                      key={item}
                      name={`deliverable-${item}`}
                      label={item}
                      checked={data.deliverables.includes(item)}
                      onChange={() => toggleArrayItem("deliverables", item)}
                    />
                  ))}
                </div>
                {errors.deliverables && (
                  <p className="field-error">{errors.deliverables}</p>
                )}
              </fieldset>
            )}

            {step === 6 && (
              <fieldset className="space-y-6">
                <legend className="label-caps mb-2 block text-accent">
                  Step 6 — Budget
                </legend>
                <p className="text-sm text-fog">
                  We&apos;ll recommend the best approach based on your goals and budget.
                </p>
                <SelectableGrid
                  options={bookingOptions.budgetRanges}
                  selected={data.budgetRange}
                  onToggle={(v) => update("budgetRange", v)}
                  columns="grid-cols-1 xs:grid-cols-2 sm:grid-cols-3"
                />
                {errors.budgetRange && (
                  <p className="field-error">{errors.budgetRange}</p>
                )}
              </fieldset>
            )}

            {step === 7 && (
              <fieldset className="space-y-6">
                <legend className="label-caps mb-2 block text-accent">
                  Step 7 — Discovery
                </legend>
                <p className="mb-2 text-sm text-cream-dim">How did you hear about ÉLEVÉ?</p>
                <SelectableGrid
                  options={bookingOptions.referralSources}
                  selected={data.referralSource}
                  onToggle={(v) => update("referralSource", v)}
                  columns="grid-cols-1 xs:grid-cols-2 sm:grid-cols-4"
                />
                {errors.referralSource && (
                  <p className="field-error">{errors.referralSource}</p>
                )}
                <CheckboxField
                  name="termsAccepted"
                  checked={data.termsAccepted}
                  onChange={(e) => update("termsAccepted", e.target.checked)}
                  label={
                    <>
                      I agree to the{" "}
                      <Link href="/booking-terms" className="text-accent underline hover:text-cream">
                        booking terms
                      </Link>
                      .
                    </>
                  }
                />
                {errors.termsAccepted && (
                  <p className="field-error">{errors.termsAccepted}</p>
                )}
                <div className="mt-8 border border-stone/30 bg-ink/50 p-6">
                  <p className="text-sm leading-relaxed text-fog">
                    Every inquiry is personally reviewed to ensure the highest creative
                    standard. If your project aligns with our vision, you&apos;ll receive next
                    steps, availability, and a customized proposal.
                  </p>
                </div>
              </fieldset>
            )}
          </motion.div>
        </AnimatePresence>

        <FormSpamFields
          honeypot={spam.honeypot}
          onHoneypotChange={spam.setHoneypot}
          formLoadedAt={spam.formLoadedAt}
          turnstileToken={spam.turnstileToken}
          onTurnstileVerify={spam.setTurnstileToken}
          onTurnstileExpire={() => spam.setTurnstileToken("")}
        />

        <div className="mt-10 flex flex-col-reverse gap-4 border-t border-stone/30 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex min-h-11 items-center text-xs tracking-[0.15em] text-fog uppercase transition-colors hover:text-cream"
              >
                ← Back
              </button>
            )}
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            {step < BOOKING_STEPS.length ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex min-h-12 items-center justify-center border border-cream bg-cream px-9 py-4 text-xs font-medium tracking-[0.15em] text-ink uppercase transition-all duration-500 hover:bg-cream-dim"
                style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
              >
                Continue
              </button>
            ) : (
              <>
                <SubmitButton loading={loading} size="lg" disabled={!spam.canSubmit()}>
                  Submit Inquiry
                </SubmitButton>
                <p className="text-center text-xs text-muted sm:text-right">
                  No payment required today.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
