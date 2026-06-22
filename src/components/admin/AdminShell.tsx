"use client";

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
      { label: "About & Pages", href: "/admin/content" },
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
      { label: "Booking Inquiries", href: "/admin/submissions?type=booking" },
      { label: "Booking Form", href: "/admin/booking" },
      { label: "All Submissions", href: "/admin/submissions" },
    ],
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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-ink lg:flex">
      <aside className="border-b border-stone/30 lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="p-6">
          <Link href="/admin" className="font-display text-xl text-cream">
            ÉLEVÉ Control
          </Link>
          <p className="mt-1 text-xs text-muted">Studio dashboard</p>
        </div>
        <nav className="space-y-6 px-3 pb-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="mb-2 px-3 text-[0.6rem] tracking-[0.2em] text-muted uppercase">
                {section.label}
              </p>
              <div className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "shrink-0 px-3 py-2 text-sm transition-colors",
                      isActive(pathname, item.href)
                        ? "bg-charcoal text-cream"
                        : "text-fog hover:text-cream"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="hidden border-t border-stone/20 p-4 lg:block">
          <Link href="/" className="mb-3 block text-xs text-fog hover:text-cream">
            ← View site
          </Link>
          <button
            type="button"
            onClick={logout}
            className="text-xs text-muted hover:text-cream"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-stone/30 px-6 py-5 lg:px-10">
          <h1 className="font-display text-2xl text-cream">{title || "Dashboard"}</h1>
          <div className="flex items-center gap-4 lg:hidden">
            <Link href="/" className="text-xs text-fog">
              View site
            </Link>
            <button type="button" onClick={logout} className="text-xs text-muted">
              Sign out
            </button>
          </div>
        </header>
        <div className="p-6 lg:p-10">{children}</div>
      </div>
    </div>
  );
}
