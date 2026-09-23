import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // ExcelJS respects its own "browser" field in package.json (maps fs/stream to false).
  // An empty turbopack config silences the "webpack config ignored" warning.
  turbopack: {},
};

export default nextConfig;
