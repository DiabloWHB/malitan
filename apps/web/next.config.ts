import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // תמיכה ב-canvas עבור @react-pdf/renderer
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };

    return config;
  },
};

export default nextConfig;
