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
import { BRAND_MARK_BY_NAME } from '@/constants/brand-marks'
import {
  COUNTER_TOUR,
  DEPARTMENT_CARDS,
  PROMO_BANNERS,
  SELECTIONS,
} from '@/constants/home'
import type { SelectionId } from '@/constants/home'
import type { CategorySummary, DepartmentNav, ProductSummary } from '@/types/summary'
import { formatAmount } from './format'
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

export interface BrandTile {
  readonly name: string
  readonly slug: string
  readonly productCount: number
  /** File in `public/brands/`, without the extension. */
  readonly file: string
  /** The colour the mark takes when a pointer arrives. */
  readonly hover: string
}

/**
 * The brand wall: the manufacturers we hold a mark for, deepest first.
 *
 * Ranked by the catalog's own depth rather than by the order the marks were
 * downloaded in, so the wall says the same thing every other brand surface on
 * the site says. A mark with no products behind it is dropped: the wall is
 * navigation, and a door has to open onto something.
 */
export function getBrandTiles(limit = 12): BrandTile[] {
  return catalog.brands
    .flatMap((brand) => {
      const mark = BRAND_MARK_BY_NAME.get(brand.name)
      if (!mark || brand.productCount === 0) return []
      return [
        {
          name: brand.name,
          slug: brand.slug,
          productCount: brand.productCount,
          file: mark.file,
          hover: mark.hover,
        },
      ]
    })
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, limit)
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
      imageAlt: product.images[1]?.url ?? null,
      specs: product.specs,
      categoryName: category?.name ?? 'Catalogue',
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
 * The twelve departments with their largest families.
 *
 * Serves both navigation surfaces: the rail standing beside the hero and the
 * full catalog map behind the masthead trigger. They differ only in how many
 * families each department is allowed to show.
 *
 * Families are ranked by depth rather than listed alphabetically: the point of
 * the panel is to show where the stock actually is, and a family holding four
 * products is noise next to one holding four hundred.
 */
export function getMenuDepartments(familiesPerDepartment = 5): DepartmentNav[] {
  return catalog.universes.map((universe) => ({
    id: universe.id,
    name: universe.name,
    shortName: universe.shortName,
    slug: universe.slug,
    totalCount: universe.totalCount,
    families: catalog.categories
      .filter((category) => category.universeId === universe.id && category.level > 0)
      .sort((a, b) => b.totalCount - a.totalCount)
      .slice(0, familiesPerDepartment)
      .map((category) => ({
        name: category.name,
        slug: category.slug,
        count: category.totalCount,
      })),
  }))
}

/* -------------------------------------------------------------------------- */
/* Homepage composition                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Resolves a department's opening photograph.
 *
 * Pinned in `DEPARTMENT_HERO_PRODUCT`; see the note there for why these twelve
 * are chosen by hand. If a pinned product ever leaves the catalog the slot
 * falls back to the department's first photographed product rather than
 * rendering an empty frame.
 */
/**
 * A department's opening photograph, for a caller that renders it decoratively.
 *
 * No alt travels with it, and that is the point: everywhere this is used, the
 * department is already named in type beside the picture, so a second reading of
 * the product's own name would be noise in a screen reader rather than
 * information.
 */
export function getDepartmentPicture(universeId: UniverseId): string | null {
  return departmentPicture(universeId).src
}

function departmentPicture(universeId: UniverseId): { src: string | null; alt: string } {
  const hero =
    productsById.get(DEPARTMENT_HERO_PRODUCT[universeId]) ??
    getProductsInUniverse(universeId).find((product) => product.images.length > 0)
  const image = hero ? resolveImage(hero) : null
  return { src: image?.src ?? null, alt: hero?.name ?? '' }
}

export interface HeroPanel {
  readonly id: UniverseId
  readonly headline: readonly string[]
  readonly body: string
  readonly cta: string
  readonly href: string
  readonly shortName: string
  readonly image: string | null
  /** The department's five deepest families, as the card's own quick links. */
  readonly families: readonly { readonly name: string; readonly slug: string }[]
}

/**
 * A card for every department.
 *
 * There used to be three, and they rotated. They are now twelve, they tour on
 * their own, and the rail standing beside them is the way past the queue: a
 * visitor who wants to know what the shop sells does not wait for the deck to
 * come round to their trade, they point at it.
 *
 * The copy is written in `constants/home.ts`; everything measurable is resolved
 * here, including the reference count inside the sentence. A department that
 * has somehow gone empty is dropped rather than shown with a zero.
 */
