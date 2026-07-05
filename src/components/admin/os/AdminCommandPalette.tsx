"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ADMIN_COMMANDS } from "@/config/admin-nav";
import { adminFetch } from "@/lib/admin-fetch";
import type { AICommandResult } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

type PaletteItem = {
  id: string;
  label: string;
  sub: string;
  href: string;
  category: string;
};

export function AdminCommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PaletteItem[]>([]);
  const [commandResult, setCommandResult] = useState<AICommandResult | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const navResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ADMIN_COMMANDS.slice(0, 12).map((c) => ({
      id: c.href,
      label: c.label,
      sub: c.section,
      href: c.href,
      category: "Navigate",
    }));
    return ADMIN_COMMANDS.filter((c) => c.keywords.includes(q) || c.label.toLowerCase().includes(q))
      .slice(0, 12)
      .map((c) => ({
        id: c.href,
        label: c.label,
        sub: c.section,
        href: c.href,
        category: "Navigate",
      }));
  }, [query]);

  const results = query.length >= 2 && searchResults.length > 0 ? searchResults : navResults;

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSearchResults([]);
      setCommandResult(null);
      setActiveIndex(0);
    }
  }, [open]);

  const executeCommand = useCallback(
    async (command: string) => {
      const res = await adminFetch("/api/admin/ai/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      if (!res.ok) return;
      const result = (await res.json()) as AICommandResult;
      setCommandResult(result);

      if (result.type === "search" && result.results?.length) {
        setSearchResults(
          result.results.map((r, i) => ({
            id: `${r.href}-${i}`,
            label: r.label,
            sub: result.message,
            href: r.href,
            category: r.category,
          }))
        );
      } else if (result.type === "navigate" && result.href && !result.draft) {
        router.push(result.href);
        onClose();
      }
    },
    [router, onClose]
  );

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      onClose();
    },
    [router, onClose]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const q = query.trim();
        if (q.length >= 8 && looksLikeCommand(q)) {
          executeCommand(q);
          return;
        }
        const item = results[activeIndex];
        if (item) navigate(item.href);
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, results, activeIndex, query, executeCommand, navigate]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      setCommandResult(null);
      return;
    }
    const q = query.trim();
    const t = setTimeout(async () => {
      if (looksLikeCommand(q)) {
        await executeCommand(q);
        return;
      }
      const [textRes, aiRes] = await Promise.all([
        adminFetch(`/api/admin/os/search?q=${encodeURIComponent(q)}`),
        adminFetch("/api/admin/ai/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
        }),
      ]);
      const textData = textRes.ok ? await textRes.json() : { results: [] };
      const aiData = aiRes.ok ? await aiRes.json() : { results: [] };
      const merged = [...(aiData.results ?? []), ...(textData.results ?? [])];
      const seen = new Set<string>();
      setSearchResults(
        merged
          .filter((r: { href: string; label: string; sub?: string; category?: string }) => {
            const key = `${r.href}-${r.label}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .map((r: { href: string; label: string; sub?: string; category?: string }, i: number) => ({
            id: `${r.href}-${i}`,
            label: r.label,
            sub: r.sub ?? "",
            href: r.href,
            category: r.category ?? "Search",
          }))
      );
    }, 300);
    return () => clearTimeout(t);
  }, [query, executeCommand]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[300] flex items-start justify-center bg-ink/80 p-4 pt-[12vh] backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-xl overflow-hidden rounded-xl border border-stone/30 bg-charcoal shadow-2xl"
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 border-b border-stone/25 px-4 py-3">
            <span className="text-accent">✦</span>
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              placeholder="Command — create invoice, email applicants, show revenue…"
              className="min-w-0 flex-1 bg-transparent text-sm text-cream outline-none placeholder:text-muted"
            />
            <kbd className="hidden rounded border border-stone/40 px-1.5 py-0.5 text-[0.65rem] text-muted sm:inline">
              ESC
            </kbd>
          </div>

          {commandResult && (commandResult.draft || commandResult.message) && (
            <div className="border-b border-stone/20 bg-accent/5 px-4 py-3">
              <p className="text-xs text-accent uppercase">{commandResult.type}</p>
              <p className="mt-1 text-sm text-cream-dim">{commandResult.message}</p>
              {commandResult.draft && (
                <p className="mt-2 max-h-24 overflow-y-auto whitespace-pre-wrap text-xs text-fog">{commandResult.draft}</p>
              )}
              {commandResult.href && (
                <button
                  type="button"
                  onClick={() => navigate(commandResult.href!)}
                  className="mt-2 text-xs text-accent uppercase hover:underline"
                >
                  {commandResult.label ?? "Open"} →
                </button>
              )}
            </div>
          )}

          <ul className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
            {results.length === 0 ? (
              <li className="px-3 py-8 text-center text-sm text-muted">
                Type a command or search…
              </li>
            ) : (
              results.map((item, i) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => navigate(item.href)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      i === activeIndex ? "bg-accent/15 text-cream" : "text-fog hover:bg-stone/20 hover:text-cream"
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{item.label}</span>
                      <span className="block truncate text-xs text-muted">{item.sub}</span>
                    </span>
                    <span className="shrink-0 text-[0.6rem] tracking-wider text-muted uppercase">{item.category}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function looksLikeCommand(q: string): boolean {
  const lower = q.toLowerCase();
  const verbs = ["create", "email", "find", "show", "open", "generate", "book", "send"];
  return verbs.some((v) => lower.startsWith(v) || lower.includes(` ${v} `)) || lower.includes("vol.");
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return { open, setOpen };
}
