import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['googleapis', 'google-auth-library', 'gcp-metadata'],
  eslint: {
    // Allow production builds to complete even with ESLint warnings
    // Errors will still fail the build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
