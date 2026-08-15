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
 * A ROW OF PILLS IS NOT A ROW ON A PHONE, IT IS A TOWER, SO UNDER MD IT IS SET
 * AS AN INDEX INSTEAD. Measured on /rayon/reseaux-switchs-routeurs at 360: the
 * 18 families landed on 18 separate lines — names like "Routeurs/AP D-LINK" and
 * "Switchs administrables" are 200 to 290 pixels wide once the pill's 40 pixels
 * of horizontal padding and the count are added, and two of them never fit
 * across 306 — for 975 pixels of chips, a screen and a quarter, standing
 * between the reader and the first product. At 1440 the same 18 take 4 rows and
 * 180 pixels, which is what the shape was drawn for.
 *
 * The phone gets the same list set the way this site sets every other long list
 * of names: full-bleed rows, a rule between them, name left, count right, 44
 * pixels each. 810 pixels instead of 975, and far more than the 165 saved, a
 * column of left-aligned names is read down in one movement while 18 centred
 * capsules of different widths have to be read one at a time. Same markup, same
 * links, same counts: `md:` puts the pills back, measured unchanged at 1440
 * (first pill 291.7 x 37.5 at x 108, nav 1224 x 180, 4 rows).
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
    <>
      {listing.children.length > 0 ? (
        <nav aria-label="Familles de ce rayon" className="enter mb-stack">
          <ul className="flex flex-col border-t border-rule md:flex-row md:flex-wrap md:gap-2.5 md:border-0">
            {listing.children.map((child) => (
              <li key={child.slug} className="border-b border-rule md:border-0">
                <Link
                  href={`/categorie/${child.slug}`}
                  className="press flex min-h-11 w-full items-center gap-3 py-2 text-small text-ink-2 transition-colors duration-[var(--t-fast)] hover:text-ink md:inline-flex md:w-auto md:min-h-0 md:gap-2.5 md:rounded-pill md:border md:border-rule md:px-5 md:py-2 md:hover:border-ink"
                >
                  <span className="min-w-0 flex-1 truncate md:flex-none md:overflow-visible">
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
    </>
  )
}
