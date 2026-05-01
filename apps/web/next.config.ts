import type { NextConfig } from "next";

const config: NextConfig = {
  experimental: {
    typedRoutes: true,
  },
  transpilePackages: ["@whoops/detectors", "@whoops/sdk"],
};

export default config;
