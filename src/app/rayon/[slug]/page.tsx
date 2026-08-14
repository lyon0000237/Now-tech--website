import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Breadcrumb } from '@/components/catalog/Breadcrumb'
import { Listing } from '@/components/catalog/Listing'
import { PageHeader } from '@/components/layout/PageHeader'
import { getUniverseBySlug, getUniverseListing } from '@/lib/catalog'
import { formatAmount } from '@/lib/format'
import { parsePage, parseSort } from '@/lib/params'

interface Params {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tri?: string | string[]; page?: string | string[] }>
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const universe = getUniverseBySlug(slug)
  if (!universe) return {}
  return {
    title: universe.name,
    description: `${universe.tagline} ${formatAmount(universe.totalCount)} références en stock chez NowTech Center, à Douala et Yaoundé.`,
  }
}

/**
 * A department.
 *
 * One of the twelve. The layer above the WooCommerce tree rather than inside it:
 * these groupings are the merchant's own, read off the counter, and they are the
 * only level of this taxonomy a customer would recognise as a department in a
 * shop. The families listed at the top are the tree's, sorted by depth of stock.
 *
 * The page is the shared listing. A department and a family differ in what they
 * contain, not in what the reader does with them, and giving them two different
 * layouts would mean a customer who narrowed by one click has to relearn the
 * page they are already on.
 */
export default async function RayonPage({ params, searchParams }: Params) {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const sort = parseSort(query.tri)
  const page = parsePage(query.page)

  const listing = getUniverseListing(slug, sort, page)
  if (!listing) notFound()

  const universe = getUniverseBySlug(slug)

  return (
    <>
      <Breadcrumb path={listing.path} current={listing.title} />

      <PageHeader
        title={listing.title}
        lead={universe?.tagline}
        aside={`${formatAmount(listing.total)} références`}
      />

      <section className="shell">
        <Listing listing={listing} basePath={`/rayon/${slug}`} sort={sort} />
      </section>
    </>
  )
}
