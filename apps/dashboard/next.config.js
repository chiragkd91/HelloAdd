const path = require("path");

const tracingRoot = path.join(__dirname, "../../");
const nextMajor = parseInt(require("next/package.json").version.split(".")[0], 10);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: ["@helloadd/database", "@helloadd/public-origins"],
  async redirects() {
    return [
      { source: "/Login", destination: "/login", permanent: true },
      { source: "/Register", destination: "/register", permanent: true },
    ];
  },
};

if (nextMajor >= 15) {
  nextConfig.outputFileTracingRoot = tracingRoot;
  nextConfig.serverExternalPackages = ["node-cron", "exceljs", "nodemailer"];
  nextConfig.experimental = {
    optimizePackageImports: ["lucide-react", "recharts"],
  };
} else {
  nextConfig.experimental = {
    outputFileTracingRoot: tracingRoot,
    optimizePackageImports: ["lucide-react", "recharts"],
    instrumentationHook: true,
    serverComponentsExternalPackages: ["node-cron", "exceljs", "nodemailer"],
  };
  nextConfig.webpack = (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals ?? [];
      if (Array.isArray(config.externals)) {
        config.externals.push("node-cron", "exceljs", "nodemailer");
      }
    }
    return config;
  };
}

module.exports = nextConfig;
