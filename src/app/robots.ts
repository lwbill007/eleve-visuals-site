import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://elevevisuals.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /gallery/ and /b/ are private client deliveries. The pages are also
        // noindex at the document level; this is the belt to that's braces, and
        // it keeps client names out of crawl logs entirely.
        disallow: ["/admin/", "/api/", "/login", "/gallery/", "/b/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
