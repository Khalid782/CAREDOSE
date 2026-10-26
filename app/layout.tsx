import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppProviders } from "@/lib/context/AppProviders";
import { AppShell } from "@/components/AppShell";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareDose",
  description: "CareDose helps you take the right medicine at the right time, every day.",
  applicationName: "CareDose",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/icons/icon-192.png",
  },
  appleWebApp: { capable: true, title: "CareDose", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Pinch-to-zoom stays enabled: large text is a feature, not a bug.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f8f8" },
    { media: "(prefers-color-scheme: dark)", color: "#071f26" },
  ],
};

/**
 * Applies the saved theme and text size before the first paint so opening the
 * app in dark mode never flashes a white screen. Kept tiny and self-contained:
 * it only reads CareDose's own storage keys.
 */
const bootScript = `(function(){try{var s=JSON.parse(localStorage.getItem("caredose:settings")||"null")||{};var h=document.documentElement;if(s.theme==="dark"){h.classList.add("dark")}else if(s.theme==="light"){h.classList.remove("dark")}else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches){h.classList.add("dark")}if(s.fontSize){h.setAttribute("data-font-size",s.fontSize)}if(s.language){h.lang=s.language}}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-full">
        <ServiceWorkerRegistrar />
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
