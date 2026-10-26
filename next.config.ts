import type { NextConfig } from "next";

/**
 * Dev-only: hostnames allowed to request dev assets, e.g. a remote preview.
 * Comma separated, no scheme or port (see Next's `allowedDevOrigins`).
 * Production builds ignore this completely.
 */
const allowedDevOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  cacheComponents: true,
  allowedDevOrigins,
  experimental: {
    instantInsights: {
      /**
       * CareDose screens are Client Components that read everything on the
       * device, so Next.js cannot validate an instant server-rendered UI for
       * them and every route reports a false alarm. Validate only segments that
       * opt in with `export const instant`. Static-shell validation, which does
       * apply to these pages, stays on.
       */
      validationLevel: "manual-warning",
    },
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
