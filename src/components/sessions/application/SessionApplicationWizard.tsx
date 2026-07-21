"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AdminPreviewImage } from "@/components/admin/AdminPreviewImage";
import type { SessionApplicationData, SessionApplicationSettings, SessionVolumeDTO } from "@/lib/types";
import type { SessionsApplicationContent } from "@/lib/types";
import { SESSION_APPLICATION_ROLES } from "@/lib/types";
import {
  APPLICATION_STEPS,
  MAX_PORTFOLIO_UPLOADS,
  applicationStorageKey,
  initialApplicationData,
} from "@/lib/session-application";
import { SessionApplicationProgress } from "./SessionApplicationProgress";
import { SessionApplicationSuccess } from "./SessionApplicationSuccess";
import {
  FormField,
  TextInput,
  TextArea,
  CheckboxField,
} from "@/components/ui/Form";
import { SelectableGrid } from "@/components/booking/SelectableCard";
import { FormSpamFields, useFormSpam } from "@/components/forms/FormSpamFields";
import { trackConversion } from "@/lib/analytics-client";
import { uploadImageFile } from "@/lib/upload-client";
import {
  formatPhone,
  isValidEmail,
  isValidInstagram,
  mapApiErrorsToForm,
  type FormErrors,
} from "@/lib/utils";

const stepMotion = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};
const APPLICATION_DRAFT_TTL_MS = 2 * 60 * 60 * 1000;

function isValidOptionalUrl(value: string): boolean {
  if (!value.trim()) return true;
  return /^https?:\/\/.+/i.test(value.trim());
}

