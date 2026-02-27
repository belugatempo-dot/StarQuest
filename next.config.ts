import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["posthog-js", "@supabase/supabase-js", "sonner"],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "starquest-kappa.vercel.app",
          },
        ],
        destination: "https://starquest.beluga-tempo.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
