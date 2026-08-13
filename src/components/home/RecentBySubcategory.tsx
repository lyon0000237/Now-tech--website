import Link from 'next/link'

import { ProductCard } from '@/components/product/ProductCard'
import { formatCount, formatMonth } from '@/lib/format'
import type { ProductSummary } from '@/types/summary'

export interface RecentBlock {
  readonly categoryName: string
  readonly categorySlug: string
  readonly parentName: string
  readonly departmentName: string
  readonly totalCount: number
  readonly newestAt: string | null
  readonly products: readonly ProductSummary[]
}

/**
 * The newest arrivals, one family at a time.
 *
 * The export has no creation date, so recency is taken from the WooCommerce id,
 * which agrees with the upload month stamped on the product's own photograph
 * 98.4% of the time. Nothing here is hand-picked: the families shown are the
 * ones whose newest product is genuinely the newest, capped at one family per
 * department so the whole section does not fill with networking simply because
 * that is where the new stock lands.
 *
 * Each block is its own heading and its own escape link, so a customer who
 * recognises the family can leave for the full listing without scrolling on.
 */
export function RecentBySubcategory({ blocks }: { blocks: readonly RecentBlock[] }) {
  return (
    <div className="space-y-12">
      {blocks.map((block) => (
        <section key={block.categorySlug}>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-rule pb-3">
            <div>
              <p className="t-label mb-1 text-ink-3">{block.departmentName}</p>
              <h3 className="text-[1.25rem] font-bold leading-tight tracking-[-0.02em]">
                {block.categoryName}
              </h3>
            </div>
            <div className="flex items-baseline gap-5 text-[0.84375rem]">
              {block.newestAt ? (
                <span className="text-ink-3">Dernier arrivage {formatMonth(block.newestAt)}</span>
              ) : null}
              <Link
                href={`/categorie/${block.categorySlug}`}
                className="font-semibold whitespace-nowrap text-accent hover:text-accent-ink"
              >
                {formatCount(block.totalCount, 'référence')}
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            {block.products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                sizes="(max-width: 820px) 50vw, 25vw"
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
