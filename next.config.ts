import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  // Local projects and hashed sessions must never enter a hosted build package.
  outputFileTracingExcludes: { "/*": ["./.data/**/*"] },
  turbopack: { root: process.cwd() },
};
export default config;
initOpenNextCloudflareForDev();
