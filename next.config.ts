import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: "infra.umss.net",
  eslint: { ignoreDuringBuilds: true},
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
