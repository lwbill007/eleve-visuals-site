"use client";

import {
  Suspense,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { ADMIN_NAV } from "@/config/admin-nav";
import {
  osAIContext,
  resolveOsPage,
} from "@/lib/ai/platform/os-systems";
import { AdminCommandPalette, useCommandPalette } from "@/components/admin/os/AdminCommandPalette";
import { AskAIButton } from "@/components/admin/ai/AskAIPanel";
import { AINotificationsBell } from "@/components/admin/ai/AINotificationsBell";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { ExecutiveContextProvider } from "@/components/admin/ai/ExecutiveContextProvider";
import { COOBar } from "@/components/admin/ai/COOBar";

const ADMIN_RECENT_KEY = "eleve-admin-recent:v1";

export function AdminShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const shellMounted = useContext(AdminShellMountedContext);
  if (shellMounted) return <>{children}</>;

  return (
    <AdminShellMountedContext.Provider value>
      <Suspense fallback={<AdminShellFallback title={title} />}>
        <AdminShellInner title={title}>{children}</AdminShellInner>
      </Suspense>
    </AdminShellMountedContext.Provider>
  );
}

const AdminShellMountedContext = createContext(false);

function AdminShellFallback({ title }: { title?: string }) {
  return (
    <div className="min-h-screen bg-ink lg:flex" aria-busy="true">
      <aside className="hidden w-64 shrink-0 border-r border-stone/20 bg-charcoal/95 p-5 lg:block">
        <p className="font-display text-xl tracking-wide text-cream">ÉLEVÉ OS</p>
        <div className="mt-8 space-y-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="h-9 animate-pulse rounded-lg bg-ink/60" />
          ))}
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="border-b border-stone/20 px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-xl text-cream sm:text-2xl">{title ?? "ÉLEVÉ OS"}</h1>
        </header>
        <div className="space-y-4 p-4 sm:p-6 lg:p-8">
          <div className="h-24 animate-pulse rounded-xl bg-charcoal/25" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-40 animate-pulse rounded-xl bg-charcoal/25" />
            <div className="h-40 animate-pulse rounded-xl bg-charcoal/25" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminShellInner({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const [desktopNav, setDesktopNav] = useState(false);
  const [openSystems, setOpenSystems] = useState<Set<string>>(
    () => new Set(["Command", "Work"])
  );
  const [recentWorkspaces, setRecentWorkspaces] = useState<{ label: string; href: string }[]>([]);
  const navRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();
  const resolvedPage = resolveOsPage(pathname, search);
  const resolvedTitle = title ?? resolvedPage?.label ?? "Home";

  useSetAIPage(osAIContext(resolvedPage, pathname));

  useEffect(() => {
    setNavOpen(false);
    const activeSection = ADMIN_NAV.find((section) =>
      section.items.some((item) => item.href === resolvedPage?.href)
    );
    if (activeSection) {
      setOpenSystems((current) => {
        if (current.has(activeSection.label)) return current;
        const next = new Set(current);
        next.add(activeSection.label);
        return next;
      });
    }
  }, [pathname, resolvedPage?.href, search]);

  useEffect(() => {
    const href = `${pathname}${search ? `?${search}` : ""}`;
    const current = { label: resolvedPage?.label ?? "Home", href };
    setRecentWorkspaces((previous) => {
      let seeded = previous;
      if (seeded.length === 0) {
        try {
          const stored = window.sessionStorage.getItem(ADMIN_RECENT_KEY);
          seeded = stored ? (JSON.parse(stored) as { label: string; href: string }[]) : [];
        } catch {
          seeded = [];
        }
      }
      const next = [current, ...seeded.filter((item) => item.href !== href)].slice(0, 4);
      try {
        window.sessionStorage.setItem(ADMIN_RECENT_KEY, JSON.stringify(next));
      } catch {
        // Navigation remains functional when storage is unavailable.
      }
      return next;
    });
  }, [pathname, resolvedPage?.label, search]);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => {
      setDesktopNav(query.matches);
      if (query.matches) setNavOpen(false);
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (navOpen) {
      const menuButton = menuButtonRef.current;
      document.body.style.overflow = "hidden";
      const focusable = Array.from(
        navRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );
      focusable[0]?.focus();

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setNavOpen(false);
          return;
        }
        if (event.key !== "Tab" || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      document.addEventListener("keydown", onKeyDown);
      return () => {
        document.body.style.overflow = "";
        document.removeEventListener("keydown", onKeyDown);
        menuButton?.focus();
      };
    }
  }, [navOpen]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <ExecutiveContextProvider>
      <div data-admin-shell-root className="min-h-screen bg-ink lg:flex">
      <AdminCommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {navOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-40 bg-ink/70 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        id="admin-sidebar"
        ref={navRef}
        inert={!navOpen && !desktopNav}
        aria-hidden={!navOpen && !desktopNav}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-stone/20 bg-charcoal/95 backdrop-blur-xl transition-transform duration-300 ease-out lg:static lg:z-auto lg:w-64 lg:max-w-none lg:shrink-0 lg:translate-x-0",
          navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="border-b border-stone/15 p-5">
          <Link href="/admin" className="block">
            <p className="font-display text-xl tracking-wide text-cream">ÉLEVÉ OS</p>
            <p className="mt-0.5 text-[0.65rem] tracking-[0.2em] text-accent uppercase">AI Operating System</p>
          </Link>
        </div>

        <nav aria-label="Admin" className="flex-1 space-y-5 overflow-y-auto px-2 py-4">
          {ADMIN_NAV.map((section) => {
            const expanded = openSystems.has(section.label);
            const sectionId = `admin-nav-${section.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
            return (
            <div key={section.label}>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={sectionId}
                onClick={() =>
                  setOpenSystems((current) => {
                    const next = new Set(current);
                    if (next.has(section.label)) next.delete(section.label);
                    else next.add(section.label);
                    return next;
                  })
                }
                className="flex min-h-10 w-full items-center justify-between px-3 text-[0.65rem] tracking-[0.16em] text-muted uppercase hover:text-cream"
              >
                {section.label}
                <span aria-hidden>{expanded ? "−" : "+"}</span>
              </button>
              {expanded ? (
              <div id={sectionId} className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const highlight = item.href === resolvedPage?.href;
                  return (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      className={cn(
                        "flex min-h-11 items-center rounded-lg px-3 py-2 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                        highlight
                          ? "bg-ink text-cream shadow-inner"
                          : "text-fog hover:bg-ink/50 hover:text-cream"
                      )}
                      aria-current={highlight ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
              ) : null}
            </div>
            );
          })}
          {recentWorkspaces.length > 1 ? (
            <div className="border-t border-stone/20 pt-4">
              <p className="px-3 text-[0.65rem] tracking-[0.16em] text-muted uppercase">Recent</p>
              <div className="mt-2 flex flex-col gap-0.5">
                {recentWorkspaces.slice(1).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm text-fog transition-colors hover:bg-stone/20 hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </nav>

        <div className="border-t border-stone/15 p-4">
          <Link href="/" className="mb-3 block text-sm text-fog transition-colors hover:text-cream">
            ← View site
          </Link>
          <button type="button" onClick={logout} className="text-sm text-muted transition-colors hover:text-cream">
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-stone/20 bg-ink/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
            aria-controls="admin-sidebar"
            aria-expanded={navOpen}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stone/30 text-fog lg:hidden"
          >
            ☰
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl text-cream sm:text-2xl">
              {resolvedTitle}
            </h1>
            <p className="mt-0.5 hidden text-[0.6rem] tracking-[0.12em] text-muted uppercase sm:block">
              ÉLEVÉ OS · ⌘K to jump
            </p>
          </div>

          <AskAIButton className="hidden sm:inline-flex" />
          <AINotificationsBell />

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden items-center gap-2 rounded-lg border border-stone/30 px-3 py-2 text-xs text-muted transition-colors hover:border-stone/50 hover:text-fog sm:flex"
            aria-keyshortcuts="Meta+K Control+K"
          >
            <span>Command</span>
            <kbd className="rounded border border-stone/40 px-1.5 py-0.5 text-[0.6rem]">⌘K</kbd>
          </button>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label="Search"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone/30 text-fog sm:hidden"
          >
            ⌕
          </button>
        </header>

        <COOBar />

        <div className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </div>
    </ExecutiveContextProvider>
  );
}
