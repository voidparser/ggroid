import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Don't use trailing slash to avoid redirect issues
  trailingSlash: false,
  // No asset prefix needed when deploying to root
  // assetPrefix: '/',
  // Ensure the app knows it's at the root path
  basePath: ''
};

export default nextConfig;
