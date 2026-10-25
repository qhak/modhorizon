import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  // Room for two bounded 10-minute local model passes and native checks.
  ...(process.env.MODHORIZON_LOCAL_HTTP === "true" ? { experimental: { proxyTimeout: 1_500_000 } } : {}),
  // Local projects and hashed sessions must never enter a hosted build package.
  outputFileTracingExcludes: { "/*": ["./.data/**/*"] },
  turbopack: { root: process.cwd() },
};
export default config;
initOpenNextCloudflareForDev();
