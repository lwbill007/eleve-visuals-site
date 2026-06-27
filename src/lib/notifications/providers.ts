/**
 * Provider-agnostic notification transport layer.
 *
 * Swapping providers later (e.g. Postmark for Resend, MessageBird for Twilio)
 * only requires changing the factory functions at the bottom of this file.
 * Form logic and the notifier service never reference a concrete provider.
 */
import webpush from "web-push";
import type { WebhookConfig, WebhookType } from "@/lib/types";

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export interface SmsMessage {
  to: string;
  body: string;
}

export interface DeliveryResult {
  ok: boolean;
  provider: string;
  error?: string;
}

export interface EmailProvider {
  readonly name: string;
  isConfigured(): boolean;
  send(message: EmailMessage): Promise<DeliveryResult>;
}

export interface SmsProvider {
  readonly name: string;
  isConfigured(): boolean;
  send(message: SmsMessage): Promise<DeliveryResult>;
}

const RESEND_API = "https://api.resend.com/emails";

class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";

  private get from() {
    return process.env.EMAIL_FROM || process.env.SITE_EMAIL || "";
  }

  isConfigured(): boolean {
    return !!process.env.RESEND_API_KEY && !!this.from;
  }

  async send(message: EmailMessage): Promise<DeliveryResult> {
    if (!this.isConfigured()) {
      return { ok: false, provider: this.name, error: "Email provider not configured" };
    }

    try {
      const res = await fetch(RESEND_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.from,
          to: Array.isArray(message.to) ? message.to : [message.to],
          subject: message.subject,
          html: message.html,
          reply_to: message.replyTo,
        }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        return {
          ok: false,
          provider: this.name,
          error: `Resend responded ${res.status}: ${detail.slice(0, 300)}`,
        };
      }

      return { ok: true, provider: this.name };
    } catch (error) {
      return {
        ok: false,
        provider: this.name,
        error: error instanceof Error ? error.message : "Email send failed",
      };
    }
  }
}

class TwilioSmsProvider implements SmsProvider {
  readonly name = "twilio";

  private get sid() {
    return process.env.TWILIO_ACCOUNT_SID || "";
  }
  private get token() {
    return process.env.TWILIO_AUTH_TOKEN || "";
  }
  private get from() {
    return process.env.TWILIO_FROM_NUMBER || "";
  }

  isConfigured(): boolean {
    return !!this.sid && !!this.token && !!this.from;
  }

  async send(message: SmsMessage): Promise<DeliveryResult> {
    if (!this.isConfigured()) {
      return { ok: false, provider: this.name, error: "SMS provider not configured" };
    }

    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.sid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${this.sid}:${this.token}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: message.to,
            From: this.from,
            Body: message.body,
          }),
        }
      );

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        return {
          ok: false,
          provider: this.name,
          error: `Twilio responded ${res.status}: ${detail.slice(0, 300)}`,
        };
      }

      return { ok: true, provider: this.name };
    } catch (error) {
      return {
        ok: false,
        provider: this.name,
        error: error instanceof Error ? error.message : "SMS send failed",
      };
    }
  }
}

export interface WebhookField {
  name: string;
  value: string;
}

export interface WebhookContent {
  formType: string;
  title: string;
  summary: string;
  fields: WebhookField[];
  url?: string;
  timestamp: string;
}

export interface WebhookProvider {
  readonly name: string;
  send(config: WebhookConfig, content: WebhookContent): Promise<DeliveryResult>;
}

class HttpWebhookProvider implements WebhookProvider {
  readonly name = "webhook";

