"use client";

import { useState } from "react";
import type { BookingOptions } from "@/lib/types";
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
  type FormErrors,
} from "@/lib/utils";

interface BookingFormData {
  fullName: string;
  email: string;
  phone: string;
  instagram: string;
  serviceType: string;
  shootType: string;
  preferredDate: string;
  alternateDate: string;
  location: string;
  budgetRange: string;
  projectDetails: string;
  deliverables: string[];
  depositAck: boolean;
  termsAck: boolean;
}

const initialData: BookingFormData = {
  fullName: "",
  email: "",
  phone: "",
  instagram: "",
  serviceType: "",
  shootType: "",
  preferredDate: "",
  alternateDate: "",
  location: "",
  budgetRange: "",
  projectDetails: "",
  deliverables: [],
  depositAck: false,
  termsAck: false,
};

export function BookingForm({ bookingOptions }: { bookingOptions: BookingOptions }) {
  const [data, setData] = useState<BookingFormData>(initialData);
  const [errors, setErrors] = useState<FormErrors<BookingFormData>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const spam = useFormSpam();

  const update = <K extends keyof BookingFormData>(
    key: K,
    value: BookingFormData[K]
  ) => {
    setData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const toggleDeliverable = (item: string) => {
    const next = data.deliverables.includes(item)
      ? data.deliverables.filter((d) => d !== item)
      : [...data.deliverables, item];
    update("deliverables", next);
  };

  const validate = (): boolean => {
    const next: FormErrors<BookingFormData> = {};

    if (!data.fullName.trim()) next.fullName = "Full name is required";
    if (!data.email.trim()) next.email = "Email is required";
    else if (!isValidEmail(data.email)) next.email = "Enter a valid email";
    if (!data.phone.trim()) next.phone = "Phone number is required";
    else if (data.phone.replace(/\D/g, "").length < 10)
      next.phone = "Enter a valid 10-digit phone number";
    if (data.instagram && !isValidInstagram(data.instagram))
      next.instagram = "Enter a valid Instagram handle";
    if (!data.serviceType) next.serviceType = "Select a service type";
    if (!data.shootType) next.shootType = "Select a shoot type";
    if (!data.preferredDate) next.preferredDate = "Preferred date is required";
    if (!data.location.trim()) next.location = "Location is required";
    if (!data.budgetRange) next.budgetRange = "Select a budget range";
    if (!data.projectDetails.trim())
      next.projectDetails = "Tell us about your project";
    if (data.deliverables.length === 0)
      next.deliverables = "Select at least one deliverable";
    if (!data.depositAck)
      next.depositAck = "Deposit acknowledgement is required";
    if (!data.termsAck) next.termsAck = "Terms acknowledgement is required";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !spam.canSubmit()) return;

    setLoading(true);

    const res = await fetch("/api/submit/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, ...spam.spamPayload() }),
    });

    setLoading(false);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setErrors({
        fullName:
          res.status === 429
            ? "Too many attempts. Please wait and try again."
            : payload.error || "Something went wrong. Please try again.",
      });
      return;
    }
    trackConversion("booking");
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (submitted) {
    return (
      <FormSuccess
        title="Booking request received."
        message="Thank you for reaching out. I'll review your project details and respond within 24–48 hours with availability, next steps, and any follow-up questions."
        nextSteps={[
          "Personal review of your project scope and dates",
          "Direct email response with availability and quote",
          "Deposit invoice sent upon confirmation to lock your date",
          "Pre-production call scheduled before shoot day",
        ]}
        actionLabel="Back to home"
        actionHref="/"
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="relative space-y-10">
      <fieldset className="space-y-6">
        <legend className="label-caps mb-6 block">Contact Information</legend>

        <div className="grid gap-6 md:grid-cols-2">
          <FormField label="Full Name" name="fullName" required error={errors.fullName}>
            <TextInput
              id="fullName"
              name="fullName"
              value={data.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              error={!!errors.fullName}
              placeholder="Your full name"
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
              placeholder="you@email.com"
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
              placeholder="(555) 000-0000"
            />
          </FormField>

          <FormField
            label="Instagram Handle"
            name="instagram"
            error={errors.instagram}
            hint="Optional — helps me understand your aesthetic"
          >
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
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="label-caps mb-6 block">Project Details</legend>

        <div className="grid gap-6 md:grid-cols-2">
          <FormField label="Service Type" name="serviceType" required error={errors.serviceType}>
            <SelectInput
              id="serviceType"
              name="serviceType"
              placeholder="Select service"
              options={bookingOptions.serviceTypes}
              value={data.serviceType}
              onChange={(e) => update("serviceType", e.target.value)}
              error={!!errors.serviceType}
            />
          </FormField>

          <FormField label="Shoot Type" name="shootType" required error={errors.shootType}>
            <SelectInput
              id="shootType"
              name="shootType"
              placeholder="Select shoot type"
              options={bookingOptions.shootTypes}
              value={data.shootType}
              onChange={(e) => update("shootType", e.target.value)}
              error={!!errors.shootType}
            />
          </FormField>

          <FormField label="Preferred Date" name="preferredDate" required error={errors.preferredDate}>
            <TextInput
              id="preferredDate"
              name="preferredDate"
              type="date"
              value={data.preferredDate}
              onChange={(e) => update("preferredDate", e.target.value)}
              error={!!errors.preferredDate}
            />
          </FormField>

          <FormField
            label="Alternate Date"
            name="alternateDate"
            hint="Optional backup date"
          >
            <TextInput
              id="alternateDate"
              name="alternateDate"
              type="date"
              value={data.alternateDate}
              onChange={(e) => update("alternateDate", e.target.value)}
            />
          </FormField>

          <FormField label="Location" name="location" required error={errors.location}>
            <TextInput
              id="location"
              name="location"
              value={data.location}
              onChange={(e) => update("location", e.target.value)}
              error={!!errors.location}
              placeholder="City, venue, or address"
            />
          </FormField>

          <FormField label="Budget Range" name="budgetRange" required error={errors.budgetRange}>
            <SelectInput
              id="budgetRange"
              name="budgetRange"
              placeholder="Select budget range"
              options={bookingOptions.budgetRanges}
              value={data.budgetRange}
              onChange={(e) => update("budgetRange", e.target.value)}
              error={!!errors.budgetRange}
            />
          </FormField>
        </div>

        <FormField
          label="Project Details"
          name="projectDetails"
          required
          error={errors.projectDetails}
          hint="Vision, references, goals, timeline — the more detail, the better"
        >
          <TextArea
            id="projectDetails"
            name="projectDetails"
            value={data.projectDetails}
            onChange={(e) => update("projectDetails", e.target.value)}
            error={!!errors.projectDetails}
            placeholder="Tell me about the project, your vision, and what success looks like..."
            rows={5}
          />
        </FormField>

        <div>
          <p className="mb-3 text-sm text-cream-dim">
            Deliverables Needed <span className="text-accent">*</span>
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {bookingOptions.deliverables.map((item) => (
              <CheckboxField
                key={item}
                name={`deliverable-${item}`}
                label={item}
                checked={data.deliverables.includes(item)}
                onChange={() => toggleDeliverable(item)}
              />
            ))}
          </div>
          {errors.deliverables && (
            <p className="field-error mt-2">{errors.deliverables}</p>
          )}
        </div>
      </fieldset>

      <fieldset className="space-y-5 border-t border-stone/30 pt-8">
        <legend className="label-caps mb-4 block">Acknowledgements</legend>

        <CheckboxField
          name="depositAck"
          checked={data.depositAck}
          onChange={(e) => update("depositAck", e.target.checked)}
          label="I understand a 50% deposit is required to secure my booking date. Deposits are non-refundable but may be rescheduled with 72+ hours notice."
        />
        {errors.depositAck && <p className="field-error">{errors.depositAck}</p>}

        <CheckboxField
          name="termsAck"
          checked={data.termsAck}
          onChange={(e) => update("termsAck", e.target.checked)}
          label="I agree to ÉLEVÉ Visuals' booking terms, including turnaround timelines, usage rights, and cancellation policy."
        />
        {errors.termsAck && <p className="field-error">{errors.termsAck}</p>}
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
        Submit Booking Request
      </SubmitButton>
    </form>
  );
}
