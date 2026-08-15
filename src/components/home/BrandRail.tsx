import Link from 'next/link'

import { formatCount } from '@/lib/format'
import type { BrandTile } from '@/lib/catalog'

/**
 * The brand wall, in real marks.
 *
 * Brand is navigation here, not social proof. The export has no brand taxonomy
 * at all, the column is filled on 14 rows out of 7 116, so these names were
 * recovered at ingest by reading category paths and product titles. That
 * recovery is what makes it possible to compare an HP laptop against a Dell one
 * in a single list, which the current site cannot do, and it is why each mark
 * carries its own count: the number is the promise that the door opens onto
 * something.
 *
 * HOW A LOGO IS PAINTED. The SVG is a mask, not an image. `mask-image` with
 * `background-color` means one file serves every state and both themes: the
 * mark is the page's own ink at rest, so twelve manufacturers do not turn the
 * section into a paint chart, and it takes its own colour when a pointer
 * arrives. Colour becomes the answer to a gesture rather than the default,
 * which is the only way a wall of twelve logos stays quiet.
 *
 * The files are ours, downloaded once by `scripts/fetch-brand-marks.mjs` and
 * served from our own origin: twelve CDN requests on the critical path is not a
 * trade this audience can afford.
 */
export function BrandRail({ brands }: { brands: readonly BrandTile[] }) {
  return (
    // THREE ACROSS ON A PHONE, NOT TWO, AND THE MEASUREMENT SETTLED IT. A mark
    // is 32 pixels tall inside a cell 137 wide, so two columns spent 800
    // pixels of a 360 screen on twelve logos and a great deal of white: six
    // rows the reader scrolls through to reach the showroom. Three columns of
    // 91 hold the same mark at the same height in four rows, 504 pixels, and
    // the longest name here, HIKVISION at 12px, measures 70. The horizontal gap
    // drops to 16 to buy that width back; from sm the wall is the desktop's,
    // three then six columns on 32 and 48.
    <div className="grid grid-cols-3 gap-x-4 gap-y-10 sm:gap-x-8 sm:gap-y-12 lg:grid-cols-6">
      {brands.map((brand, index) => (
        <Link
          key={brand.slug}
          href={`/marque/${brand.slug}`}
          style={
            {
              '--enter-index': index,
              '--mark-hover': brand.hover,
              '--mark-src': `url(/brands/${brand.file}.svg)`,
            } as React.CSSProperties
          }
          className="group enter e-item flex flex-col items-center gap-3.5"
        >
          <span aria-hidden className="brand-mark" />
          <span className="flex flex-col items-center gap-1 text-center">
            <span className="text-micro font-semibold tracking-[0.02em] text-ink-2 transition-colors duration-[var(--t-fast)] group-hover:text-ink">
              {brand.name}
            </span>
            <span className="t-num text-micro text-ink-3">
              {formatCount(brand.productCount, 'réf.', 'réf.')}
            </span>
          </span>
        </Link>
      ))}
    </div>
  )
}
