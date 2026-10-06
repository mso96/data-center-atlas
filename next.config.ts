import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Resolve local profile metadata before headers, including true 404 responses.
  htmlLimitedBots: /.*/,
};

export default nextConfig;
