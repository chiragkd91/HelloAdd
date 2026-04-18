/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@helloadd/database"],
  experimental: {
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
