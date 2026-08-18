import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/pos-agent/launcher": ["./pos-agent/Start HotCol POS Agent.bat"],
    "/api/pos-agent/server": ["./pos-agent/server.mjs"],
  },
  experimental: {
    // Windows: Turbopack FS cache compaction was blocking routes for minutes.
    turbopackFileSystemCacheForDev: false,
    /** Tree-shake icon and chart imports instead of pulling full packages per route. */
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "date-fns",
      "@tanstack/react-table",
      "@radix-ui/react-icons",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
    ],
  },
};

export default nextConfig;