"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { ADMIN_NAV } from "@/config/admin-nav";
import { AdminCommandPalette, useCommandPalette } from "@/components/admin/os/AdminCommandPalette";
import { AskAIButton } from "@/components/admin/ai/AskAIPanel";
import { AINotificationsBell } from "@/components/admin/ai/AINotificationsBell";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { ExecutiveContextProvider } from "@/components/admin/ai/ExecutiveContextProvider";
import { COOBar } from "@/components/admin/ai/COOBar";

function isActive(pathname: string, href: string, search: string) {
  const [pathPart, queryPart] = href.split("?");
  if (pathPart === "/admin") return pathname === "/admin";

  const pathMatch = pathname === pathPart || pathname.startsWith(`${pathPart}/`);
  if (!pathMatch) return false;

  if (!queryPart) {
    // Prefer exact path items over query-specific siblings (e.g. Inbox vs Bookings)
    return true;
  }

  const required = new URLSearchParams(queryPart);
  const current = new URLSearchParams(search);
  for (const [key, value] of required.entries()) {
    if (current.get(key) !== value) return false;
  }
  return true;
}

export function AdminShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <Suspense fallback={<AdminShellFallback title={title}>{children}</AdminShellFallback>}>
      <AdminShellInner title={title}>{children}</AdminShellInner>
    </Suspense>
  );
}

function AdminShellFallback({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="min-h-screen bg-ink">
      <div className="p-8">
        {title && <h1 className="font-display text-2xl text-cream">{title}</h1>}
        <div className="mt-6">{children}</div>
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
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();

  useSetAIPage(resolvePageContext(pathname, searchParams.toString()));

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (navOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
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
      <div className="min-h-screen bg-ink lg:flex">
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

        <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4">
          {ADMIN_NAV.map((section) => (
            <div key={section.label}>
              <p className="mb-1.5 px-3 text-[0.55rem] tracking-[0.22em] text-muted uppercase">{section.label}</p>
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const search = searchParams.toString();
                  const active = isActive(pathname, item.href, search);
                  // When both Inbox and Bookings match path, only highlight the more specific query item
                  const siblings = section.items.filter((s) => s.href.split("?")[0] === item.href.split("?")[0]);
                  const moreSpecificActive = siblings.some(
                    (s) => s.href.includes("?") && isActive(pathname, s.href, search) && s.href !== item.href
                  );
                  const highlight = active && !(item.href === "/admin/submissions" && moreSpecificActive);
                  return (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
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
            </div>
          ))}
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
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stone/30 text-fog lg:hidden"
          >
            ☰
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl text-cream sm:text-2xl">{title || "Home"}</h1>
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

function resolvePageContext(pathname: string, search = "") {
  const params = new URLSearchParams(search);
  if (pathname === "/admin") return "dashboard" as const;
  if (pathname.startsWith("/admin/briefing")) return "dashboard" as const;
  if (pathname.startsWith("/admin/crm/")) return "crm_profile" as const;
  if (pathname.startsWith("/admin/crm")) return "crm" as const;
  if (pathname.startsWith("/admin/pipeline") || pathname.startsWith("/admin/workboard")) return "pipeline" as const;
  if (pathname.startsWith("/admin/bookings-ai")) return "bookings" as const;
  if (pathname.startsWith("/admin/analytics")) return "analytics" as const;
  if (pathname.startsWith("/admin/website")) return "analytics" as const;
  if (pathname.startsWith("/admin/marketing")) return "marketing" as const;
  if (pathname.startsWith("/admin/email")) return "email" as const;
  if (pathname.startsWith("/admin/portfolio")) return "portfolio" as const;
  if (pathname.startsWith("/admin/applications")) return "applications" as const;
  if (pathname.startsWith("/admin/sessions")) return "sessions" as const;
  if (pathname.startsWith("/admin/sponsorship")) return "sponsorship" as const;
  if (pathname.startsWith("/admin/automations")) return "automations" as const;
  if (pathname.startsWith("/admin/reports")) return "reports" as const;
  if (pathname.startsWith("/admin/insights") || pathname.startsWith("/admin/leaks")) return "opportunities" as const;
  if (pathname.startsWith("/admin/intelligence") || pathname.startsWith("/admin/memory")) return "memory" as const;
  if (pathname.startsWith("/admin/opportunities")) return "opportunities" as const;
  if (pathname.startsWith("/admin/risks")) return "risks" as const;
  if (pathname.startsWith("/admin/assistant")) return "memory" as const;
  if (pathname.startsWith("/admin/submissions") && params.get("type") === "booking") return "bookings" as const;
  return "general" as const;
}
