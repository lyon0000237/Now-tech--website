import 'server-only'

import catalogData from '@/data/generated/catalog.json'
import type {
  Brand,
  Catalog,
  Category,
  Product,
  Universe,
  UniverseId,
} from '@/types/catalog'
import { DEPARTMENT_HERO_PRODUCT } from '@/constants/universes'
import type { CategorySummary, ProductSummary } from '@/types/summary'
import { resolveImage } from './images'

/**
 * The catalog data layer.
 *
 * `server-only` is load-bearing: the dataset is 3.3 MB and must never be pulled
 * into a client bundle by an accidental import. Client components receive
 * {@link ProductSummary} projections instead, never these objects.
 *
 * Every index below is built once when the module is first evaluated, so page
 * rendering is lookups rather than scans. Nothing here reads the filesystem or
 * parses CSV at request time — `scripts/build-catalog.ts` already did that.
 */

const catalog = catalogData as unknown as Catalog

const productsById = new Map<number, Product>(catalog.products.map((p) => [p.id, p]))
const productsBySlug = new Map<string, Product>(catalog.products.map((p) => [p.slug, p]))
const categoriesById = new Map<number, Category>(catalog.categories.map((c) => [c.id, c]))
const categoriesBySlug = new Map<string, Category>(catalog.categories.map((c) => [c.slug, c]))
const universesBySlug = new Map<string, Universe>(catalog.universes.map((u) => [u.slug, u]))
const universesById = new Map<UniverseId, Universe>(catalog.universes.map((u) => [u.id, u]))
const brandsBySlug = new Map<string, Brand>(catalog.brands.map((b) => [b.slug, b]))

/**
 * Category id -> every product filed on that term or any descendant, newest
 * first. Built by walking each product's own category list plus its ancestors,
 * so a root page can list its whole subtree without a second pass.
 */
const productsByCategory = ((): Map<number, Product[]> => {
  const index = new Map<number, Set<number>>()
  for (const product of catalog.products) {
    for (const categoryId of product.categoryIds) {
      const category = categoriesById.get(categoryId)
      if (!category) continue
      for (const id of [categoryId, ...category.ancestorIds]) {
        let bucket = index.get(id)
        if (!bucket) index.set(id, (bucket = new Set()))
        bucket.add(product.id)
      }
    }
  }
  const resolved = new Map<number, Product[]>()
  for (const [categoryId, ids] of index) {
    resolved.set(
      categoryId,
      [...ids].map((id) => productsById.get(id)!).sort(byRecency),
    )
  }
  return resolved
})()

/**
 * Recency order.
 *
 * The export carries no `created_at`. WooCommerce post ids are monotonic with
 * creation, and they agree with the `/uploads/YYYY/MM/` path on the product's
 * own photograph 98.4% of the time, so the id is the sound signal and the
 * upload month is the human-readable label for it.
 */
function byRecency(a: Product, b: Product): number {
  return b.id - a.id
}

/* -------------------------------------------------------------------------- */
/* Universes                                                                  */
/* -------------------------------------------------------------------------- */

export function getUniverses(): readonly Universe[] {
  return catalog.universes
}

export function getUniverseBySlug(slug: string): Universe | null {
  return universesBySlug.get(slug) ?? null
}

export function getUniverse(id: UniverseId): Universe | null {
  return universesById.get(id) ?? null
}

/**
 * The categories a universe puts at its own top level.
 *
 * A department binds source terms at whatever depth the merchant thinks in, so
 * this is not "the roots" — `Télécom` binds a level-1 term, `Réseaux` binds a
 * root. Where a bound term is itself a big root, its children are the more
 * useful entry points, so those are returned instead of the root.
 */
export function getUniverseEntries(universe: Universe): Category[] {
  const out: Category[] = []
  for (const id of universe.categoryIds) {
    const category = categoriesById.get(id)
    if (!category || category.hidden) continue
    const children = getChildren(category).filter((c) => c.universeId === universe.id)
    // A bound root with real children hands over to them; a bound leaf stands
    // for itself. The threshold keeps thin roots from disappearing entirely.
    if (children.length >= 3) out.push(...children)
    else out.push(category)
  }
  return out.sort((a, b) => b.totalCount - a.totalCount)
}

