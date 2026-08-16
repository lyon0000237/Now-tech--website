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
    // AVIF FIRST, WEBP BEHIND IT, AND THE ORDER IS THE PREFERENCE. A browser
    // that accepts both is served AVIF, which on a packshot shot on white is
    // the case AVIF is best at: large flat areas and a single object. Everything
    // else falls back to WebP, and anything older than that to the original.
    //
    // The cost is the first encode, which is slower than WebP and happens once
    // per size per image, on the server, and is then cached for the 30 days
    // below. The reader never waits for it twice.
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
}

export default nextConfig
