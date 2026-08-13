import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    // Product photography still lives on the WooCommerce origin. Nothing else
    // is allowed through the optimiser.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nowtechcenter.com',
        pathname: '/wp-content/uploads/**',
      },
    ],
    // Supplier packshots top out at 600x600, so anything larger is upscaling.
    // These lists are matched to the real grid cell sizes, which keeps the
    // optimiser from generating variants nothing ever requests.
    imageSizes: [96, 128, 160, 200, 256, 320, 400],
    deviceSizes: [420, 640, 828, 1080, 1200, 1920],
    formats: ['image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
}

export default nextConfig
