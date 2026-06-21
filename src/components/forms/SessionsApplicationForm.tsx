"use client";

import { useState } from "react";
import {
  SESSIONS_APPLICANT_ROLES,
  EXPERIENCE_LEVELS,
  type SessionsApplicationContent,
} from "@/lib/types";
import {
  FormField,
  TextInput,
  TextArea,
  SelectInput,
  CheckboxField,
  FormSuccess,
} from "@/components/ui/Form";
import { SubmitButton } from "@/components/ui/Button";
import { FormSpamFields, useFormSpam } from "@/components/forms/FormSpamFields";
import { trackConversion } from "@/lib/analytics-client";
import {
  isValidEmail,
  isValidInstagram,
  formatPhone,
  mapApiErrorsToForm,
  type FormErrors,
} from "@/lib/utils";

interface ApplicationFormData {
  fullName: string;
  email: string;
  phone: string;
  instagram: string;
  ageConfirm: boolean;
  role: string;
  portfolioLink: string;
  experienceLevel: string;
  whyParticipate: string;
  themeFit: string;
  availabilityConfirm: boolean;
  mediaRelease: boolean;
}

const initialData: ApplicationFormData = {
  fullName: "",
  email: "",
  phone: "",
  instagram: "",
  ageConfirm: false,
  role: "",
  portfolioLink: "",
  experienceLevel: "",
  whyParticipate: "",
  themeFit: "",
  availabilityConfirm: false,
  mediaRelease: false,
};

