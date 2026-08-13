import { ProductCard } from './ProductCard'
import type { ProductSummary } from '@/types/summary'

/**
 * A grid of product cards.
 *
 * Column counts are a prop rather than a variant because the same grid serves
 * the homepage, a category page and a related-products strip, and those differ
 * only in how much room they have.
 */
const COLUMNS = {
  5: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-5',
  4: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
  3: 'grid-cols-2 md:grid-cols-3',
} as const

export function ProductGrid({
  products,
  columns = 5,
  priorityCount = 0,
}: {
  products: readonly ProductSummary[]
  columns?: keyof typeof COLUMNS
  /** How many images to load eagerly. Only ever the ones above the fold. */
  priorityCount?: number
}) {
  if (products.length === 0) {
    return (
      <p className="rounded-well border border-rule bg-space px-5 py-8 text-center text-[0.9375rem] text-ink-2">
        Aucun produit ne correspond pour l’instant. Élargissez les filtres ou contactez un
        conseiller, le stock atelier n’est pas toujours en ligne.
      </p>
    )
  }

  return (
    <div className={`grid gap-3.5 ${COLUMNS[columns]}`}>
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          index={index}
          priority={index < priorityCount}
        />
      ))}
    </div>
  )
}
