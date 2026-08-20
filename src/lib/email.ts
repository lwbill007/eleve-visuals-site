const RESEND_API = "https://api.resend.com/emails";

/** Escape user-controlled text before interpolating into an HTML email template. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, html, replyTo }: SendEmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || process.env.SITE_EMAIL;
  if (!apiKey || !from) return false;

  const recipients = Array.isArray(to) ? to : [to];

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        html,
        reply_to: replyTo,
      }),
    });
    return res.ok;
  } catch (error) {
    console.error("Email send failed:", error);
    return false;
  }
}

export function applicationNotificationEmail({
  applicantName,
  volumeTitle,
  volumeNumber,
  applicationId,
  adminUrl,
}: {
  applicantName: string;
  volumeTitle: string;
  volumeNumber: number;
  applicationId: string;
  adminUrl: string;
}) {
  return {
    subject: `New ÉLEVÉ Sessions application — Vol. ${volumeNumber}`,
    html: `
      <p>A new application was submitted for <strong>${volumeTitle}</strong> (Vol. ${volumeNumber}).</p>
      <p><strong>Applicant:</strong> ${applicantName}</p>
      <p><strong>Application ID:</strong> ${applicationId}</p>
      <p><a href="${adminUrl}">Review in admin</a></p>
    `,
  };
}

export function applicantConfirmationEmail({
  name,
  volumeTitle,
  applicationId,
  message,
}: {
  name: string;
  volumeTitle: string;
  applicationId: string;
  message: string;
}) {
  return {
    subject: `Application received — ${volumeTitle}`,
    html: `
      <p>Hi ${name},</p>
      <p>${message}</p>
      <p><strong>Application ID:</strong> ${applicationId}</p>
      <p>— ÉLEVÉ Visuals</p>
    `,
  };
}

export function bookingNotificationEmail({
  name,
  email,
  services,
  preferredDate,
  inquiryId,
  adminUrl,
}: {
  name: string;
  email: string;
  services: string;
  preferredDate: string;
  inquiryId: string;
  adminUrl: string;
}) {
  return {
    subject: `New booking inquiry — ${name}`,
    html: `
      <p>A new booking inquiry was submitted.</p>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Services:</strong> ${services}</p>
      <p><strong>Preferred date:</strong> ${preferredDate}</p>
      <p><strong>Inquiry ID:</strong> ${inquiryId}</p>
      <p><a href="${adminUrl}">Review in admin</a></p>
    `,
  };
}

export function bookingConfirmationEmail({
  name,
  inquiryId,
}: {
  name: string;
  inquiryId: string;
}) {
  return {
    subject: "Booking inquiry received — ÉLEVÉ Visuals",
    html: `
      <p>Hi ${name},</p>
      <p>Thank you for reaching out to ÉLEVÉ Visuals. Your inquiry has been received and will be reviewed personally.</p>
      <p><strong>Inquiry ID:</strong> ${inquiryId}</p>
      <p>If your project aligns with our creative direction, we will follow up with availability and next steps.</p>
      <p>— ÉLEVÉ Visuals</p>
    `,
  };
}

export function applicationStatusEmail({
  name,
  volumeTitle,
  message,
}: {
  name: string;
  volumeTitle: string;
  message: string;
}) {
  return {
    subject: `ÉLEVÉ Sessions update — ${volumeTitle}`,
    html: `
      <p>Hi ${name},</p>
      <p>${message}</p>
      <p>— ÉLEVÉ Visuals</p>
    `,
  };
}

export function contractSignedEmail({
  name,
  signerName,
  isAdminCopy,
}: {
  name: string;
  signerName: string;
  isAdminCopy: boolean;
}) {
  const safeName = escapeHtml(name);
  const safeSigner = escapeHtml(signerName);
  return {
    subject: isAdminCopy ? `Contract signed — ${name}` : "Your contract has been signed — ÉLEVÉ Visuals",
    html: isAdminCopy
      ? `
      <p>${safeName}'s project agreement was signed by <strong>${safeSigner}</strong>.</p>
      <p>Review it in the admin booking detail page.</p>
    `
      : `
      <p>Hi ${safeName},</p>
      <p>Thanks — your project agreement has been signed and is on file.</p>
      <p>— ÉLEVÉ Visuals</p>
    `,
  };
}

export function depositConfirmedEmail({
  name,
  amount,
  isAdminCopy,
}: {
  name: string;
  amount: number;
  isAdminCopy: boolean;
}) {
  const safeName = escapeHtml(name);
  const formatted = `$${amount.toLocaleString()}`;
  return {
    subject: isAdminCopy ? `Deposit received — ${name}` : "Deposit received — ÉLEVÉ Visuals",
    html: isAdminCopy
      ? `
      <p>A deposit of <strong>${formatted}</strong> was received from ${safeName}. The booking has been advanced to Booked.</p>
    `
      : `
      <p>Hi ${safeName},</p>
      <p>We've received your deposit of <strong>${formatted}</strong> — your booking is confirmed.</p>
      <p>— ÉLEVÉ Visuals</p>
    `,
  };
}
