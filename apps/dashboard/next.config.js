const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /** Minimal server bundle for Linux PM2 — copy `.next/standalone` + run `prepare-standalone` after build. */
  output: "standalone",
  transpilePackages: ["@helloadd/database"],
  experimental: {
    /** Trace workspace packages (`@helloadd/database`) from monorepo root. */
    outputFileTracingRoot: path.join(__dirname, "../../"),
    optimizePackageImports: ["lucide-react", "recharts"],
    instrumentationHook: true,
    serverComponentsExternalPackages: ["node-cron", "exceljs"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals ?? [];
      if (Array.isArray(config.externals)) {
        config.externals.push("node-cron", "exceljs");
      }
    }
    return config;
  },
};

module.exports = nextConfig;