export function getHeroPanels(): HeroPanel[] {
  return catalog.universes.flatMap((universe) => {
    const card = DEPARTMENT_CARDS[universe.id]
    if (!card || universe.totalCount === 0) return []
    return [
      {
        id: universe.id,
        headline: card.headline,
        body: card.body.replace('{n}', formatAmount(universe.totalCount)),
        cta: card.cta,
        href: `/rayon/${universe.slug}`,
        shortName: universe.shortName,
        image: departmentPicture(universe.id).src,
        families: catalog.categories
          .filter((category) => category.universeId === universe.id && category.level > 0)
          .sort((a, b) => b.totalCount - a.totalCount)
          .slice(0, 5)
          .map((category) => ({ name: category.name, slug: category.slug })),
      },
    ]
  })
}

export interface PromoPanel {
  readonly id: UniverseId
  readonly headline: string
  readonly body: string
  readonly href: string
  readonly image: string | null
}

/**
 * The banner band under the deck.
 *
 * Six, not two, because the band travels: it shows two at a time and walks
 * through three pages on its own. Two panels sitting still were a pair of
 * shortcuts; six that move are the shop saying it has more than two counters.
 */
export function getPromoPanels(): PromoPanel[] {
  return PROMO_BANNERS.flatMap((promo) => {
    const universe = universesById.get(promo.universeId)
    if (!universe) return []
    return [
      {
        id: universe.id,
        headline: promo.headline,
        body: promo.body.replace('{n}', formatAmount(universe.totalCount)),
        href: `/rayon/${universe.slug}`,
        image: departmentPicture(universe.id).src,
      },
    ]
  })
}

export interface Selection {
  readonly id: SelectionId
  readonly label: string
  readonly rule: string
  readonly products: readonly ProductSummary[]
}

/**
 * Takes the first `limit` products, letting no brand hold more than
 * `maxPerBrand` of them.
 *
 * Without the cap the recency list is seven Tenda boxes, because stock arrives
 * by supplier shipment and a shipment is one brand. That is a true ordering and
 * a useless shelf: it tells a customer what NowTech unpacked last Tuesday
 * rather than what the shop sells. The cap is applied after the sort, so
 * ordering stays honest and only the crowding is relieved. Unbranded products
 * are never capped against each other, since "no brand recovered" is not a
 * brand.
 */
function spreadByBrand<T extends Product>(
  products: readonly T[],
  limit: number,
  maxPerBrand = 3,
): T[] {
  const taken = new Map<string, number>()
  const out: T[] = []
  const overflow: T[] = []

  for (const product of products) {
    if (out.length >= limit) break
    const brand = product.brand
    if (!brand) {
      out.push(product)
      continue
    }
    const used = taken.get(brand) ?? 0
    if (used >= maxPerBrand) {
      overflow.push(product)
      continue
    }
    taken.set(brand, used + 1)
    out.push(product)
  }

  // A narrow filter can run out of distinct brands before it runs out of slots.
  // Better a repeated brand than a short row.
  for (const product of overflow) {
    if (out.length >= limit) break
    out.push(product)
  }
  return out
}

/**
 * The four tabbed lists.
 *
 * Each is a plain filter over the catalog, run once at build. Products with no
 * photograph are excluded from all four: a grid of ten where two are captioned
 * "Photo à venir" reads as a broken page rather than as an honest one, and 41
 * products out of 4 254 is a rounding error to leave for the category pages.
 */
export function getSelections(perSelection = 10): Selection[] {
  const shot = catalog.products.filter((product) => product.images.length > 0)
  const newestFirst = [...shot].sort(byRecency)

  const pools: Record<SelectionId, Product[]> = {
    nouveautes: newestFirst,
    affaires: newestFirst.filter((p) => (p.discountPct ?? 0) >= 40),
    'petits-prix': newestFirst.filter((p) => p.price > 0 && p.price < 50_000),
    pro: newestFirst.filter((p) => p.price >= 500_000),
  }

  return SELECTIONS.map((selection) => ({
    id: selection.id,
    label: selection.label,
    rule: selection.rule,
    products: summarise(spreadByBrand(pools[selection.id], perSelection)),
  }))
}

export interface CounterPick {
  readonly departmentName: string
  readonly product: ProductSummary
}

/**
 * One arrival from each of the six departments the hero and the banners never
 * reach.
 *
 * The rule is the section: the top of this page is necessarily spent on the
 * five departments holding three quarters of the stock, and without a deliberate
 * pass over the other six a customer would leave believing the shop sells
 * computers and cameras. In stock is required, since this is the one section
 * whose whole job is to say "we have this too".
 */
