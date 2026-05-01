import type { NextConfig } from "next";
import path from "node:path";

const config: NextConfig = {
  typedRoutes: true,
  transpilePackages: ["@whoopsie/detectors", "@whoopsie/sdk"],
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
};

export default config;
