import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /** Tree-shake icon imports instead of pulling the full lucide package per route. */
    optimizePackageImports: ["lucide-react"],
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