import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Let other devices on the network (e.g. testing on a phone) load dev scripts.
  // Dev-only; add your machine's current LAN address if it changes.
  allowedDevOrigins: ["129.21.70.151"],
  cacheComponents: true,
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
