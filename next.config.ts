import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Tell Next.js not to bundle Prisma so server paths stay intact
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-mariadb"],
  // 2. Map Turbopack directly to the generated client
  experimental: {
    turbo: {
      resolveAlias: {
        ".prisma/client/default": "./node_modules/.prisma/client/default.js",
      },
    },
  },
};

export default nextConfig;