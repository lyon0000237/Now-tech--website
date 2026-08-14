import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Breadcrumb } from '@/components/catalog/Breadcrumb'
import { Listing } from '@/components/catalog/Listing'
import { PageHeader } from '@/components/layout/PageHeader'
import { getCategoryBySlug, getCategoryListing } from '@/lib/catalog'
import { formatAmount, formatCount } from '@/lib/format'
import { parsePage, parseSort } from '@/lib/params'

interface Params {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tri?: string | string[]; page?: string | string[] }>
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const category = getCategoryBySlug(slug)
  if (!category) return {}
  return {
    title: category.name,
    description: `${category.name} : ${formatCount(category.totalCount, 'référence')} en stock chez NowTech Center. Retrait le jour même à Douala et Yaoundé, livraison en 24 à 48 h.`,
  }
}

/**
 * A family.
 *
 * The WooCommerce term itself, at whatever depth it sits. A family holding
 * sub-families shows them above its grid and counts their stock into its own
 * total, which is how the shop counts it at the counter: "Onduleurs" means every
 * onduleur, not only the ones nobody filed one level deeper.
 *
 * WHY THE LEAD IS A FACT AND NOT A SENTENCE. There is no editorial copy for 268
 * families and there never will be, so writing one would mean generating 268
 * paragraphs of the same three adjectives. The line under the title states where
 * the page sits and how it is divided, which is the only thing that is both true
 * and different for every one of them.
 *
 * IT DOES NOT REPEAT THE COUNT. The total is already printed on the title's own
 * baseline and again as a range above the grid; saying "307 références" a third
 * time inside the lead put the same number three times on one phone screen.
 */
export default async function CategoriePage({ params, searchParams }: Params) {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const sort = parseSort(query.tri)
  const page = parsePage(query.page)

  const listing = getCategoryListing(slug, sort, page)
  if (!listing) notFound()

  // Index 0 is always "Catalogue", which is a route and not a shelf: on a
  // category filed directly under a department the useful parent is the
  // department, and on one with no department there is no parent to name.
  const parent = listing.path.length > 1 ? listing.path[listing.path.length - 1] : null

  return (
    <>
      <Breadcrumb path={listing.path} current={listing.title} />

      <PageHeader
        title={listing.title}
        lead={
          [
            parent ? `Rangé sous ${parent.name}.` : null,
            listing.children.length > 0
              ? `Découpé en ${formatCount(listing.children.length, 'famille')}.`
              : null,
          ]
            .filter(Boolean)
            .join(' ') || undefined
        }
        aside={`${formatAmount(listing.total)} références`}
      />

      <section className="shell">
        <Listing listing={listing} basePath={`/categorie/${slug}`} sort={sort} />
      </section>
    </>
  )
}
