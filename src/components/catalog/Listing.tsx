import Link from 'next/link'

import { Pager } from './Pager'
import { SortBar } from './SortBar'
import { ProductGrid } from '@/components/product/ProductGrid'
import type { Listing as ListingData, SortKey } from '@/lib/catalog'
import { formatAmount } from '@/lib/format'

/**
 * The body of every listing: a department, a family, or the whole catalogue.
 *
 * ONE COMPONENT FOR ALL THREE, because from the reader's side they are the same
 * page. A title, a count, the families underneath, a way to order, a grid, and
 * pages. What differs is only which set of products the title stands for, and
 * that is resolved in the query before anything here runs.
 *
 * THE FAMILIES COME BEFORE THE PRODUCTS. On a department holding 845 references
 * across 22 families, the grid is not the answer to the reader's question, it is
 * what they have to get past. The row of families is the answer, and putting it
 * above the grid is worth the vertical space it costs: it is the difference
 * between narrowing in one click and paging through thirty-five screens.
 *
 * They carry their counts. A family with 3 products behind it and one with 212
 * are the same shape without them, and a reader who clicks the first has been
 * sent to a dead end by a control that looked identical to a live one.
 *
 * A ROW OF PILLS IS NOT A ROW ON A PHONE, IT IS A TOWER, SO UNDER MD IT IS A
 * SHELF THAT SCROLLS SIDEWAYS. Measured on /rayon/reseaux-switchs-routeurs at
 * 360: the 18 families landed on 18 separate lines — names like "Routeurs/AP
 * D-LINK" and "Switchs administrables" are 200 to 290 pixels wide once the
 * pill's 40 pixels of horizontal padding and the count are added, and two of
 * them never fit across 306 — for 975 pixels of chips standing between the
 * reader and the first product. Setting them as a full-bleed index of 44-pixel
 * rows brought that to 811 measured at 390, which is better reading and still
 * an entire screen of names: on that page the first photograph was at y=1440,
 * and 811 of those pixels were this nav.
 *
 * A LIST THAT IS ONLY EVER SAMPLED DOES NOT NEED ITS OWN SCREEN. Nobody reads
 * 18 family names top to bottom; they look for one, and if it is not in view
 * they look further. Down the page that costs the reader the product grid.
 * Across the page it costs nothing, because the grid stays exactly where it is.
 * So below `md` the same links are laid on one horizontal rail: 68 pixels
 * instead of 811 on the department, 68 instead of 271 on the family. It is a
 * shelf and it behaves like one — `snap-x snap-mandatory` on the rail with
 * `snap-start` on each chip so a flick lands on a name rather than between two,
 * `overscroll-x-contain` so reaching the end does not pull the page or trigger
 * the browser's back gesture, and the rail bled out to both screen edges by the
 * gutter so the third chip is visibly cut off at 390 and says there is more.
 * Vertical scrolling is untouched: the rail overflows on one axis only, so a
 * thumb moving down the page moves the page.
 *
 * THE NAME IS ON ITS OWN LINE ABOVE THE COUNT, WHICH IS WHY A CHIP IS 56 TALL
 * AND NOT 44. Side by side, as the desktop pill sets them, a chip carrying
 * "Câblage/Testeurs/ Accessoires Réseaux" is 290 pixels wide and one and a half
 * of them fill a 390 screen; stacked, the same names sit between 128 and 240,
 * so two and a bit are in view and the rail can be read by sampling instead of
 * by scrolling. The 12 pixels of vertical padding on the rail are not decoration
 * either: the document's focus ring is drawn 3 pixels outside the element and is
 * 2 thick, and a scroll container clips on both axes, so without them a keyboard
 * pass along the shelf would have its ring sliced off top and bottom.
 *
 * Same markup, same links, same counts, and nothing is dropped or shortened:
 * `md:` puts the pills back, measured unchanged at 1440 (first pill 291.7 x
 * 37.5 at x 108, nav 1224 x 180, 4 rows).
 *
 * WHAT THE SHELF AND THE BAR UNDER IT BOUGHT, MEASURED AT 390. The first
 * product photograph moved from y=1440 to y=568 on /rayon/reseaux-switchs-
 * routeurs, from y=900 to y=568 on /categorie/ordinateurs-portables-laptop, and
 * from y=1723 to y=1124 on /marque/hp. The first two now open on two whole
 * product cards; the third does not, and the reason is not on this page —
 * /marque still spends about 600 pixels on its provenance band and its section
 * head before the listing starts, and both of those are the route's own.
 */
export function Listing({
  listing,
  basePath,
  sort,
}: {
  listing: ListingData
  /** The route without any query, used to build the sort and page links. */
  basePath: string
  sort: SortKey
}) {
  return (
    // `data-results` is the anchor ScrollOnQuery carries the reader back to when
    // a filter, a sort or a page number changes the set under them. It sits on
    // the whole listing rather than on the grid so the count and the sort row,
    // which are what actually answer the reader's tap, arrive on screen first.
    <div data-results>
      {listing.children.length > 0 ? (
        <nav aria-label="Familles de ce rayon" className="enter mb-6 md:mb-stack">
          {/* The negative inline margin is written as a calc and not as
              `-mx-[var(--gutter)]`, which compiles to nothing. It cancels the
              shell's gutter so the rail runs edge to edge, and the matching
              `px` puts the first chip back on the shell's own left edge. The
              scroll padding repeats it, otherwise a snapped chip parks under
              the screen edge instead of under the text above it. */}
          <ul className="no-scrollbar mx-[calc(var(--gutter)*-1)] flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain px-[var(--gutter)] py-1.5 scroll-pl-[var(--gutter)] md:mx-0 md:flex-wrap md:gap-2.5 md:snap-none md:overflow-visible md:px-0 md:py-0">
            {listing.children.map((child) => (
              <li key={child.slug} className="snap-start shrink-0 md:shrink md:snap-align-none">
                <Link
                  href={`/categorie/${child.slug}`}
                  className="press flex min-h-14 w-max min-w-32 max-w-60 flex-col justify-center rounded-control border border-rule px-4 py-2 text-small text-ink-2 transition-colors duration-[var(--t-fast)] hover:border-ink hover:text-ink md:inline-flex md:min-h-0 md:w-auto md:max-w-none md:min-w-0 md:flex-row md:items-center md:gap-2.5 md:rounded-pill md:px-5 md:py-2 md:hover:border-ink"
                >
                  <span className="w-full truncate md:w-auto md:flex-none md:overflow-visible">
                    {child.name}
                  </span>
                  <span className="t-num shrink-0 text-micro text-ink-3">
                    {formatAmount(child.count)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <SortBar basePath={basePath} sort={sort} total={listing.total} page={listing.page} />

      <ProductGrid products={listing.products} columns={4} priorityCount={4} />

      <Pager
        basePath={basePath}
        query={sort === 'recent' ? {} : { tri: sort }}
        page={listing.page}
        pages={listing.pages}
      />
    </div>
  )
}