export function getCounterTour(): CounterPick[] {
  return COUNTER_TOUR.flatMap((universeId) => {
    const universe = universesById.get(universeId)
    if (!universe) return []
    const product = getProductsInUniverse(universeId).find(
      (candidate) => candidate.images.length > 0 && candidate.inStock,
    )
    if (!product) return []
    return [
      {
        departmentName: universe.shortName,
        product: summarise([product])[0],
      },
    ]
  })
}

/**
 * The shop's own service catalogue.
 *
 * Filed under a normal category term upstream, because WooCommerce has no other
 * place to put a labour rate. Sorted so the actual services lead: the term also
 * collects a few pieces of hardware that were never re-filed.
 */
export function getServices(): ProductSummary[] {
  const term = catalog.categories.find((category) => category.slug === 'nos-services')
  if (!term) return []
  const isService = (name: string) => /^(service|installation|maintenance|douane|energie)/i.test(name)
  return summarise(
    getProductsInCategory(term.id).sort((a, b) => {
      const rank = Number(isService(b.name)) - Number(isService(a.name))
      return rank !== 0 ? rank : a.price - b.price
    }),
  )
}

/* -------------------------------------------------------------------------- */
/* Listings                                                                   */
/* -------------------------------------------------------------------------- */

export type SortKey = 'recent' | 'prix-croissant' | 'prix-decroissant' | 'remise'

export const SORTS: readonly { readonly key: SortKey; readonly label: string }[] = [
  { key: 'recent', label: 'Arrivage' },
  { key: 'prix-croissant', label: 'Prix croissant' },
  { key: 'prix-decroissant', label: 'Prix décroissant' },
  { key: 'remise', label: 'Remise' },
]

export interface Listing {
  readonly title: string
  /** Root to self, for the breadcrumb. Empty on a whole-catalogue listing. */
  readonly path: readonly { readonly name: string; readonly href: string }[]
  readonly total: number
  readonly products: readonly ProductSummary[]
  /** Families under this one, for drilling down. */
  readonly children: readonly { readonly name: string; readonly slug: string; readonly count: number }[]
  readonly page: number
  readonly pages: number
}

export const PER_PAGE = 24

/**
 * A listing, whatever it is a listing of.
 *
 * One function for a rayon and for a family, because from the reader's side they
 * are the same page: a title, a count, a way to sort, a grid, and the families
 * underneath. The difference is only which set of products the title stands for,
 * and that is resolved before the sort.
 *
 * Products with no photograph are pushed to the end rather than dropped. On the
 * homepage they are excluded, because a curated shelf of ten should not spend
 * two of them on "Photo à venir"; here the reader asked for everything in the
 * family and hiding 41 of 4 254 references would be answering a different
 * question.
 */
function paginate(
  all: readonly Product[],
  sort: SortKey,
  page: number,
): { products: ProductSummary[]; total: number; page: number; pages: number } {
  const shot = (p: Product) => (p.images.length > 0 ? 0 : 1)
  const sorted = [...all].sort((a, b) => {
    const photo = shot(a) - shot(b)
    if (photo !== 0) return photo
    switch (sort) {
      case 'prix-croissant':
        return a.price - b.price
      case 'prix-decroissant':
        return b.price - a.price
      case 'remise':
        return (b.discountPct ?? 0) - (a.discountPct ?? 0) || byRecency(a, b)
      default:
        return byRecency(a, b)
    }
  })
  const pages = Math.max(1, Math.ceil(sorted.length / PER_PAGE))
  const current = Math.min(Math.max(1, page), pages)
  return {
    products: summarise(sorted.slice((current - 1) * PER_PAGE, current * PER_PAGE)),
    total: sorted.length,
    page: current,
    pages,
  }
}

/** The whole shop, in one listing. The only page where the count is the point. */
export function getCatalogListing(sort: SortKey, page: number): Listing {
  const { products, total, page: current, pages } = paginate(getAllProducts(), sort, page)
  return {
    title: 'Toutes les références',
    path: [],
    total,
    products,
    children: [],
    page: current,
    pages,
  }
}

