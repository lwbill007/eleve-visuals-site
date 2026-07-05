"use client";

import { useEffect, useRef, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import type { AIMessage } from "@/lib/ai/types";

const STARTERS = [
  "What patterns should I act on today?",
  "Which clients are highest revenue risk?",
  "What does memory say about our best marketing channel?",
  "Forecast next month based on current data.",
  "What should I prioritize for ÉLEVÉ Sessions?",
];

export function AIAssistantChat({ compact = false }: { compact?: boolean }) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    adminFetch("/api/admin/ai/status")
      .then((r) => r.json())
      .then((d) => setProvider(d.active));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function send(text: string) {
    if (!text.trim() || streaming) return;
    const userMsg: AIMessage = { role: "user", content: text.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setStreaming(true);

    const assistantMsg: AIMessage = { role: "assistant", content: "" };
    setMessages((m) => [...m, assistantMsg]);

    try {
      const res = await adminFetch("/api/admin/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: messages }),
      });

      if (!res.ok || !res.body) throw new Error("Chat failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload) as { text?: string; error?: string };
            if (parsed.error) {
              accumulated = parsed.error;
              setMessages((m) => {
                const next = [...m];
                next[next.length - 1] = { role: "assistant", content: accumulated };
                return next;
              });
            } else if (parsed.text) {
              accumulated += parsed.text;
              setMessages((m) => {
                const next = [...m];
                next[next.length - 1] = { role: "assistant", content: accumulated };
                return next;
              });
            }
          } catch {
            /* skip */
          }
        }
      }
    } catch {
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = {
          role: "assistant",
          content: "Something went wrong. Check AI provider configuration or try again.",
        };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className={`flex flex-col ${compact ? "h-[420px]" : "min-h-[60vh]"}`}>
      <div className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-stone/25 bg-charcoal/10 p-4">
        {messages.length === 0 && (
          <div className="space-y-4 py-6">
            <p className="text-center text-sm text-fog">
              Ask anything about bookings, clients, sessions, or growth.
              {provider && (
                <span className="mt-1 block text-xs text-muted">Provider: {provider}</span>
              )}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-stone/30 px-3 py-1.5 text-xs text-fog transition-colors hover:border-accent/40 hover:text-cream"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-[90%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === "user"
                ? "ml-auto bg-accent/15 text-cream"
                : "mr-auto border border-stone/20 bg-ink/60 text-cream-dim"
            }`}
          >
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask ÉLEVÉ AI…"
          disabled={streaming}
          className="min-w-0 flex-1 rounded-lg border border-stone/30 bg-charcoal/30 px-4 py-3 text-sm text-cream outline-none focus:border-accent/50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="shrink-0 rounded-lg bg-cream px-5 py-3 text-xs tracking-[0.12em] text-ink uppercase transition-colors hover:bg-accent disabled:opacity-40"
        >
          {streaming ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}
