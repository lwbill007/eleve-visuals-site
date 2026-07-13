"use client";

import { useState } from "react";
import {
  FormField,
  TextInput,
  TextArea,
  FormSuccess,
} from "@/components/ui/Form";
import { SubmitButton } from "@/components/ui/Button";
import { FormSpamFields, useFormSpam } from "@/components/forms/FormSpamFields";
import { trackConversion } from "@/lib/analytics-client";
import { isValidEmail, mapApiErrorsToForm, type FormErrors } from "@/lib/utils";

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const initialData: ContactFormData = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

export function ContactForm({ responseTime }: { responseTime?: string }) {
  const [data, setData] = useState<ContactFormData>(initialData);
  const [errors, setErrors] = useState<FormErrors<ContactFormData>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const spam = useFormSpam();
  const reply = responseTime?.trim() || "within 24–48 hours on business days";

  const update = (key: keyof ContactFormData, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: FormErrors<ContactFormData> = {};
    if (!data.name.trim()) next.name = "Name is required";
    if (!data.email.trim()) next.email = "Email is required";
    else if (!isValidEmail(data.email)) next.email = "Enter a valid email";
    if (!data.subject.trim()) next.subject = "Subject is required";
    if (!data.message.trim()) next.message = "Message is required";
    else if (data.message.trim().length < 10)
      next.message = "Please write at least 10 characters";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      const first = Object.keys(next)[0];
      requestAnimationFrame(() => document.getElementById(first)?.focus());
    }
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !spam.canSubmit()) return;
    setLoading(true);

    const res = await fetch("/api/submit/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, ...spam.spamPayload() }),
    });

    setLoading(false);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setErrors(
        mapApiErrorsToForm<ContactFormData>(payload, "name", res.status === 429)
      );
      return;
    }
    trackConversion("contact");
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <FormSuccess
        title="Message sent."
        message={`Thanks for reaching out. I'll get back to you ${reply}.`}
        actionLabel="Send another message"
        actionHref="/contact"
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="relative space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <FormField label="Name" name="name" required error={errors.name}>
          <TextInput
            id="name"
            value={data.name}
            onChange={(e) => update("name", e.target.value)}
            error={!!errors.name}
          />
        </FormField>
        <FormField label="Email" name="email" required error={errors.email}>
          <TextInput
            id="email"
            type="email"
            value={data.email}
            onChange={(e) => update("email", e.target.value)}
            error={!!errors.email}
          />
        </FormField>
      </div>
      <FormField label="Subject" name="subject" required error={errors.subject}>
        <TextInput
          id="subject"
          value={data.subject}
          onChange={(e) => update("subject", e.target.value)}
          error={!!errors.subject}
        />
      </FormField>
      <FormField label="Message" name="message" required error={errors.message}>
        <TextArea
          id="message"
          value={data.message}
          onChange={(e) => update("message", e.target.value)}
          error={!!errors.message}
          rows={5}
        />
      </FormField>
      <FormSpamFields
        honeypot={spam.honeypot}
        onHoneypotChange={spam.setHoneypot}
        formLoadedAt={spam.formLoadedAt}
        turnstileToken={spam.turnstileToken}
        onTurnstileVerify={spam.setTurnstileToken}
        onTurnstileExpire={() => spam.setTurnstileToken("")}
      />
      <SubmitButton loading={loading} disabled={!spam.canSubmit()}>
        Send Message
      </SubmitButton>
    </form>
  );
}
