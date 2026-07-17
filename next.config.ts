import type { NextConfig } from "next";

// Only load dev platform simulator in local dev — not during CF Pages build
if (process.env.NODE_ENV === "development") {
  const { setupDevPlatform } = await import("@cloudflare/next-on-pages/next-dev");
  await setupDevPlatform();
}

const nextConfig: NextConfig = {
  // Required for @cloudflare/next-on-pages
};

export default nextConfig;
