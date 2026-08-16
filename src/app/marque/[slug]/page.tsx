import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Breadcrumb } from '@/components/catalog/Breadcrumb'
import { Listing } from '@/components/catalog/Listing'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { getBrandBySlug, getBrandIndex, getBrandListing } from '@/lib/catalog'
import { formatCount } from '@/lib/format'
import { parsePage, parseSort } from '@/lib/params'

interface Params {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tri?: string | string[]; page?: string | string[] }>
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const brand = getBrandBySlug(slug)
  if (!brand) return {}
  return {
    title: brand.name,
    description:
      `${formatCount(brand.productCount, 'référence')} ${brand.name} au catalogue NowTech Center, ` +
      `tous rayons confondus, avec les prix du comptoir de Douala et Yaoundé.`,
  }
}

/**
 * One brand.
 *
 * THE PAGE EXISTS BECAUSE THE CURRENT SITE CANNOT DRAW IT. The export has no
 * brand taxonomy, the column is filled on 14 rows out of 7 116, so a customer
 * who wants to see every HP in the shop has to walk six departments. The name
 * was recovered at ingest from category paths and product titles, and this page
 * is the whole point of that recovery: 544 HP references in one list, ordered
 * four ways, with the families they fall into across the top.
 *
 * IT CLAIMS NOTHING. No official distribution, no partnership, no certification,
 * no "revendeur agréé". The line under the title says exactly where the name
 * came from, because a page titled with a manufacturer's name and set in that
 * manufacturer's mark is read as a claim unless it says otherwise.
 *
 * THE MARK IS DRAWN ONLY IF WE HOLD ONE, and 68 of the 101 brands have none.
 * That is why the header band is a line of text with an optional mark in front
 * of it, rather than a masthead built around a logo: the same component has to
 * hold ZKTECO, which has no mark and 50 references, without looking like a page
 * that failed to load. The mark is painted with the mask used everywhere else,
 * so it is the page's own ink and never a second colour on the page.
 *
 * AND IT IS DRAWN AT 56 HERE WHILE THE INDEX STAMPS IT AT 40, OR 30, OR LESS ON
 * A NARROW PHONE. /marques holds thirty-three marks in one grid, and seven of
 * the files paint so much of their 24x24 box that they outweigh every wordmark
 * beside them: XIAOMI at 74.5 % of the box, MIKROTIK 56.8, HP 54.6, APPLE 52.3,
 * LINKSYS 51.5, UBIQUITI 48.6 and TP-LINK 46.0, against a set median of 17.8.
 * That page cuts those seven down, on the rule written out over its own
 * constant. Weight is a comparison, and there is nothing here to compare
 * against: one brand, one mark, its own page, so it is drawn at its own size.
 * Even XIAOMI, which is a filled squircle, reads as a logo beside a paragraph
 * rather than as the black slab it becomes in a grid of thirty-three.
 *
 * THE DEPARTMENTS ARE STATED, NOT LINKED, AND ONLY ONCE. HP spans six of the
 * twelve, which is the fact worth printing here; it used to be printed twice,
 * in the lead and again in the band under it, and the second one was the useful
 * one because it names them. They are not links because /rayon/impression would
 * silently drop the brand the reader came for, and a control that returns more
 * than you asked for is worse than a sentence. The families across the top of
 * the listing, which the query does carry, are the real narrowing.
 */
export default async function MarquePage({ params, searchParams }: Params) {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const sort = parseSort(query.tri)
  const page = parsePage(query.page)

  const listing = getBrandListing(slug, sort, page)
  if (!listing) notFound()

  const entry = getBrandIndex().find((candidate) => candidate.slug === slug)

  // The departments come back as short labels ("Impression", "TV & Audio") and
  // that is not a cosmetic choice: the full names carry commas of their own,
  // "Impression, Copie & Scan", and a comma-joined sentence built from them
  // reads as nine departments where there are six.
  const departments = entry?.departments ?? []

  const top = listing.children[0]
  const families = listing.children.length

  return (
    <>
      <Breadcrumb path={listing.path} current={listing.title} />

      <PageHeader
        title={listing.title}
        lead={
          !top
            ? 'Tout ce que le magasin tient sous ce nom.'
            : families === 1
              ? `Tout ce que le magasin tient sous ce nom, rangé dans une seule famille : « ${top.name} ».`
              : `Tout ce que le magasin tient sous ce nom. La famille la plus fournie est « ${top.name} » avec ${formatCount(top.count, 'référence')}.`
        }
        aside={formatCount(listing.total, 'référence')}
      />

      {/* The provenance band. Mark on the left when we hold one, the sentence
          that keeps the page honest on the right. With no mark the row is simply
          the sentence, at full measure, which is the common case: 68 of 101.
          It is also the only place the departments are named, which is why the
          lead above it stopped counting them. */}
      <section className="shell" aria-label="D’où vient cette marque">
        <div className="enter flex flex-wrap items-center gap-x-10 gap-y-6 border-t border-rule pt-6">
          {entry?.file ? (
            <span
              className="block w-14 shrink-0"
              style={{ '--mark-src': `url(/brands/${entry.file}.svg)` } as React.CSSProperties}
            >
              {/* Every file in the set is a 24x24 square, so the mark is bound
                  by its height and the box must be square too: given a wide box
                  the mask centres a 32px mark in it and the logo floats. */}
              <span aria-hidden className="brand-mark" style={{ height: '3.5rem' }} />
            </span>
          ) : null}

          <p className="e-text max-w-[70ch] flex-1 text-small leading-[1.65] text-ink-3">
            {departments.length > 0
              ? `Présent dans ${formatCount(departments.length, 'rayon')} : ${departments.join(', ')}. `
              : ''}
            Ce nom n’est pas un champ de notre export : il a été retrouvé à l’ingestion dans les
            titres de produits et les chemins de catégories, ce qui permet de réunir ici ce qui est
            rangé ailleurs. Nous ne revendiquons ni distribution officielle, ni partenariat, ni
            certification.
          </p>
        </div>
      </section>

      <section className="shell mt-band">
        <SectionHeader
          title={`Toutes les références ${listing.title}`}
          context={`${formatCount(listing.total, 'produit')} dont le titre ou le chemin de catégorie porte ce nom. « Arrivage » classe par date de mise en ligne de la photographie, seule date que l’export porte.`}
          action={{ href: '/marques', label: 'Toutes les marques' }}
        />
        <Listing listing={listing} basePath={`/marque/${slug}`} sort={sort} />
      </section>
    </>
  )
}
