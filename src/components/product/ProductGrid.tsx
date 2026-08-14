import { ProductCard } from './ProductCard'
import type { ProductSummary } from '@/types/summary'

/**
 * A grid of product cards, separated by space alone.
 *
 * The vertical gap is twice the horizontal one. Only the picture carries an
 * edge, so the cells themselves are still grouped by proximity alone, and with
 * equal gaps the eye groups in both directions at once and the grid reads as a
 * field of parts. Wide rows and tight columns say "these four belong together,
 * the next four are the next four".
 *
 * Column counts are a prop rather than a variant because the same grid serves
 * the homepage, a category page and a related-products strip, and those differ
 * only in how much room they have.
 *
 * The empty state is written for the one way this actually goes empty in
 * practice: a filter combination the stock does not cover. It says what to do
 * next rather than apologising, and it names the shop's own escape hatch,
 * because the counter genuinely holds stock the export does not.
 */
const COLUMNS = {
  5: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-5',
  4: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
  3: 'grid-cols-2 md:grid-cols-3',
  2: 'grid-cols-2',
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
      <p className="rounded-well bg-space px-6 py-12 text-center text-body text-ink-2">
        Aucun produit ne correspond pour l’instant. Élargissez les filtres, ou appelez le comptoir :
        le stock atelier n’est pas toujours en ligne.
      </p>
    )
  }

  return (
    <div className={`grid gap-x-6 gap-y-12 ${COLUMNS[columns]}`}>
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
