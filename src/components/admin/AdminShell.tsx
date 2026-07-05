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

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  const base = href.split("?")[0];
  return pathname === base || pathname.startsWith(`${base}/`);
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
            <p className="mt-0.5 text-[0.65rem] tracking-[0.2em] text-accent uppercase">Business Operating System</p>
          </Link>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4">
          {ADMIN_NAV.map((section) => (
            <div key={section.label}>
              <p className="mb-1.5 px-3 text-[0.55rem] tracking-[0.22em] text-muted uppercase">{section.label}</p>
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm transition-all duration-200",
                      isActive(pathname, item.href)
                        ? "bg-ink text-cream shadow-inner"
                        : "text-fog hover:bg-ink/50 hover:text-cream"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
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

          <h1 className="min-w-0 flex-1 truncate font-display text-xl text-cream sm:text-2xl">{title || "Dashboard"}</h1>

          <AskAIButton className="hidden sm:inline-flex" />
          <AINotificationsBell />

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden items-center gap-2 rounded-lg border border-stone/30 px-3 py-2 text-xs text-muted transition-colors hover:border-stone/50 hover:text-fog sm:flex"
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

        <div className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}

function resolvePageContext(pathname: string, search = "") {
  const params = new URLSearchParams(search);
  if (pathname === "/admin") return "dashboard" as const;
  if (pathname.startsWith("/admin/crm/")) return "crm_profile" as const;
  if (pathname.startsWith("/admin/crm")) return "crm" as const;
  if (pathname.startsWith("/admin/pipeline")) return "pipeline" as const;
  if (pathname.startsWith("/admin/bookings-ai")) return "bookings" as const;
  if (pathname.startsWith("/admin/analytics")) return "analytics" as const;
  if (pathname.startsWith("/admin/marketing")) return "marketing" as const;
  if (pathname.startsWith("/admin/email")) return "email" as const;
  if (pathname.startsWith("/admin/portfolio")) return "portfolio" as const;
  if (pathname.startsWith("/admin/applications")) return "applications" as const;
  if (pathname.startsWith("/admin/sessions")) return "sessions" as const;
  if (pathname.startsWith("/admin/sponsorship")) return "sponsorship" as const;
  if (pathname.startsWith("/admin/automations")) return "automations" as const;
  if (pathname.startsWith("/admin/reports")) return "reports" as const;
  if (pathname.startsWith("/admin/insights")) return "insights" as const;
  if (pathname.startsWith("/admin/assistant")) return "assistant" as const;
  if (pathname.startsWith("/admin/memory")) return "memory" as const;
  if (pathname.startsWith("/admin/submissions") && params.get("type") === "booking") return "bookings" as const;
  return "general" as const;
}
