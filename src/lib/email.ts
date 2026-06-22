const RESEND_API = "https://api.resend.com/emails";

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
