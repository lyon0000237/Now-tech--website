import Link from 'next/link'

import { Price, StockLabel } from './Price'
import { ProductMedia } from './ProductMedia'
import type { ProductSummary } from '@/types/summary'

/**
 * The product card.
 *
 * Deliberately not a bordered, shadowed tile. The well, the gutter and the
 * type do the separating; the border only appears on hover, as feedback. That
 * is what keeps a grid of these reading as a set of objects rather than a sheet
 * of boxes.
 *
 * The spec atoms under the name are the reason this catalog is shoppable at
 * all. Fifty black rack-mount boxes are indistinguishable as photographs, and
 * `24 ports`, `4 MP` or `850 VA` is what turns the grid back into a comparison.
 * They are parsed from the product name at ingest, so they cost nothing per
 * card and exist for 1,499 products.
 *
 * There is no discount badge. 4,107 of 4,256 products carry an "on sale" flag,
 * so the badge would appear on 96% of every grid and mean nothing on any of it.
 */
const VARIANTS = {
  /** Standard grid cell. */
  default: 'p-[14px_16px_16px]',
  /** Denser cell for rails and related-product strips. */
  compact: 'p-[12px_12px_14px]',
} as const

export function ProductCard({
  product,
  variant = 'default',
  index,
  priority = false,
  sizes = '(max-width: 820px) 50vw, (max-width: 1100px) 33vw, 20vw',
}: {
  product: ProductSummary
  variant?: keyof typeof VARIANTS
  /** Position in the grid, used only to stagger the reveal. */
  index?: number
  priority?: boolean
  sizes?: string
}) {
  return (
    <Link
      href={`/produit/${product.slug}`}
      className={`group reveal flex flex-col rounded-well border border-transparent bg-surface transition-colors duration-[var(--t-base)] ease-brand hover:border-rule-2 ${VARIANTS[variant]}`}
      style={index === undefined ? undefined : ({ '--reveal-index': index } as React.CSSProperties)}
    >
      <ProductMedia
        src={product.image}
        alt={product.name}
        sizes={sizes}
        priority={priority}
        className="mb-3"
      />

      <span className="t-label mb-1.5 text-ink-3">{product.brand ?? product.categoryName}</span>

      <h3 className="clamp-2 mb-2 h-[2.7em] text-sm leading-[1.35]">{product.name}</h3>

      {product.specs.length > 0 ? (
        <div className="mb-3 flex min-h-[19px] flex-wrap gap-1.5">
          {product.specs.slice(0, 2).map((spec) => (
            <span
              key={spec}
              className="t-num rounded-[5px] bg-space px-[7px] py-0.5 text-[0.6875rem] text-ink-2"
            >
              {spec}
            </span>
          ))}
        </div>
      ) : (
        <div className="mb-3 min-h-[19px]" />
      )}

      <div className="mt-auto flex items-baseline justify-between gap-2">
        <Price
          value={product.price}
          listPrice={product.listPrice}
          discountPct={product.discountPct}
        />
        <StockLabel inStock={product.inStock} />
      </div>
    </Link>
  )
}
