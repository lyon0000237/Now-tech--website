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
          <ul className="flex flex-wrap gap-2.5">
            {listing.children.map((child) => (
              <li key={child.slug}>
                <Link
                  href={`/categorie/${child.slug}`}
                  className="press inline-flex min-h-11 items-center gap-2.5 rounded-pill border border-rule px-5 py-2 text-small text-ink-2 transition-colors duration-[var(--t-fast)] hover:border-ink hover:text-ink md:min-h-0"
                >
                  {child.name}
                  <span className="t-num text-micro text-ink-3">{formatAmount(child.count)}</span>
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
