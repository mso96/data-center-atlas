import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Resolve local profile metadata before headers, including true 404 responses.
  htmlLimitedBots: /.*/,
  webpack(config, { webpack }) {
    if (process.env.ATLAS_RUNTIME === "cloudflare") {
      config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^@\/data$/, `${process.cwd()}/src/data/cloudflare.ts`));
    }
    return config;
  },
};

export default nextConfig;
