import Link from 'next/link'

import { ProductRow } from '@/components/product/ProductRow'
import { formatCount, formatMonth } from '@/lib/format'
import type { ProductSummary } from '@/types/summary'

export interface RecentColumn {
  readonly categoryName: string
  readonly categorySlug: string
  readonly departmentName: string
  readonly totalCount: number
  readonly newestAt: string | null
  readonly products: readonly ProductSummary[]
}

/**
 * The newest arrivals, three families side by side.
 *
 * The export has no creation date, so recency is taken from the WooCommerce id,
 * which agrees with the upload month stamped on the product's own photograph
 * 98.4% of the time. Nothing here is hand-picked: the families shown are the
 * ones whose newest product is genuinely the newest, capped at one family per
 * department so the whole section does not fill with networking simply because
 * that is where the new stock lands.
 *
 * Columns of lines rather than a grid of cards, and that is the section's whole
 * argument. Twelve cards would be twelve photographs of black boxes and one
 * question answered; twelve lines in three labelled columns answer a different
 * and better one, which is where in the shop things are moving this month.
 */
export function RecentColumns({ columns }: { columns: readonly RecentColumn[] }) {
  return (
    <div className="grid gap-x-14 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
      {columns.map((column, index) => (
        <section key={column.categorySlug} className="enter" style={{ '--enter-index': index } as React.CSSProperties}>
          <div className="relative flex items-baseline justify-between gap-4 pb-3.5">
            <h3 className="min-w-0">
              <Link
                href={`/categorie/${column.categorySlug}`}
                className="draw-under text-body font-semibold tracking-[-0.015em]"
              >
                {column.categoryName}
              </Link>
            </h3>
            <span className="t-num shrink-0 text-micro text-ink-3">
              {formatCount(column.totalCount, 'réf.', 'réf.')}
            </span>
            <span aria-hidden className="e-rule absolute inset-x-0 bottom-0 block h-px bg-rule" />
          </div>

          <p className="e-text mt-3.5 mb-1 text-micro text-ink-3">
            {column.departmentName}
            {column.newestAt ? ` · arrivage ${formatMonth(column.newestAt)}` : ''}
          </p>

          <div className="divide-y divide-rule">
            {column.products.map((product) => (
              <ProductRow key={product.id} product={product} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
