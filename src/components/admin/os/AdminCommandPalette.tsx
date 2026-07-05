"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ADMIN_COMMANDS } from "@/config/admin-nav";
import { adminFetch } from "@/lib/admin-fetch";
import { cn } from "@/lib/utils";

export function AdminCommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; label: string; sub: string; href: string; category: string }[]
  >([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const navResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ADMIN_COMMANDS.slice(0, 12);
    return ADMIN_COMMANDS.filter((c) => c.keywords.includes(q) || c.label.toLowerCase().includes(q)).slice(0, 12);
  }, [query]);

  const results = query.length >= 2 && searchResults.length > 0 ? searchResults : navResults;

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSearchResults([]);
      setActiveIndex(0);
    }
  }, [open]);

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
      if (e.key === "Enter" && results[activeIndex]) {
        e.preventDefault();
        const item = results[activeIndex];
        router.push("href" in item ? item.href : `/admin/submissions`);
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, results, activeIndex, router]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      adminFetch(`/api/admin/os/search?q=${encodeURIComponent(query.trim())}`)
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((data) => setSearchResults(data.results ?? []))
        .catch(() => setSearchResults([]));
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      onClose();
    },
    [router, onClose]
  );

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
            <span className="text-fog">⌘</span>
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              placeholder="Search clients, bookings, pages…"
              className="min-w-0 flex-1 bg-transparent text-sm text-cream outline-none placeholder:text-muted"
            />
            <kbd className="hidden rounded border border-stone/40 px-1.5 py-0.5 text-[0.65rem] text-muted sm:inline">
              ESC
            </kbd>
          </div>
          <ul className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
            {results.length === 0 ? (
              <li className="px-3 py-8 text-center text-sm text-muted">No results</li>
            ) : (
              results.map((item, i) => {
                const href = item.href;
                const sub = "sub" in item ? item.sub : "section" in item ? (item as { section: string }).section : "";
                const category = "category" in item ? item.category : "Navigate";
                return (
                  <li key={`${href}-${item.label}-${i}`}>
                    <button
                      type="button"
                      onClick={() => navigate(href)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                        i === activeIndex ? "bg-accent/15 text-cream" : "text-fog hover:bg-stone/20 hover:text-cream"
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm">{item.label}</span>
                        <span className="block truncate text-xs text-muted">{sub}</span>
                      </span>
                      <span className="shrink-0 text-[0.6rem] tracking-wider text-muted uppercase">{category}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
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
