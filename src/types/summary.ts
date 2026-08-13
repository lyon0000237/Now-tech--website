import type { UniverseId } from './catalog'

/**
 * The projection of a product that crosses the server/client boundary.
 *
 * A full `Product` carries every category id, every gallery image and the
 * original SEO name. A grid of 300 of those is roughly 400 KB of RSC payload
 * for data no card renders. `ProductSummary` is what a card actually needs.
 *
 * Anything that renders a product in a list takes this type. Only the product
 * page takes the full `Product`.
 */
export interface ProductSummary {
  readonly id: number
  readonly slug: string
  readonly name: string
  readonly price: number
  readonly listPrice: number | null
  readonly discountPct: number | null
  readonly inStock: boolean
  readonly brand: string | null
  /** Supplier photograph, or `null` for the 41 products never shot. */
  readonly image: string | null
  /** At most three parsed technical facts, e.g. `["16 Go RAM", "512 Go SSD"]`. */
  readonly specs: readonly string[]
  /** Leaf category, denormalised so cards show provenance without a lookup. */
  readonly categoryName: string
  readonly categorySlug: string
}

/** A category reduced to what navigation and tiles render. */
export interface CategorySummary {
  readonly id: number
  readonly name: string
  readonly slug: string
  readonly totalCount: number
  readonly universeId: UniverseId
  /** Direct children, for drill-down menus. Absent for a leaf. */
  readonly children?: readonly CategorySummary[]
}
