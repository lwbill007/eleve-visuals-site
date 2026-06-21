"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

export function TurnstileWidget({ onVerify, onExpire }: TurnstileWidgetProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!siteKey) return;

    window.onTurnstileLoad = () => setReady(true);

    if (window.turnstile) {
      setReady(true);
      return;
    }

    const existing = document.querySelector('script[src*="turnstile"]');
    if (existing) return;

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad";
    script.async = true;
    document.head.appendChild(script);
  }, [siteKey]);

  useEffect(() => {
    if (!siteKey || !ready || !containerRef.current || !window.turnstile) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onVerify,
      "expired-callback": onExpire,
      theme: "dark",
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [siteKey, ready, onVerify, onExpire]);

  if (!siteKey) return null;

  return <div ref={containerRef} className="mt-4" />;
}

interface FormSpamFieldsProps {
  honeypot: string;
  onHoneypotChange: (value: string) => void;
  formLoadedAt: number;
  turnstileToken: string;
  onTurnstileVerify: (token: string) => void;
  onTurnstileExpire: () => void;
}

export function FormSpamFields({
  honeypot,
  onHoneypotChange,
  turnstileToken,
  onTurnstileVerify,
  onTurnstileExpire,
}: FormSpamFieldsProps) {
  return (
    <>
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => onHoneypotChange(e.target.value)}
        />
      </div>
      <TurnstileWidget
        onVerify={onTurnstileVerify}
        onExpire={onTurnstileExpire}
      />
      {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken && (
        <p className="text-xs text-muted">Complete the security check above to submit.</p>
      )}
    </>
  );
}

export function useFormSpam() {
  const formLoadedAt = useRef(Date.now()).current;
  const [honeypot, setHoneypot] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");

  const turnstileRequired = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  function spamPayload() {
    return {
      _hp: honeypot,
      _ts: formLoadedAt,
      turnstileToken: turnstileToken || undefined,
      _sessionId: typeof window !== "undefined" ? getSessionId() : undefined,
    };
  }

  function canSubmit() {
    if (turnstileRequired && !turnstileToken) return false;
    return true;
  }

  return {
    honeypot,
    setHoneypot,
    turnstileToken,
    setTurnstileToken,
    formLoadedAt,
    spamPayload,
    canSubmit,
    turnstileRequired,
  };
}

function getSessionId(): string {
  try {
    const key = "eleve-analytics-session";
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "";
  }
}
