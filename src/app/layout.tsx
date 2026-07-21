import type { Metadata } from "next";
import { Suspense } from "react";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import { AnalyticsTracker } from "@/components/analytics/AnalyticsTracker";
import { PlausibleAnalytics } from "@/components/analytics/PlausibleAnalytics";
import { ReducedMotionMedia } from "@/components/accessibility/ReducedMotionMedia";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.CANONICAL_SITE_URL ||
      (process.env.NODE_ENV === "production"
        ? "https://www.eleve-visuals.com"
        : "http://localhost:3000")
  ),
  applicationName: "ÉLEVÉ Visuals",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${outfit.variable}`}>
      <body className="min-h-screen antialiased">
        <PlausibleAnalytics />
        <ReducedMotionMedia />
        <Suspense fallback={null}>
          <AnalyticsTracker />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