export function getCategoryListing(slug: string, sort: SortKey, page: number): Listing | null {
  const category = categoriesBySlug.get(slug)
  if (!category) return null
  const universe = universesById.get(category.universeId)
  const { products, total, page: current, pages } = paginate(
    getProductsInCategory(category.id),
    sort,
    page,
  )
  return {
    title: category.name,
    path: [
      { name: 'Catalogue', href: '/catalogue' },
      ...(universe ? [{ name: universe.name, href: `/rayon/${universe.slug}` }] : []),
      ...getCategoryPath(category)
        .slice(0, -1)
        .map((step) => ({ name: step.name, href: `/categorie/${step.slug}` })),
    ],
    total,
    products,
    children: getChildren(category)
      .filter((child) => child.totalCount > 0)
      .map((child) => ({ name: child.name, slug: child.slug, count: child.totalCount })),
    page: current,
    pages,
  }
}

export function getUniverseListing(slug: string, sort: SortKey, page: number): Listing | null {
  const universe = universesBySlug.get(slug)
  if (!universe) return null
  const { products, total, page: current, pages } = paginate(
    getProductsInUniverse(universe.id),
    sort,
    page,
  )
  return {
    title: universe.name,
    path: [{ name: 'Catalogue', href: '/catalogue' }],
    total,
    products,
    children: catalog.categories
      .filter(
        (category) =>
          category.universeId === universe.id && category.level > 0 && category.totalCount > 0,
      )
      .sort((a, b) => b.totalCount - a.totalCount)
      .slice(0, 18)
      .map((category) => ({ name: category.name, slug: category.slug, count: category.totalCount })),
    page: current,
    pages,
  }
}

/**
 * The whole catalogue, department by department, family by family.
 *
 * Every family the shop has, with its count, under the twelve departments. Not a
 * page of links for its own sake: 268 families is more than any menu can hold,
 * and this is the only surface where a reader can see the shape of the business
 * at once rather than one drawer at a time.
 */
export interface IndexDepartment {
  readonly id: UniverseId
  readonly name: string
  readonly slug: string
  readonly tagline: string
  readonly totalCount: number
  readonly families: readonly {
    readonly name: string
    readonly slug: string
    readonly count: number
    readonly level: number
  }[]
}

/**
 * How many families the shop can actually show.
 *
 * NOT `meta.categoryCount`, which is 268 and counts every WooCommerce term:
 * the 46 root terms that the twelve departments replaced, the synthetic
 * `Non classé` bucket, and three families whose stock has gone to zero. The
 * index renders 218 rows, so a page promising 268 of them is 50 short of its
 * own contents, and three of the links would have led to an empty grid.
 *
 * Every "N familles" on the site reads this, so the masthead, the homepage and
 * the index cannot drift apart again.
 */
export function getFamilyCount(): number {
  return catalog.categories.filter(
    (category) => category.level > 0 && !category.hidden && category.totalCount > 0,
  ).length
}

export function getCatalogIndex(): IndexDepartment[] {
  return catalog.universes.map((universe) => ({
    id: universe.id,
    name: universe.name,
    slug: universe.slug,
    tagline: universe.tagline,
    totalCount: universe.totalCount,
    families: catalog.categories
      .filter(
        (category) =>
          category.universeId === universe.id &&
          category.level > 0 &&
          !category.hidden &&
          // A family with no stock is a link to an empty grid. Three of them
          // exist; they stay reachable by URL and by search, but nothing on the
          // site offers them.
          category.totalCount > 0,
      )
      .sort((a, b) => b.totalCount - a.totalCount)
      .map((category) => ({
        name: category.name,
        slug: category.slug,
        count: category.totalCount,
        level: category.level,
      })),
  }))
}

/** Everything a product page renders, already client-safe. */
export interface ProductPage {
  /** WooCommerce post id: what the counter reads back over the telephone. */
  readonly reference: number
  readonly slug: string
  readonly name: string
  readonly brand: string | null
  readonly price: number
  readonly listPrice: number | null
  readonly discountPct: number | null
  readonly inStock: boolean
  readonly specs: readonly string[]
  readonly images: readonly string[]
  readonly addedAt: string | null
  readonly sourceUrl: string
  readonly path: readonly { readonly name: string; readonly href: string }[]
  readonly category: { readonly name: string; readonly slug: string; readonly count: number } | null
  readonly related: readonly ProductSummary[]
}

