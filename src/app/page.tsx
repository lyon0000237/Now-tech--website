import { DepartmentGrid } from '@/components/catalog/DepartmentGrid'
import { BrandRail } from '@/components/home/BrandRail'
import { Opening } from '@/components/home/Opening'
import { RecentBySubcategory, type RecentBlock } from '@/components/home/RecentBySubcategory'
import { ServiceStrip } from '@/components/home/ServiceStrip'
import { SectionHeader } from '@/components/ui/SectionHeader'
import {
  getBrands,
  getCategoryById,
  getDepartmentTiles,
  getMeta,
  getRecentBySubcategory,
  summarise,
} from '@/lib/catalog'

/**
 * The homepage.
 *
 * It orchestrates and does not render: every visual decision lives in a section
 * component, and every fact comes from the catalog rather than from this file.
 * The sequence answers, in order, the four questions a first-time visitor
 * actually has. What is this shop. Where do I start. Can I trust you. What is
 * new.
 */
export default function HomePage() {
  const meta = getMeta()
  const tiles = getDepartmentTiles()
  const brandCount = getBrands().length
  // Only brands with real depth earn a chip: a one-product brand is a filter
  // that returns a dead end.
  const brands = getBrands(8).slice(0, 22)

  const blocks: RecentBlock[] = getRecentBySubcategory({
    blocks: 4,
    productsPerBlock: 4,
    minProducts: 8,
  }).map((block) => ({
    categoryName: block.category.name,
    categorySlug: block.category.slug,
    parentName: getCategoryById(block.category.parentId ?? -1)?.name ?? block.root.name,
    departmentName: block.universe.name,
    totalCount: block.category.totalCount,
    newestAt: block.products[0]?.addedAt ?? null,
    products: summarise(block.products),
  }))

  return (
    <>
      <Opening productCount={meta.productCount} brandCount={brandCount} />

      <section className="shell pt-5.5">
        <SectionHeader
          title="Explorer par rayon"
          context="Douze rayons couvrent l’ensemble du catalogue. Chacun ouvre sur ses familles, puis sur ses produits."
          action={{ href: '/catalogue', label: `Index des ${meta.categoryCount} familles` }}
        />
        <DepartmentGrid tiles={tiles} />
      </section>

      <div className="mt-14">
        <ServiceStrip />
      </div>

      <section className="shell pt-14">
        <SectionHeader
          title="Derniers arrivages"
          context="Les familles où du stock est entré le plus récemment, une par rayon."
          action={{ href: '/catalogue?tri=recent', label: 'Tout voir' }}
        />
        <RecentBySubcategory blocks={blocks} />
      </section>

      <section className="shell pt-14">
        <SectionHeader
          title="Marques distribuées"
          action={{ href: '/marques', label: 'Toutes les marques' }}
        />
        <BrandRail brands={brands} />
      </section>
    </>
  )
}
