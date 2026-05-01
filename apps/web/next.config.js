const path = require("path");

const tracingRoot = path.join(__dirname, "../../");
const nextMajor = parseInt(require("next/package.json").version.split(".")[0], 10);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async redirects() {
    return [
      { source: "/agency-clients", destination: "/agencies", permanent: true },
      // App Router paths are case-sensitive on Linux; bookmarks / manual entry often use title case.
      { source: "/Login", destination: "/login", permanent: true },
      { source: "/Register", destination: "/register", permanent: true },
    ];
  },
};

if (nextMajor >= 15) {
  nextConfig.outputFileTracingRoot = tracingRoot;
} else {
  nextConfig.experimental = {
    outputFileTracingRoot: tracingRoot,
  };
}

module.exports = nextConfig;