export function getProductPage(slug: string): ProductPage | null {
  const product = productsBySlug.get(slug)
  if (!product) return null
  const category = categoriesById.get(product.primaryCategoryId)
  const universe = category ? universesById.get(category.universeId) : null

  return {
    reference: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    price: product.price,
    listPrice: product.listPrice,
    discountPct: product.discountPct,
    inStock: product.inStock,
    specs: product.specs,
    images: product.images.map((image) => image.url),
    addedAt: product.addedAt,
    sourceUrl: product.sourceUrl,
    path: [
      { name: 'Catalogue', href: '/catalogue' },
      ...(universe ? [{ name: universe.name, href: `/rayon/${universe.slug}` }] : []),
      ...(category ? [{ name: category.name, href: `/categorie/${category.slug}` }] : []),
    ],
    category: category
      ? { name: category.name, slug: category.slug, count: category.totalCount }
      : null,
    related: summarise(getRelatedProducts(product, 5)),
  }
}

/* -------------------------------------------------------------------------- */
/* Search — what the assistant asks the catalogue                             */
/* -------------------------------------------------------------------------- */

/**
 * Accent-insensitive, case-insensitive, punctuation-insensitive folding.
 *
 * A customer types "onduleur 1500va", "ONDULEUR 1500 VA" and "onduleurs 1500-VA"
 * for the same thing, and this catalogue's own names are inconsistent in exactly
 * the same ways: "Cameras HIKVISION" beside "Caméras de Surveillance". Folding
 * both sides is what makes the two meet.
 */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Words too common in this catalogue to narrow anything. */
const STOP = new Set([
  'de', 'du', 'des', 'la', 'le', 'les', 'un', 'une', 'et', 'ou', 'pour', 'avec',
  'sur', 'en', 'a', 'au', 'aux', 'je', 'tu', 'il', 'vous', 'nous', 'cherche',
  'voudrais', 'veux', 'besoin', 'avez', 'avez-vous', 'bonjour', 'salut', 'svp',
  'merci', 'prix', 'combien', 'est', 'ce', 'que', 'qui', 'quel', 'quelle',
])

function terms(query: string): string[] {
  return fold(query)
    .split(' ')
    .filter((word) => word.length > 1 && !STOP.has(word))
    .slice(0, 6)
}

export interface SearchHit {
  readonly slug: string
  readonly name: string
  readonly price: number
  readonly inStock: boolean
  readonly image: string | null
  readonly categoryName: string
}

let haystack: { product: Product; text: string }[] | null = null

/**
 * Free-text search over the catalogue.
 *
 * A ranked scan, not an index. 4 254 products folded once and cached is roughly
 * a megabyte of strings and a scan takes under two milliseconds, which is far
 * below the cost of the network hop that carries the question here. An inverted
 * index would be the right answer at ten times this size and premature at this
 * one.
 *
 * Every term must match somewhere, which is what stops "onduleur 1500" from
 * returning every onduleur. Position matters: a term at the head of the name is
 * what the product IS, the same term at the tail is usually a compatibility
 * note.
 */
export function searchCatalog(query: string, limit = 4): SearchHit[] {
  const words = terms(query)
  if (words.length === 0) return []

  if (!haystack) {
    haystack = catalog.products.map((product) => ({
      product,
      text: fold(
        [
          product.name,
          product.brand ?? '',
          categoriesById.get(product.primaryCategoryId)?.name ?? '',
        ].join(' '),
      ),
    }))
  }

  const scored: { product: Product; score: number }[] = []
  for (const entry of haystack) {
    let score = 0
    let matchedAll = true
    for (const word of words) {
      const at = entry.text.indexOf(word)
      if (at === -1) {
        matchedAll = false
        break
      }
      score += at === 0 ? 3 : at < 30 ? 2 : 1
    }
    if (!matchedAll) continue
    if (entry.product.inStock) score += 1
    if (entry.product.images.length > 0) score += 1
    scored.push({ product: entry.product, score })
  }

  return scored
    .sort((a, b) => b.score - a.score || byRecency(a.product, b.product))
    .slice(0, limit)
    .map(({ product }) => ({
      slug: product.slug,
      name: product.name,
      price: product.price,
      inStock: product.inStock,
      image: product.images[0]?.url ?? null,
      categoryName: categoriesById.get(product.primaryCategoryId)?.name ?? '',
    }))
}

/** The families whose names the question touches, for a "browse instead" reply. */
export function searchFamilies(query: string, limit = 3): CategorySummary[] {
  const words = terms(query)
  if (words.length === 0) return []
  return catalog.categories
    .filter((category) => {
      if (category.level === 0 || category.hidden || category.totalCount === 0) return false
      const text = fold(category.name)
      return words.every((word) => text.includes(word))
    })
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, limit)
    .map(toCategorySummary)
}
