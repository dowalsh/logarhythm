import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ Allow builds to succeed even with lint errors
  },
};

export default nextConfig;
