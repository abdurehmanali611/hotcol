import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
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
        protocol: 'https',
        hostname: 'res.cloudinary.com'
      }
    ]
  }
};

export default nextConfig;