export function SessionsApplicationForm({
  applicationContent,
}: {
  applicationContent: SessionsApplicationContent;
}) {
  const [data, setData] = useState<ApplicationFormData>(initialData);
  const [errors, setErrors] = useState<FormErrors<ApplicationFormData>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const spam = useFormSpam();

  const update = <K extends keyof ApplicationFormData>(
    key: K,
    value: ApplicationFormData[K]
  ) => {
    setData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validate = (): boolean => {
    const next: FormErrors<ApplicationFormData> = {};

    if (!data.fullName.trim()) next.fullName = "Full name is required";
    if (!data.email.trim()) next.email = "Email is required";
    else if (!isValidEmail(data.email)) next.email = "Enter a valid email";
    if (!data.phone.trim()) next.phone = "Phone number is required";
    else if (data.phone.replace(/\D/g, "").length < 10)
      next.phone = "Enter a valid 10-digit phone number";
    if (!data.instagram.trim()) next.instagram = "Instagram is required";
    else if (!isValidInstagram(data.instagram))
      next.instagram = "Enter a valid Instagram handle";
    if (!data.ageConfirm)
      next.ageConfirm = `You must confirm you are ${applicationContent.minAge}+`;
    if (!data.role) next.role = "Select your role";
    if (!data.portfolioLink.trim())
      next.portfolioLink = "Portfolio link is required";
    else if (!/^https?:\/\/.+/.test(data.portfolioLink))
      next.portfolioLink = "Enter a valid URL (https://...)";
    if (!data.experienceLevel)
      next.experienceLevel = "Select your experience level";
    if (!data.whyParticipate.trim())
      next.whyParticipate = "Tell us why you want to participate";
    else if (data.whyParticipate.trim().length < 10)
      next.whyParticipate = "Please share at least 10 characters";
    if (!data.themeFit.trim())
      next.themeFit = "Explain how you fit the session theme";
    else if (data.themeFit.trim().length < 10)
      next.themeFit = "Please share at least 10 characters";
    if (!data.availabilityConfirm)
      next.availabilityConfirm = "Availability confirmation is required";
    if (!data.mediaRelease)
      next.mediaRelease = "Media release acknowledgement is required";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !spam.canSubmit()) return;

    setLoading(true);

    const res = await fetch("/api/submit/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, ...spam.spamPayload() }),
    });

    setLoading(false);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setErrors(
        mapApiErrorsToForm<ApplicationFormData>(payload, "fullName", res.status === 429)
      );
      return;
    }
    trackConversion("session");
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (submitted) {
    return (
      <FormSuccess
        title={applicationContent.successTitle}
        message={applicationContent.successMessage}
        nextSteps={applicationContent.nextSteps}
        actionLabel="Back to ÉLEVÉ Sessions"
        actionHref="/sessions"
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="relative space-y-10">
      <fieldset className="space-y-6">
        <legend className="label-caps mb-6 block">About You</legend>

        <div className="grid gap-6 md:grid-cols-2">
          <FormField label="Full Name" name="fullName" required error={errors.fullName}>
            <TextInput
              id="fullName"
              name="fullName"
              value={data.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              error={!!errors.fullName}
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
            />
          </FormField>

          <FormField label="Instagram" name="instagram" required error={errors.instagram}>
            <TextInput
              id="instagram"
              name="instagram"
              value={data.instagram}
              onChange={(e) => update("instagram", e.target.value)}
              error={!!errors.instagram}
              placeholder="@yourhandle"
            />
          </FormField>
        </div>

        <CheckboxField
          name="ageConfirm"
          checked={data.ageConfirm}
          onChange={(e) => update("ageConfirm", e.target.checked)}
          label={`I confirm I am ${applicationContent.minAge} years of age or older.`}
        />
        {errors.ageConfirm && <p className="field-error">{errors.ageConfirm}</p>}
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="label-caps mb-6 block">Your Work</legend>

        <div className="grid gap-6 md:grid-cols-2">
          <FormField label="Role / Applicant Type" name="role" required error={errors.role}>
            <SelectInput
              id="role"
              name="role"
              placeholder="Select role"
              options={[...SESSIONS_APPLICANT_ROLES]}
              value={data.role}
              onChange={(e) => update("role", e.target.value)}
              error={!!errors.role}
            />
          </FormField>

          <FormField
            label="Experience Level"
            name="experienceLevel"
            required
            error={errors.experienceLevel}
          >
            <SelectInput
              id="experienceLevel"
              name="experienceLevel"
              placeholder="Select experience"
              options={[...EXPERIENCE_LEVELS]}
              value={data.experienceLevel}
              onChange={(e) => update("experienceLevel", e.target.value)}
              error={!!errors.experienceLevel}
            />
          </FormField>
        </div>

        <FormField
          label="Portfolio Link"
          name="portfolioLink"
          required
          error={errors.portfolioLink}
          hint="Website, Instagram, Behance, or direct link to your work"
        >
          <TextInput
            id="portfolioLink"
            name="portfolioLink"
            type="url"
            value={data.portfolioLink}
            onChange={(e) => update("portfolioLink", e.target.value)}
            error={!!errors.portfolioLink}
            placeholder="https://"
          />
        </FormField>
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="label-caps mb-6 block">Your Application</legend>

        <FormField
          label="Why do you want to participate?"
          name="whyParticipate"
          required
          error={errors.whyParticipate}
        >
          <TextArea
            id="whyParticipate"
            name="whyParticipate"
            value={data.whyParticipate}
            onChange={(e) => update("whyParticipate", e.target.value)}
            error={!!errors.whyParticipate}
            placeholder="What draws you to ÉLEVÉ Sessions?"
            rows={4}
          />
        </FormField>

        <FormField
          label="How do you fit the current theme?"
          name="themeFit"
          required
          error={errors.themeFit}
          hint="Reference the session theme and explain your aesthetic alignment"
        >
          <TextArea
            id="themeFit"
            name="themeFit"
            value={data.themeFit}
            onChange={(e) => update("themeFit", e.target.value)}
            error={!!errors.themeFit}
            placeholder="After Dark — shadow, texture, editorial restraint..."
            rows={4}
          />
        </FormField>
      </fieldset>

      <fieldset className="space-y-5 border-t border-stone/30 pt-8">
        <legend className="label-caps mb-4 block">Confirmations</legend>

        <CheckboxField
          name="availabilityConfirm"
          checked={data.availabilityConfirm}
          onChange={(e) => update("availabilityConfirm", e.target.checked)}
          label="I confirm availability for the session date once accepted, and understand that participation details will be sent upon approval."
        />
        {errors.availabilityConfirm && (
          <p className="field-error">{errors.availabilityConfirm}</p>
        )}

        <CheckboxField
          name="mediaRelease"
          checked={data.mediaRelease}
          onChange={(e) => update("mediaRelease", e.target.checked)}
          label="I acknowledge and agree to the media release terms — edited session images may be used by ÉLEVÉ Visuals for portfolio, social, and promotional purposes."
        />
        {errors.mediaRelease && (
          <p className="field-error">{errors.mediaRelease}</p>
        )}
      </fieldset>

      <FormSpamFields
        honeypot={spam.honeypot}
        onHoneypotChange={spam.setHoneypot}
        formLoadedAt={spam.formLoadedAt}
        turnstileToken={spam.turnstileToken}
        onTurnstileVerify={spam.setTurnstileToken}
        onTurnstileExpire={() => spam.setTurnstileToken("")}
      />

      <SubmitButton loading={loading} size="lg" disabled={!spam.canSubmit()}>
        Submit Application
      </SubmitButton>
    </form>
  );
}
