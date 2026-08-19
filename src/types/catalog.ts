/**
 * Canonical catalog domain model.
 *
 * These types describe the *normalised* shape produced by `scripts/build-catalog.ts`
 * from the WooCommerce export in `data/source/`. Nothing in the UI is allowed to
 * reason about raw CSV columns — the shape below is the only contract.
 */

/** A single product photograph, always an absolute URL on the WooCommerce origin. */
export interface ProductImage {
  readonly url: string
  readonly alt: string
}

/**
 * A product.
 *
 * Every field is derived from real export data. Fields whose source data is
 * missing are `null` rather than invented — the UI must handle absence.
 */
export interface Product {
  /** WooCommerce post id. Stable, and monotonic with creation date (98.4% agreement). */
  readonly id: number
  /** URL segment, derived from {@link name}. Unique across the catalog. */
  readonly slug: string
  /** Display name with SEO boilerplate and HTML entities removed. */
  readonly name: string
  /** Original export name. Kept so search still matches the SEO phrasing. */
  readonly rawName: string
  /** Current selling price, whole XAF. */
  readonly price: number
  /** Pre-discount price, or `null` when the product is not discounted. */
  readonly listPrice: number | null
  /** Whole-percent discount, or `null`. */
  readonly discountPct: number | null
  readonly inStock: boolean
  /** Brand inferred from the category path or the product name. `null` when unknown. */
  readonly brand: string | null
  /** Leaf-most category this product is filed under. */
  readonly primaryCategoryId: number
  /** Every category the product belongs to, primary first. */
  readonly categoryIds: readonly number[]
  readonly images: readonly ProductImage[]
  /** `YYYY-MM` the photography was uploaded — the only date signal in the export. */
  readonly addedAt: string | null
  /** Canonical URL on the current WooCommerce site. */
  readonly sourceUrl: string
  /** Short technical facts parsed out of the product name, e.g. `["16 Go", "512 Go SSD"]`. */
  readonly specs: readonly string[]
}

/**
 * A catalog category. Mirrors the WooCommerce term hierarchy exactly — ids,
 * parents and depth are preserved so the business logic stays intact.
 */
export interface Category {
  readonly id: number
  /** Display name, cleaned of sort-order dots and HTML entities. */
  readonly name: string
  readonly slug: string
  readonly parentId: number | null
  /** 0 for a root term, up to 3. */
  readonly level: number
  /** Ancestor ids, root first, excluding self. */
  readonly ancestorIds: readonly number[]
  readonly childIds: readonly number[]
  /** Products filed directly on this term. */
  readonly directCount: number
  /** Products on this term or any descendant, de-duplicated. */
  readonly totalCount: number
  /** The curated universe this category rolls up into. */
  readonly universeId: UniverseId
  /**
   * Kept out of navigation and out of universe roll-ups.
   *
   * Only the synthetic `Non classé` bucket sets this. WooCommerce leaves 20
   * real, recent products — ThinkPads, solar kits — with no term at all.
   * Dropping them would hide sellable stock; inventing a category for them
   * would be fabricating taxonomy. They stay reachable by search and by URL.
   */
  readonly hidden?: boolean
}

/**
 * The curated navigation layer placed over the WooCommerce tree.
 *
 * The export's root level cannot serve as navigation: 46 terms, 26 of them
 * childless, ranging from 845 products down to 1. These twelve departments are
 * the merchant's own grouping, read off the live site's "Toutes Catégories"
 * panel. See `src/constants/universes.ts` for the full rationale and bindings.
 */
export type UniverseId =
  | 'appliance'
  | 'smart'
  | 'computing'
  | 'network'
  | 'security'
  | 'printing'
  | 'power'
  | 'vision'
  | 'connectics'
  | 'storage'
  | 'telecom'
  | 'mobile'
  | 'office'
  | 'services'

export interface Universe {
  readonly id: UniverseId
  readonly slug: string
  /** French display name — the storefront is French-first for the Cameroonian market. */
  readonly name: string
  /** Short label for tight navigation rows. */
  readonly shortName: string
  /** One-line positioning, French. */
  readonly tagline: string
  /** Bound source category ids, any level, in editorial order. */
  readonly categoryIds: readonly number[]
  readonly totalCount: number
}

/** A brand inferred from category paths and product names. */
export interface Brand {
  readonly name: string
  readonly slug: string
  readonly productCount: number
  /** Universes this brand appears in, most products first. */
  readonly universeIds: readonly UniverseId[]
}

export interface CatalogMeta {
  readonly generatedAt: string
  readonly productCount: number
  readonly categoryCount: number
  readonly currency: 'XAF'
  /** Highest product id in the export — the anchor for recency ordering. */
  readonly newestProductId: number
}

/** Everything the storefront needs, assembled once at build time. */
export interface Catalog {
  readonly products: readonly Product[]
  readonly categories: readonly Category[]
  readonly universes: readonly Universe[]
  readonly brands: readonly Brand[]
  readonly meta: CatalogMeta
}