/* -------------------------------------------------------------------------- */
/* Categories                                                                 */
/* -------------------------------------------------------------------------- */

export function getCategoryBySlug(slug: string): Category | null {
  return categoriesBySlug.get(slug) ?? null
}

export function getCategoryById(id: number): Category | null {
  return categoriesById.get(id) ?? null
}

/** Every navigable category. Excludes the hidden `Non classé` bucket. */
export function getCategories(): Category[] {
  return catalog.categories.filter((c) => !c.hidden)
}

/** Root -> … -> self, for breadcrumbs. */
export function getCategoryPath(category: Category): Category[] {
  const path = category.ancestorIds
    .map((id) => categoriesById.get(id))
    .filter((c): c is Category => Boolean(c))
  return [...path, category]
}

export function getChildren(category: Category): Category[] {
  return category.childIds
    .map((id) => categoriesById.get(id))
    .filter((c): c is Category => Boolean(c) && !c!.hidden)
}

/**
 * Every descendant of a category, breadth first.
 *
 * Used by the subcategory filter panel, which offers the whole subtree rather
 * than one level: `Caméras de Surveillance` has 16 children and one of them has
 * 6 grandchildren, and a customer looking for an NVR should not have to know
 * which level it lives on.
 */
export function getDescendants(category: Category): Category[] {
  const out: Category[] = []
  const queue = [...getChildren(category)]
  while (queue.length) {
    const next = queue.shift()!
    out.push(next)
    queue.push(...getChildren(next))
  }
  return out
}

export function toCategorySummary(category: Category, depth = 0): CategorySummary {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    totalCount: category.totalCount,
    universeId: category.universeId,
    ...(depth > 0
      ? { children: getChildren(category).map((child) => toCategorySummary(child, depth - 1)) }
      : {}),
  }
}

/* -------------------------------------------------------------------------- */
/* Products                                                                   */
/* -------------------------------------------------------------------------- */

export function getProductBySlug(slug: string): Product | null {
  return productsBySlug.get(slug) ?? null
}

export function getAllProducts(): readonly Product[] {
  return catalog.products
}

/** Products on a term or any descendant, newest first. */
export function getProductsInCategory(categoryId: number): Product[] {
  return productsByCategory.get(categoryId) ?? []
}

/** Products filed directly on a term, ignoring descendants. */
export function getDirectProducts(categoryId: number): Product[] {
  return (productsByCategory.get(categoryId) ?? []).filter((p) =>
    p.categoryIds.includes(categoryId),
  )
}

/** The whole catalog, newest first. */
export function getRecentProducts(limit: number): Product[] {
  return [...catalog.products].sort(byRecency).slice(0, limit)
}

export function getProductsInUniverse(universeId: UniverseId): Product[] {
  const universe = universesById.get(universeId)
  if (!universe) return []
  // Filed by primary category, so a product lands in exactly one department —
  // the same rule the build step counts by.
  return catalog.products
    .filter((p) => categoriesById.get(p.primaryCategoryId)?.universeId === universeId)
    .sort(byRecency)
}

/**
 * Products related to another.
 *
 * Ranked by how much context they share, because "same category" alone puts a
 * 12,000 FCFA patch cable next to a 4,500,000 FCFA server. Same leaf category
 * and same brand scores highest, then same category, then same brand within the
 * universe. Price proximity breaks ties, which is what stops the rail reading
 * as a random draw.
 */
export function getRelatedProducts(product: Product, limit = 8): Product[] {
  const category = categoriesById.get(product.primaryCategoryId)
  if (!category) return []

  const pool = new Map<number, Product>()
  for (const candidate of getProductsInCategory(category.id)) pool.set(candidate.id, candidate)
  if (pool.size < limit + 1 && category.parentId !== null) {
    for (const candidate of getProductsInCategory(category.parentId)) {
      pool.set(candidate.id, candidate)
    }
  }
  pool.delete(product.id)

  const score = (candidate: Product): number => {
    let value = 0
    if (candidate.primaryCategoryId === product.primaryCategoryId) value += 4
    if (candidate.brand && candidate.brand === product.brand) value += 3
    if (candidate.inStock) value += 1
    const ratio =
      product.price > 0 && candidate.price > 0
        ? Math.min(product.price, candidate.price) / Math.max(product.price, candidate.price)
        : 0
    return value + ratio * 2
  }

  return [...pool.values()].sort((a, b) => score(b) - score(a) || byRecency(a, b)).slice(0, limit)
}

