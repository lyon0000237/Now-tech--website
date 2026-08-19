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
    // THE LADDER STOPS AT 1080, AND THE 502s ON VERCEL ARE WHY.
    //
    // The comment here used to say that packshots top out at 600x600 and that
    // anything larger is upscaling, and then listed 1200 and 1920 anyway. That
    // contradiction had a price. On a retina desktop the product page shows its
    // photograph at 710 css pixels, so the browser asks for 1420, so Next rounds
    // up to the next rung: 1920. Measured on the running optimiser, generating
    // that variant takes between 4.6 and 5.2 seconds, on top of fetching the
    // source from an origin that answers in 2 to 17. Vercel's image optimiser
    // has a budget, and the first visitor to each product paid it: 500 locally,
    // 502 in production.
    //
    // The ladder is now measured rather than assumed. Sampling 669 files from
    // the 6 686 exported to export/images: the median is 600 pixels wide, the
    // 75th centile 679, the 90th 1000, and only 0.6 per cent reach 1920. So the
    // top two rungs were upscaling 99.4 per cent of the library, spending five
    // seconds to invent pixels that were never photographed. Capping at 1080
    // gives the 710 pixel slot a 1.31x source, which on a packshot on white is
    // invisible, and it removes the rung that was timing out.
    imageSizes: [96, 128, 160, 200, 256, 320, 400],
    deviceSizes: [420, 640, 828, 1080],
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
