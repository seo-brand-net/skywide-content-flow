import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  outputFileTracingRoot: process.cwd(),
  serverExternalPackages: ['@react-pdf/renderer'],

  // Turbopack configuration for Next.js 16+
  turbopack: {
    resolveAlias: {
      canvas: { browser: './empty-module.js' },
      encoding: { browser: './empty-module.js' },
    },
  },

  // Webpack configuration (for --webpack flag or fallback)
  webpack: (config, { isServer }) => {
    // Fix for pdfjs-dist canvas dependency
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };
    }

    // Ignore canvas module in client-side builds
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
      encoding: false,
    };

    return config;
  },
};

export default nextConfig;