/* -------------------------------------------------------------------------- */
/* Recency by subcategory — the panoramic homepage                            */
/* -------------------------------------------------------------------------- */

export interface RecentSubcategoryBlock {
  readonly category: Category
  /** Root ancestor, used as the section's context line. */
  readonly root: Category
  readonly universe: Universe
  readonly products: Product[]
}

/**
 * The homepage's "newest per subcategory" blocks, chosen from real data.
 *
 * Nothing here is hard-coded. Candidate subcategories are ranked by how recent
 * their newest product is, then filtered so no universe can take more than
 * `maxPerUniverse` slots — without that cap the whole section fills with
 * networking, because that is simply where the newest stock lands.
 */
export function getRecentBySubcategory({
  blocks = 6,
  productsPerBlock = 4,
  minProducts = 6,
  maxPerUniverse = 1,
}: {
  blocks?: number
  productsPerBlock?: number
  minProducts?: number
  maxPerUniverse?: number
} = {}): RecentSubcategoryBlock[] {
  const candidates = catalog.categories
    .filter((category) => !category.hidden && category.level >= 1)
    .map((category) => {
      const products = getProductsInCategory(category.id)
      return { category, products, newest: products[0]?.id ?? 0 }
    })
    .filter((entry) => entry.products.length >= minProducts)
    .sort((a, b) => b.newest - a.newest)

  const perUniverse = new Map<UniverseId, number>()
  const chosen: RecentSubcategoryBlock[] = []

  for (const entry of candidates) {
    if (chosen.length >= blocks) break
    const used = perUniverse.get(entry.category.universeId) ?? 0
    if (used >= maxPerUniverse) continue

    const rootId = entry.category.ancestorIds[0] ?? entry.category.id
    const root = categoriesById.get(rootId)
    const universe = universesById.get(entry.category.universeId)
    if (!root || !universe) continue

    perUniverse.set(entry.category.universeId, used + 1)
    chosen.push({
      category: entry.category,
      root,
      universe,
      products: entry.products.slice(0, productsPerBlock),
    })
  }

  return chosen
}

/* -------------------------------------------------------------------------- */
/* Brands                                                                     */
/* -------------------------------------------------------------------------- */

export function getBrands(minProducts = 1): Brand[] {
  return catalog.brands.filter((b) => b.productCount >= minProducts)
}

export function getBrandBySlug(slug: string): Brand | null {
  return brandsBySlug.get(slug) ?? null
}

/* -------------------------------------------------------------------------- */
/* Projections                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Narrows products to the shape a card renders.
 *
 * This is the only place a `Product` becomes client-safe: it resolves the
 * photograph, denormalises the category label, and drops everything a card
 * never reads.
 */
export function summarise(products: readonly Product[]): ProductSummary[] {
  return products.map((product) => {
    const category = categoriesById.get(product.primaryCategoryId)
    const image = resolveImage(product)
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      listPrice: product.listPrice,
      discountPct: product.discountPct,
      inStock: product.inStock,
      brand: product.brand,
      image: image?.src ?? null,
      specs: product.specs,
      categoryName: category?.name ?? 'Catalogue',
      categorySlug: category?.slug ?? '',
    }
  })
}

export function getMeta() {
  return catalog.meta
}

/* -------------------------------------------------------------------------- */
/* Homepage services                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The twelve department tiles, each with a hero product.
 *
 * The hero of each tile is pinned in `DEPARTMENT_HERO_PRODUCT`; see the note
 * there for why this one thing is chosen by hand. If a pinned product ever
 * leaves the catalogue the tile falls back to the department's first
 * photographed product rather than breaking.
 */
export function getDepartmentTiles(): {
  universe: Universe
  image: string | null
  imageAlt: string
}[] {
  return catalog.universes.map((universe) => {
    const hero =
      productsById.get(DEPARTMENT_HERO_PRODUCT[universe.id]) ??
      getProductsInUniverse(universe.id).find((product) => product.images.length > 0)
    const image = hero ? resolveImage(hero) : null
    return { universe, image: image?.src ?? null, imageAlt: hero?.name ?? '' }
  })
}
