const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    outputFileTracingRoot: path.join(__dirname, "../../"),
  },
  async redirects() {
    return [{ source: "/agency-clients", destination: "/agencies", permanent: true }];
  },
};

module.exports = nextConfig;
