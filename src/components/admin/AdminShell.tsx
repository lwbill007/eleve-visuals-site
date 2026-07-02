"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/admin" }],
  },
  {
    label: "Content",
    items: [
      { label: "Homepage", href: "/admin/homepage" },
      { label: "About", href: "/admin/about" },
      { label: "Contact", href: "/admin/contact" },
      { label: "Page Copy", href: "/admin/content" },
      { label: "Settings", href: "/admin/settings" },
      { label: "Media Library", href: "/admin/media" },
    ],
  },
  {
    label: "Collections",
    items: [
      { label: "Portfolio", href: "/admin/portfolio" },
      { label: "Services", href: "/admin/services" },
      { label: "ÉLEVÉ Sessions", href: "/admin/sessions" },
      { label: "Testimonials", href: "/admin/testimonials" },
    ],
  },
  {
    label: "Inquiries",
    items: [
      { label: "Booking CRM", href: "/admin/submissions?type=booking" },
      { label: "Applications", href: "/admin/applications" },
      { label: "Contact Messages", href: "/admin/submissions?type=contact" },
      { label: "All Submissions", href: "/admin/submissions" },
      { label: "Booking Form", href: "/admin/booking" },
    ],
  },
  {
    label: "System",
    items: [{ label: "Notifications", href: "/admin/notifications" }],
  },
];

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
  const pathname = usePathname();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile drawer is open.
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
      {/* Mobile backdrop */}
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
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-stone/30 bg-ink transition-transform duration-300 ease-out",
          "lg:static lg:z-auto lg:w-64 lg:max-w-none lg:shrink-0 lg:translate-x-0",
          navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between p-6">
          <div>
            <Link href="/admin" className="font-display text-xl text-cream">
              ÉLEVÉ Control
            </Link>
            <p className="mt-1 text-xs text-muted">Studio dashboard</p>
          </div>
          <button
            type="button"
            onClick={() => setNavOpen(false)}
            aria-label="Close menu"
            className="flex h-10 w-10 items-center justify-center text-2xl text-fog hover:text-cream lg:hidden"
          >
            ×
          </button>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="mb-2 px-3 text-[0.6rem] tracking-[0.2em] text-muted uppercase">
                {section.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-sm px-3 py-2.5 text-sm transition-colors",
                      isActive(pathname, item.href)
                        ? "bg-charcoal text-cream"
                        : "text-fog hover:bg-charcoal/50 hover:text-cream"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-stone/20 p-4">
          <Link href="/" className="mb-3 block text-sm text-fog hover:text-cream">
            ← View site
          </Link>
          <button
            type="button"
            onClick={logout}
            className="text-sm text-muted hover:text-cream"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-stone/30 bg-ink/95 px-4 py-3.5 backdrop-blur sm:px-6 sm:py-5 lg:px-10">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center border border-stone/50 text-fog hover:text-cream lg:hidden"
          >
            <span className="flex flex-col gap-1">
              <span className="block h-px w-5 bg-current" />
              <span className="block h-px w-5 bg-current" />
              <span className="block h-px w-5 bg-current" />
            </span>
          </button>
          <h1 className="min-w-0 flex-1 truncate font-display text-xl text-cream sm:text-2xl">
            {title || "Dashboard"}
          </h1>
        </header>
        <div className="min-w-0 p-4 sm:p-6 lg:p-10">{children}</div>
      </div>
    </div>
  );
}
