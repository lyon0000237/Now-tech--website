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
  /**
   * A second angle, where the supplier shot one. 1,354 products have it, and on
   * a catalogue of near-identical black boxes a second view is information
   * rather than decoration, which is what earns it a hover.
   */
  readonly imageAlt: string | null
  /** At most three parsed technical facts, e.g. `["16 Go RAM", "512 Go SSD"]`. */
  readonly specs: readonly string[]
  /** Leaf category, denormalised so cards show provenance without a lookup. */
  readonly categoryName: string
}

/**
 * A department reduced to what the catalog map in the masthead renders.
 *
 * It used to serve the hero rail as well; that rail now takes `HeroPanel`,
 * since it needs the card behind each row and not just the row.
 */
export interface DepartmentNav {
  readonly id: UniverseId
  readonly name: string
  readonly shortName: string
  readonly slug: string
  readonly totalCount: number
  readonly families: readonly {
    readonly name: string
    readonly slug: string
    readonly count: number
  }[]
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
