import type { Metadata } from 'next'
import Link from 'next/link'

import { FamilyIndex } from '@/components/catalog/FamilyIndex'
import { Listing } from '@/components/catalog/Listing'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { getCatalogIndex, getCatalogListing, getFamilyCount, getMeta } from '@/lib/catalog'
import { formatAmount } from '@/lib/format'
import { parsePage, parseSort } from '@/lib/params'

export const metadata: Metadata = {
  title: 'Le catalogue',
  description:
    'Les 4 254 références NowTech Center, rayon par rayon et famille par famille : ' +
    'informatique, réseau, sécurité électronique, impression, énergie et électroménager.',
}

/**
 * The catalogue.
 *
 * FOUR PLACES ON THE HOMEPAGE POINT HERE, and they point at two different
 * things. "Ouvrir le catalogue complet" means the merchandise; "Les 218
 * familles" and "Voir l'index complet" mean the map. This page is both, in that
 * order, because a reader who came for merchandise should not have to scroll a
 * directory to reach it, and a reader who came for the map arrives on the anchor
 * with the index already under their cursor.
 *
 * THE PAGE IS BUILT DOWNWARD IN DECREASING GRANULARITY: twelve departments, then
 * every reference in the shop with the four orderings, then the full index of
 * families. That is the same movement the homepage makes, from the curated to
 * the exhaustive, and it means the top of this page can be read in ten seconds
 * while the bottom of it can be read for ten minutes.
 *
 * NOTHING HERE IS EDITORIAL. Every figure is counted out of the export at build
 * time, every list is the result of a query stated on the page, and the only
 * ordering that claims anything is "Arrivage", which is the upload date of the
 * photography and is the one date signal the export actually carries.
 */
export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ tri?: string | string[]; page?: string | string[] }>
}) {
  const params = await searchParams
  const sort = parseSort(params.tri)
  const page = parsePage(params.page)

  const meta = getMeta()
  const departments = getCatalogIndex()
  const familyCount = getFamilyCount()
  const listing = getCatalogListing(sort, page)

  return (
    <>
      <PageHeader
        title="Tout ce que le magasin tient, en une page"
        lead={`Douze rayons, ${familyCount} familles et ${formatAmount(meta.productCount)} références, exactement telles qu’elles sont rangées au comptoir. Descendez pour les parcourir, ou ouvrez l’index si vous savez déjà ce que vous cherchez.`}
        aside={`${formatAmount(meta.productCount)} références`}
      />

      {/* The twelve, before anything else. A reader who knows their department
          should never have to meet 4 254 products to reach 845 of them. */}
      <section className="shell" aria-label="Rayons">
        <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((department, index) => (
            <li
              key={department.id}
              className="enter e-item border-t border-rule pt-5"
              style={{ '--enter-index': index } as React.CSSProperties}
            >
              <Link href={`/rayon/${department.slug}`} className="group block">
                <span className="flex items-baseline justify-between gap-4">
                  <span className="draw-under text-body font-semibold tracking-[-0.01em] group-hover:text-accent">
                    {department.name}
                  </span>
                  <span className="t-num shrink-0 text-micro text-ink-3">
                    {formatAmount(department.totalCount)}
                  </span>
                </span>
                <span className="mt-1.5 block text-micro leading-[1.6] text-ink-3">
                  {department.tagline}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="shell mt-band">
        <SectionHeader
          title="Toutes les références"
          context="Le catalogue entier, dans l’ordre que vous choisissez. « Arrivage » classe par date de mise en ligne de la photographie, seule date que l’export porte."
          action={{ href: '#index', label: `Les ${familyCount} familles` }}
        />
        <Listing listing={listing} basePath="/catalogue" sort={sort} />
      </section>

      {/* `scroll-mt` because the masthead is sticky: without it the anchor puts
          the heading exactly under the green bar that covers it. */}
      <section id="index" className="shell mt-band scroll-mt-28">
        <SectionHeader
          title="L’index des familles"
          context={`Les ${familyCount} familles où le magasin tient effectivement du stock, classées par profondeur sous leur rayon. Le nombre est celui des références en catalogue.`}
        />
        <FamilyIndex departments={departments} />
      </section>
    </>
  )
}