  private buildBody(type: WebhookType, content: WebhookContent): unknown {
    if (type === "discord") {
      return {
        embeds: [
          {
            title: content.title,
            description: content.summary,
            url: content.url,
            timestamp: content.timestamp,
            color: 0xb8a88a,
            fields: content.fields.slice(0, 25).map((f) => ({
              name: f.name.slice(0, 256),
              value: (f.value || "—").slice(0, 1024),
              inline: false,
            })),
          },
        ],
      };
    }

    if (type === "slack") {
      const lines = content.fields.map((f) => `*${f.name}:* ${f.value || "—"}`);
      return {
        text: `*${content.title}*\n${content.summary}${
          content.url ? `\n<${content.url}|View in admin>` : ""
        }`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${content.title}*\n${content.summary}`,
            },
          },
          ...(lines.length
            ? [
                {
                  type: "section",
                  text: { type: "mrkdwn", text: lines.join("\n").slice(0, 2900) },
                },
              ]
            : []),
          ...(content.url
            ? [
                {
                  type: "section",
                  text: { type: "mrkdwn", text: `<${content.url}|View in admin>` },
                },
              ]
            : []),
        ],
      };
    }

    return {
      event: "form_submission",
      formType: content.formType,
      title: content.title,
      summary: content.summary,
      url: content.url,
      timestamp: content.timestamp,
      fields: content.fields,
    };
  }

  async send(config: WebhookConfig, content: WebhookContent): Promise<DeliveryResult> {
    if (!config.url) {
      return { ok: false, provider: this.name, error: "Webhook URL missing" };
    }

    try {
      const res = await fetch(config.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.buildBody(config.type, content)),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        return {
          ok: false,
          provider: this.name,
          error: `Webhook responded ${res.status}: ${detail.slice(0, 200)}`,
        };
      }

      return { ok: true, provider: this.name };
    } catch (error) {
      return {
        ok: false,
        provider: this.name,
        error: error instanceof Error ? error.message : "Webhook send failed",
      };
    }
  }
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  silent?: boolean;
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushSendResult {
  endpoint: string;
  ok: boolean;
  gone: boolean;
  error?: string;
}

export interface PushProvider {
  readonly name: string;
  isConfigured(): boolean;
  getPublicKey(): string;
  send(payload: PushPayload, targets: PushTarget[]): Promise<PushSendResult[]>;
}

class WebPushProvider implements PushProvider {
  readonly name = "web-push";
  private configured = false;

  isConfigured(): boolean {
    return !!process.env.VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY;
  }

  getPublicKey(): string {
    return process.env.VAPID_PUBLIC_KEY || "";
  }

  private ensureVapid() {
    if (this.configured || !this.isConfigured()) return;
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:notifications@elevevisuals.com",
      process.env.VAPID_PUBLIC_KEY as string,
      process.env.VAPID_PRIVATE_KEY as string
    );
    this.configured = true;
  }

  async send(payload: PushPayload, targets: PushTarget[]): Promise<PushSendResult[]> {
    if (!this.isConfigured()) {
      return targets.map((t) => ({
        endpoint: t.endpoint,
        ok: false,
        gone: false,
        error: "Push provider not configured",
      }));
    }

    this.ensureVapid();
    const data = JSON.stringify(payload);

    return Promise.all(
      targets.map(async (target) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: target.endpoint,
              keys: { p256dh: target.p256dh, auth: target.auth },
            },
            data
          );
          return { endpoint: target.endpoint, ok: true, gone: false };
        } catch (error) {
          const statusCode =
            error && typeof error === "object" && "statusCode" in error
              ? (error as { statusCode?: number }).statusCode
              : undefined;
          const gone = statusCode === 404 || statusCode === 410;
          return {
            endpoint: target.endpoint,
            ok: false,
            gone,
            error: error instanceof Error ? error.message : "Push send failed",
          };
        }
      })
    );
  }
}

const emailProvider: EmailProvider = new ResendEmailProvider();
const smsProvider: SmsProvider = new TwilioSmsProvider();
const webhookProvider: WebhookProvider = new HttpWebhookProvider();
const pushProvider: PushProvider = new WebPushProvider();

export function getEmailProvider(): EmailProvider {
  return emailProvider;
}

export function getSmsProvider(): SmsProvider {
  return smsProvider;
}

export function getWebhookProvider(): WebhookProvider {
  return webhookProvider;
}

export function getPushProvider(): PushProvider {
  return pushProvider;
}