export function SessionApplicationWizard({
  volume,
  settings,
  applicationContent,
  uploadToken,
}: {
  volume: SessionVolumeDTO;
  settings: SessionApplicationSettings;
  applicationContent: SessionsApplicationContent;
  uploadToken: string;
}) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<SessionApplicationData>(() =>
    initialApplicationData(volume, settings.questions)
  );
  const [errors, setErrors] = useState<FormErrors<SessionApplicationData>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState<string>();
  const [autosaved, setAutosaved] = useState(false);
  const [formError, setFormError] = useState("");
  const spam = useFormSpam();
  const storageKey = applicationStorageKey(volume.slug);
  const idempotencyKeyRef = useRef("");

  useEffect(() => {
    try {
      localStorage.removeItem(storageKey);
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        savedAt?: number;
        data?: Partial<SessionApplicationData>;
        step?: number;
      };
      if (!parsed.savedAt || Date.now() - parsed.savedAt > APPLICATION_DRAFT_TTL_MS) {
        sessionStorage.removeItem(storageKey);
        return;
      }
      setData((prev) => ({
        ...prev,
        ...(parsed.data ?? {}),
        sessionVolumeId: volume.id,
        sessionVolumeSlug: volume.slug,
        sessionVolumeTitle: volume.title,
      }));
      if (parsed.step && parsed.step >= 1 && parsed.step <= APPLICATION_STEPS.length) {
        setStep(parsed.step);
      }
    } catch {
      /* ignore */
    }
  }, [storageKey, volume.id, volume.slug, volume.title]);

  useEffect(() => {
    const key = `${storageKey}:idempotency`;
    try {
      idempotencyKeyRef.current = sessionStorage.getItem(key) || crypto.randomUUID();
      sessionStorage.setItem(key, idempotencyKeyRef.current);
    } catch {
      idempotencyKeyRef.current = crypto.randomUUID();
    }
  }, [storageKey]);

  useEffect(() => {
    if (submitted) return;
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({ savedAt: Date.now(), data, step })
        );
        setAutosaved(true);
      } catch {
        /* ignore */
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [data, step, submitted, storageKey]);

  useEffect(() => {
    if (!autosaved) return;
    const hide = setTimeout(() => setAutosaved(false), 2000);
    return () => clearTimeout(hide);
  }, [autosaved]);

  const update = useCallback(<K extends keyof SessionApplicationData>(
    key: K,
    value: SessionApplicationData[K]
  ) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setFormError("");
  }, []);

  const toggleRole = (role: string) => {
    const next = data.roles.includes(role)
      ? data.roles.filter((r) => r !== role)
      : [...data.roles, role];
    update("roles", next);
  };

  const updateQuestionAnswer = (id: string, answer: string) => {
    update(
      "questionAnswers",
      data.questionAnswers.map((q) => (q.id === id ? { ...q, answer } : q))
    );
  };

  const getStepErrors = (current: number): FormErrors<SessionApplicationData> => {
    const next: FormErrors<SessionApplicationData> = {};

    if (current === 1) {
      if (!data.fullName.trim()) next.fullName = "Full name is required";
      if (!data.email.trim()) next.email = "Email is required";
      else if (!isValidEmail(data.email)) next.email = "Enter a valid email";
      if (!data.phone.trim()) next.phone = "Phone is required";
      else if (data.phone.replace(/\D/g, "").length < 10) next.phone = "Enter a valid phone number";
      if (!data.cityState.trim()) next.cityState = "City & state is required";
      if (!data.instagram.trim()) next.instagram = "Instagram is required";
      else if (!isValidInstagram(data.instagram)) next.instagram = "Enter a valid handle";
      if (data.portfolioWebsite && !isValidOptionalUrl(data.portfolioWebsite)) {
        next.portfolioWebsite = "Enter a valid URL";
      }
    }

    if (current === 2) {
      if (settings.requireRoleSelection && data.roles.length === 0) {
        next.roles = "Select at least one role";
      }
    }

    if (current === 3) {
      const hasImages = data.portfolioImages.length > 0;
      const hasUrl = !!data.portfolioLink?.trim() || !!data.portfolioWebsite?.trim();
      if (settings.requirePortfolioUpload && !hasImages) {
        next.portfolioImages = "Upload at least one image";
      } else if (!hasImages && !hasUrl) {
        next.portfolioLink = "Upload images or provide a portfolio URL";
      }
      for (const field of ["portfolioLink", "demoReel", "youtube", "vimeo", "behance", "driveLink"] as const) {
        if (data[field] && !isValidOptionalUrl(data[field]!)) {
          next[field] = "Enter a valid URL";
        }
      }
    }

    if (current === 4) {
      for (const q of settings.questions) {
        if (!q.required) continue;
        const answer = data.questionAnswers.find((a) => a.id === q.id)?.answer?.trim() ?? "";
        if (answer.length < 10) {
          next.questionAnswers = `Please answer all required questions thoughtfully`;
          break;
        }
      }
    }

    if (current === 5) {
      if (!data.availabilityConfirm) next.availabilityConfirm = "Please confirm availability";
      if (!data.transportationConfirm) next.transportationConfirm = "Please confirm transportation";
      if (!data.creativeDirectionConfirm) {
        next.creativeDirectionConfirm = "Please confirm creative direction agreement";
      }
    }

    if (current === 6) {
      if (!data.agreementCurated) next.agreementCurated = "Required";
      if (!data.agreementNoGuarantee) next.agreementNoGuarantee = "Required";
      if (!data.agreementGuidelines) next.agreementGuidelines = "Required";
      if (!data.agreementAccurate) next.agreementAccurate = "Required";
    }

    return next;
  };

  const validateStep = (current: number): boolean => {
    const next = getStepErrors(current);
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateAllSteps = (): number | null => {
    const allErrors: FormErrors<SessionApplicationData> = {};
    for (let s = 1; s <= APPLICATION_STEPS.length; s++) {
      Object.assign(allErrors, getStepErrors(s));
    }
    setErrors(allErrors);
    if (Object.keys(allErrors).length === 0) return null;
    for (let s = 1; s <= APPLICATION_STEPS.length; s++) {
      if (Object.keys(getStepErrors(s)).length > 0) return s;
    }
    return 1;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, APPLICATION_STEPS.length));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function handlePortfolioUpload(files: FileList | null) {
    if (!files?.length) return;
    const remaining = MAX_PORTFOLIO_UPLOADS - data.portfolioImages.length;
    if (remaining <= 0) return;

    setUploading(true);
    const uploads = Array.from(files).slice(0, remaining);
    const added: string[] = [];

    try {
      for (const file of uploads) {
        const url = await uploadImageFile(file, "/api/submit/session/upload", {
          fields: { uploadToken, volumeId: volume.id },
        });
        added.push(url);
      }
      if (added.length > 0) {
        setData((prev) => ({
          ...prev,
          portfolioImages: [...prev.portfolioImages, ...added],
        }));
      }
    } catch (err) {
      console.error("Upload error:", err);
      setErrors((prev) => ({
        ...prev,
        portfolioImages:
          err instanceof Error ? err.message : "Image upload failed. Please try again.",
      }));
      if (added.length > 0) {
        setData((prev) => ({
          ...prev,
          portfolioImages: [...prev.portfolioImages, ...added],
        }));
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
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
    try {
      setFormError("");
      const res = await fetch("/api/submit/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          uploadToken,
          idempotencyKey: idempotencyKeyRef.current || crypto.randomUUID(),
          ...spam.spamPayload(),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const mapped = mapApiErrorsToForm<SessionApplicationData>(
          payload,
          "fullName",
          res.status === 429
        );
        setErrors(mapped);
        setFormError(
          typeof payload.error === "string"
            ? payload.error
            : "Application could not be submitted. Please try again."
        );
        return;
      }

      const id =
        typeof payload.applicationId === "string"
          ? payload.applicationId
          : typeof payload.inquiryId === "string"
            ? payload.inquiryId
            : undefined;
      if (!id) {
        setFormError("Submission could not be completed. Please try again.");
        return;
      }

      trackConversion("session");
      setApplicationId(id);
      setSubmitted(true);
      try {
        sessionStorage.removeItem(storageKey);
        sessionStorage.removeItem(`${storageKey}:idempotency`);
      } catch {
        /* ignore */
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setFormError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted && applicationId) {
    return (
      <SessionApplicationSuccess
        title={applicationContent.successTitle || "Application Received"}
        message={
          settings.customConfirmationMessage ||
          applicationContent.successMessage ||
          settings.emailTemplates.submissionConfirmation
        }
        applicationId={applicationId}
        volumeTitle={volume.title}
      />
    );
  }

  return (
    <div className="relative">
      <SessionApplicationProgress currentStep={step} />
      {autosaved && (
        <p className="mb-4 text-center text-xs text-muted" aria-live="polite">
          Progress saved
        </p>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={stepMotion.initial}
          animate={stepMotion.animate}
          exit={stepMotion.exit}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="headline-md">Personal Information</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <FormField name="fullName" label="Full Name" required error={errors.fullName}>
                  <TextInput value={data.fullName} onChange={(e) => update("fullName", e.target.value)} error={!!errors.fullName} />
                </FormField>
                <FormField name="email" label="Email Address" required error={errors.email}>
                  <TextInput type="email" value={data.email} onChange={(e) => update("email", e.target.value)} error={!!errors.email} />
                </FormField>
                <FormField name="phone" label="Phone Number" required error={errors.phone}>
                  <TextInput type="tel" value={data.phone} onChange={(e) => update("phone", formatPhone(e.target.value))} error={!!errors.phone} />
                </FormField>
                <FormField name="cityState" label="City & State" required error={errors.cityState}>
                  <TextInput value={data.cityState} onChange={(e) => update("cityState", e.target.value)} error={!!errors.cityState} />
                </FormField>
                <FormField name="instagram" label="Instagram Username" required error={errors.instagram}>
                  <TextInput value={data.instagram} onChange={(e) => update("instagram", e.target.value)} placeholder="@yourhandle" error={!!errors.instagram} />
                </FormField>
                <FormField name="portfolioWebsite" label="Portfolio or Website" hint="Optional" error={errors.portfolioWebsite}>
                  <TextInput type="url" value={data.portfolioWebsite || ""} onChange={(e) => update("portfolioWebsite", e.target.value)} placeholder="https://" error={!!errors.portfolioWebsite} />
                </FormField>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="headline-md">Creative Profile</h2>
              <p className="text-sm text-fog">Select every role that describes how you would contribute to this production.</p>
              <SelectableGrid
                options={[...SESSION_APPLICATION_ROLES]}
                selected={data.roles}
                onToggle={toggleRole}
                multi
                columns="sm:grid-cols-2 lg:grid-cols-3"
              />
              {errors.roles && <p className="field-error">{errors.roles}</p>}
              <FormField name="experience" label="Experience" hint="Optional — years, notable projects, representation">
                <TextArea value={data.experience || ""} onChange={(e) => update("experience", e.target.value)} rows={4} />
              </FormField>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <h2 className="headline-md">Portfolio</h2>
              <div>
                <p className="mb-4 text-sm text-fog">
                  Upload up to {MAX_PORTFOLIO_UPLOADS} images or provide a portfolio URL.
                </p>
                <label className="inline-flex min-h-11 cursor-pointer items-center border border-stone/50 px-5 py-3 text-xs tracking-wide text-fog uppercase hover:border-cream/40">
                  {uploading ? "Uploading..." : "Upload images"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    disabled={uploading || data.portfolioImages.length >= MAX_PORTFOLIO_UPLOADS}
                    onChange={(e) => void handlePortfolioUpload(e.target.files)}
                  />
                </label>
                {errors.portfolioImages && <p className="field-error mt-2">{errors.portfolioImages}</p>}
                {data.portfolioImages.length > 0 && (
                  <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                    {data.portfolioImages.map((url) => (
                      <div key={url} className="relative aspect-square border border-stone/30">
                        <AdminPreviewImage src={url} alt="" fill className="object-cover" sizes="120px" />
                        <button
                          type="button"
                          onClick={() => update("portfolioImages", data.portfolioImages.filter((u) => u !== url))}
                          className="absolute inset-x-0 bottom-0 flex min-h-9 items-center justify-center bg-ink/80 py-1.5 text-[0.65rem] tracking-wide text-fog uppercase hover:bg-ink/90 hover:text-cream"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <FormField name="portfolioLink" label="Portfolio URL" error={errors.portfolioLink}>
                <TextInput type="url" value={data.portfolioLink || ""} onChange={(e) => update("portfolioLink", e.target.value)} placeholder="https://" error={!!errors.portfolioLink} />
              </FormField>
              <div className="grid gap-4 md:grid-cols-2">
                {(
                  [
                    ["demoReel", "Demo reel"],
                    ["youtube", "YouTube"],
                    ["vimeo", "Vimeo"],
                    ["behance", "Behance"],
                    ["driveLink", "Drive link"],
                  ] as const
                ).map(([key, label]) => (
                  <FormField key={key} name={key} label={label} hint="Optional" error={errors[key]}>
                    <TextInput type="url" value={data[key] || ""} onChange={(e) => update(key, e.target.value)} placeholder="https://" />
                  </FormField>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8">
              <h2 className="headline-md">Session Questions</h2>
              {settings.questions.map((q) => (
                <FormField key={q.id} name={q.id} label={q.label} required={q.required} error={errors.questionAnswers}>
                  <TextArea
                    value={data.questionAnswers.find((a) => a.id === q.id)?.answer ?? ""}
                    onChange={(e) => updateQuestionAnswer(q.id, e.target.value)}
                    placeholder={q.placeholder}
                    rows={5}
                    maxLength={q.maxLength}
                  />
                </FormField>
              ))}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <h2 className="headline-md">Logistics</h2>
              <CheckboxField
                name="availabilityConfirm"
                checked={data.availabilityConfirm}
                onChange={(e) => update("availabilityConfirm", e.target.checked)}
                label="I confirm availability for the session date once accepted."
              />
              <CheckboxField
                name="transportationConfirm"
                checked={data.transportationConfirm}
                onChange={(e) => update("transportationConfirm", e.target.checked)}
                label="I can arrange my own transportation to the session location."
              />
              <CheckboxField
                name="creativeDirectionConfirm"
                checked={data.creativeDirectionConfirm}
                onChange={(e) => update("creativeDirectionConfirm", e.target.checked)}
                label="I am willing to follow wardrobe, styling, and creative direction for this production."
              />
              <FormField name="emergencyContact" label="Emergency contact" hint="Optional">
                <TextInput value={data.emergencyContact || ""} onChange={(e) => update("emergencyContact", e.target.value)} />
              </FormField>
              {(errors.availabilityConfirm || errors.transportationConfirm || errors.creativeDirectionConfirm) && (
                <p className="field-error">Please confirm all required logistics items.</p>
              )}
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6">
              <h2 className="headline-md">Agreements</h2>
              <CheckboxField
                name="agreementCurated"
                checked={data.agreementCurated}
                onChange={(e) => update("agreementCurated", e.target.checked)}
                label="I understand this is a curated creative experience."
              />
              <CheckboxField
                name="agreementNoGuarantee"
                checked={data.agreementNoGuarantee}
                onChange={(e) => update("agreementNoGuarantee", e.target.checked)}
                label="I understand submission does not guarantee selection."
              />
              <CheckboxField
                name="agreementGuidelines"
                checked={data.agreementGuidelines}
                onChange={(e) => update("agreementGuidelines", e.target.checked)}
                label="I agree to follow production guidelines if selected."
              />
              <CheckboxField
                name="agreementAccurate"
                checked={data.agreementAccurate}
                onChange={(e) => update("agreementAccurate", e.target.checked)}
                label="I confirm all information provided is accurate."
              />
              {(errors.agreementCurated ||
                errors.agreementNoGuarantee ||
                errors.agreementGuidelines ||
                errors.agreementAccurate) && (
                <p className="field-error">Please accept all required agreements.</p>
              )}
              <FormSpamFields
                honeypot={spam.honeypot}
                onHoneypotChange={spam.setHoneypot}
                formLoadedAt={spam.formLoadedAt}
                turnstileToken={spam.turnstileToken}
                onTurnstileVerify={spam.setTurnstileToken}
                onTurnstileExpire={() => spam.setTurnstileToken("")}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {formError && (
        <p className="mt-6 text-sm text-red-300" role="alert" aria-live="assertive">
          {formError}
        </p>
      )}

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-stone/30 pt-8">
        {step > 1 ? (
          <button
            type="button"
            onClick={goBack}
            className="inline-flex min-h-11 items-center text-sm text-fog hover:text-cream"
          >
            ← Back
          </button>
        ) : (
          <span />
        )}
        {step < APPLICATION_STEPS.length ? (
          <button
            type="button"
            onClick={goNext}
            className="inline-flex min-h-12 items-center bg-cream px-8 py-3 text-xs tracking-[0.15em] text-ink uppercase"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={loading || !spam.canSubmit()}
            className="inline-flex min-h-12 items-center bg-cream px-8 py-3 text-xs tracking-[0.15em] text-ink uppercase disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Application"}
          </button>
        )}
      </div>
    </div>
  );
}
