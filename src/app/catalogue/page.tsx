import type { Metadata } from 'next'
import Link from 'next/link'

import { FamilyIndex } from '@/components/catalog/FamilyIndex'
import {
  FilterPanel,
  NoResults,
  PRICE_STEPS,
  priceLabel,
  type PriceBand,
  type Rescue,
} from '@/components/catalog/FilterPanel'
import { Pager } from '@/components/catalog/Pager'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProductGrid } from '@/components/product/ProductGrid'
import { SectionHeader } from '@/components/ui/SectionHeader'
import {
  NO_FILTERS,
  PER_PAGE,
  getBrandIndex,
  getBrandBySlug,
  getCatalogIndex,
  getCategoryBySlug,
  getFamilyCount,
  getFilteredCatalogue,
  getMeta,
  getUniverseBySlug,
  type CatalogFilters,
} from '@/lib/catalog'
import { formatAmount, formatCount } from '@/lib/format'
import {
  catalogueHref,
  catalogueQuery,
  countFilters,
  readCatalogue,
  withPrice,
  type CatalogueParams,
  type CatalogueState,
} from '@/lib/params'

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
 *
 * A FILTERED CATALOGUE IS A DIFFERENT PAGE, AND IT LOSES TWO OF ITS THREE
 * SECTIONS. The twelve departments and the 218-family index describe the whole
 * shop; printed above and below a list narrowed to nine references they describe
 * something the reader is no longer looking at, and every count in them
 * contradicts the count in the middle. So the moment a filter is on, the page
 * opens directly on the results and the index becomes one line pointing back at
 * itself. The departments are not lost: they are the panel's first group, with
 * counts that are true of the current selection rather than of the shop.
 *
 * THE FILTERED STATES ARE NOT INDEXED. Eight dimensions over 12 departments, 218
 * families and 101 brands is a combinatorial space no crawler should be invited
 * into, and every one of those pages is a subset of a page that is already
 * indexed. `robots: noindex, follow` the moment a filter is on — follow, because
 * the products themselves are the pages worth reaching.
 */

interface Params {
  searchParams: Promise<CatalogueParams>
}

export async function generateMetadata({ searchParams }: Params): Promise<Metadata> {
  const { filters } = readCatalogue(await searchParams)
  const filtered = countFilters(filters) > 0

  return {
    title: 'Le catalogue',
    description:
      'Les 4 254 références NowTech Center, rayon par rayon et famille par famille : ' +
      'informatique, réseau, sécurité électronique, impression, énergie et électroménager.',
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  }
}

/** The label a chip and the dead-end screen both use for one whole dimension. */
function joined(values: readonly string[], name: (slug: string) => string | null): string {
  const names = values.map((slug) => name(slug) ?? slug)
  return names.length <= 2 ? names.join(' et ') : `${names[0]} et ${names.length - 1} autres`
}

export default async function CataloguePage({ searchParams }: Params) {
  const query = readCatalogue(await searchParams)
  const state: CatalogueState = {
    filters: query.filters,
    sort: query.sort,
    open: query.open,
    sheet: query.sheet,
  }

  const meta = getMeta()
  const familyCount = getFamilyCount()
  const brandCount = getBrandIndex().length
  const { listing, facets } = getFilteredCatalogue(query.filters, query.sort, query.page)

  /**
   * How many filters are on, counted once for the whole page.
   *
   * NOT `facets.active`, WHICH COUNTS THE PRICE TWICE. It adds `prixMin` and
   * `prixMax` separately, so `?prix=50000-150000` printed "2 filtres actifs"
   * beside one chip and one removal. `countFilters` is the panel's own reading
   * and every place on this page that prints the number now reads it, so the
   * header, the results line, the phone button's badge and the dead end cannot
   * say three different things about one selection.
   */
  const active = countFilters(query.filters)
  const filtering = active > 0

  /**
   * The five price steps, counted.
   *
   * Five more passes over the catalogue, and they are what lets the price group
   * obey the rule every other group on this panel obeys: a step that would give
   * nothing is not offered. The panel does the dropping, because the panel is
   * where the ladder is drawn; this only has to say how big each step is. Each
   * is counted with the current price bounds REMOVED and everything else kept,
   * which is the convention `getFilteredCatalogue` already applies to a
   * dimension against itself — otherwise choosing one step would zero the other
   * four.
   */
  const bands: PriceBand[] = PRICE_STEPS.map((step) => ({
    ...step,
    count: getFilteredCatalogue(withPrice(query.filters, step.min, step.max), query.sort, 1)
      .listing.total,
  }))

  /**
   * Which single filter is standing between the reader and a result.
   *
   * Only computed on the dead end, where it is the only thing on screen worth
   * computing, and in two passes because a dead end has two shapes.
   *
   * FIRST, ONE FILTER TOO MANY. Each active dimension is dropped in turn and the
   * query re-run; the drop that gives back the most is offered. Dimensions, not
   * values: a reader who chose four brands and got nothing is not helped by being
   * told which of the four to remove, they are helped by being told it is the
   * brands.
   *
   * SECOND, FILTERS THAT SIMPLY DO NOT MEET. `marque=hp` with
   * `rayon=onduleurs-energie` is empty and stays empty however many of the four
   * are removed one at a time, because the shop holds no HP inverter. Removing
   * one thing rescues nothing, so the page stops offering removals and offers the
   * widest single filter the reader actually asked for, which is one click from a
   * page with merchandise on it.
   */
  let rescue: Rescue | null = null
  if (listing.total === 0 && filtering) {
    const f = query.filters
    const dimensions: { label: string; without: CatalogFilters; only: CatalogFilters }[] = [
      ...(f.rayons.length > 0
        ? [
            {
              label: `Rayon : ${joined(f.rayons, (slug) => getUniverseBySlug(slug)?.name ?? null)}`,
              without: { ...f, rayons: [] },
              only: { ...NO_FILTERS, rayons: f.rayons },
            },
          ]
        : []),
      ...(f.familles.length > 0
        ? [
            {
              label: `Famille : ${joined(f.familles, (slug) => getCategoryBySlug(slug)?.name ?? null)}`,
              without: { ...f, familles: [] },
              only: { ...NO_FILTERS, familles: f.familles },
            },
          ]
        : []),
      ...(f.marques.length > 0
        ? [
            {
              label: `Marque : ${joined(f.marques, (slug) => getBrandBySlug(slug)?.name ?? null)}`,
              without: { ...f, marques: [] },
              only: { ...NO_FILTERS, marques: f.marques },
            },
          ]
        : []),
      ...(f.prixMin !== null || f.prixMax !== null
        ? [
            {
              label: `Prix : ${priceLabel(f.prixMin, f.prixMax)}`,
              without: withPrice(f, null, null),
              only: withPrice(NO_FILTERS, f.prixMin, f.prixMax),
            },
          ]
        : []),
      ...(f.stock
        ? [
            {
              label: 'En stock au comptoir',
              without: { ...f, stock: false },
              only: { ...NO_FILTERS, stock: true },
            },
          ]
        : []),
      ...(f.remise
        ? [
            {
              label: 'Remisé de 40 % ou plus',
              without: { ...f, remise: false },
              only: { ...NO_FILTERS, remise: true },
            },
          ]
        : []),
      ...(f.photo
        ? [
            {
              label: 'Avec photographie',
              without: { ...f, photo: false },
              only: { ...NO_FILTERS, photo: true },
            },
          ]
        : []),
    ]

    const best = (
      mode: 'drop' | 'keep',
      pick: (dimension: (typeof dimensions)[number]) => CatalogFilters,
    ): Rescue | null => {
      let found: Rescue | null = null
      for (const dimension of dimensions) {
        const filters = pick(dimension)
        const total = getFilteredCatalogue(filters, query.sort, 1).listing.total
        if (total > (found?.total ?? 0)) {
          found = {
            mode,
            total,
            label: dimension.label,
            href: catalogueHref({ ...state, filters }),
          }
        }
      }
      return found
    }

    rescue =
      best('drop', (dimension) => dimension.without) ??
      (dimensions.length > 1 ? best('keep', (dimension) => dimension.only) : null)
  }

  const from = listing.total === 0 ? 0 : (listing.page - 1) * PER_PAGE + 1
  const to = Math.min(listing.page * PER_PAGE, listing.total)

  return (
    <>
      <PageHeader
        title={
          filtering
            ? 'Le catalogue, réduit à ce que vous avez demandé'
            : 'Tout ce que le magasin tient, en une page'
        }
        lead={
          filtering
            ? `${formatCount(listing.total, 'référence')} sur ${formatAmount(meta.productCount)} ${listing.total < 2 ? 'répond' : 'répondent'} à ${formatCount(active, 'filtre')}. Cette adresse porte la sélection entière : copiez-la, elle rouvrira exactement cette liste chez quelqu’un d’autre.`
            : `Douze rayons, ${familyCount} familles et ${formatAmount(meta.productCount)} références, exactement telles qu’elles sont rangées au comptoir. Descendez pour les parcourir, ou ouvrez l’index si vous savez déjà ce que vous cherchez.`
        }
        aside={
          filtering
            ? `${formatAmount(listing.total)} / ${formatAmount(meta.productCount)}`
            : `${formatAmount(meta.productCount)} références`
        }
      />

      {/* The twelve, before anything else. A reader who knows their department
          should never have to meet 4 254 products to reach 845 of them. Under a
          filter they are gone: twelve counts describing the whole shop, printed
          above a list of nine, are twelve numbers contradicting the one that
          matters. They come back as the panel's first group, counted against the
          selection. */}
      {filtering ? null : (
        <section className="shell" aria-label="Rayons">
          {/**
           * TWELVE CARDS IN A GRID ARE TWELVE ROWS IN A COLUMN ON A PHONE, AND A
           * COLUMN IS NOT A GRID MADE NARROW. Measured at 360 before this block
           * was touched: each door was 87.9 tall — a name, a count and a
           * two-line gloss — and the twelve, separated by 32 pixels of `gap-y-8`,
           * came to 1 406.5 pixels. That is a screen and three quarters of
           * navigation before the reader meets a single price, and it is what
           * put "Filtrer et trier" 2 247 pixels down the page.
           *
           * THE GLOSS IS WHAT GOES, NOT THE DOOR. Set at one column the gloss
           * cannot be read across a gap the way it is in a three-column grid: it
           * is two more lines under a name that already says the same thing —
           * "Sécurité & Biométrie" over "Vidéosurveillance, enregistreurs,
           * contrôle d'accès, alarme, interphonie" — and twelve of them stacked
           * turn a map into a wall. Truncating it to one line was tried and
           * rejected: at 12 pixels the shell holds 48 characters and every one
           * of the twelve runs past 60, so the page would have ended in twelve
           * ellipses and half the information.
           *
           * What is left is the row this site sets every long list of names as,
           * the same one `FamilyIndex` and `Listing` fall back to under their own
           * breakpoints: a rule between, the name left, the count right, 52
           * pixels tall. The twelve now measure 624 and fit one screen, which is
           * the point — a reader looking for their department reads all of them
           * in one movement instead of scrolling past eight.
           *
           * NOTHING OF THIS REACHES A POINTER. Every class here is behind a
           * `sm:` reset, and the grid measured unchanged at 1440: li 381.3 x
           * 87.9, three columns, gloss on two lines.
           */}
          <ul className="grid border-t border-rule sm:grid-cols-2 sm:gap-x-10 sm:gap-y-8 sm:border-t-0 lg:grid-cols-3">
            {getCatalogIndex().map((department, index) => (
              <li
                key={department.id}
                className="enter e-item border-b border-rule sm:border-t sm:border-b-0 sm:pt-5"
                style={{ '--enter-index': index } as React.CSSProperties}
              >
                <Link
                  href={`/rayon/${department.slug}`}
                  className="group block min-h-11 py-3.5 sm:min-h-0 sm:py-0"
                >
                  <span className="flex items-baseline justify-between gap-4">
                    <span className="draw-under text-body font-semibold tracking-[-0.01em] group-hover:text-accent">
                      {department.name}
                    </span>
                    <span className="t-num shrink-0 text-micro text-ink-3">
                      {formatAmount(department.totalCount)}
                    </span>
                  </span>
                  <span className="mt-1.5 hidden text-micro leading-[1.6] text-ink-3 sm:block">
                    {department.tagline}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={`shell ${filtering ? '' : 'mt-band'}`}>
        <SectionHeader
          title={filtering ? 'Les références retenues' : 'Toutes les références'}
          context={
            filtering
              ? 'Chaque compte du panneau est calculé contre les autres filtres déjà posés, jamais contre le magasin entier : c’est la taille de cette valeur seule. Cochez-en une dans un groupe et c’est exactement la liste que vous obtenez ; cochez-en une seconde dans le même groupe et la liste réunit les deux, donc elle s’élargit. Une valeur qui ne donnerait rien, ou qui rendrait exactement la liste déjà affichée, n’est pas proposée : le panneau ne montre que ce qui change quelque chose.'
              : 'Le catalogue entier, dans l’ordre que vous choisissez. « Arrivage » classe par date de mise en ligne de la photographie, seule date que l’export porte.'
          }
          action={filtering ? undefined : { href: '#index', label: `Les ${familyCount} familles` }}
        />

        {/* A value the catalogue has never held is dropped rather than obeyed,
            and named rather than swallowed: a link that has aged past a renamed
            family should show the shop, and say why it is showing all of it. */}
        {query.ignored.length > 0 ? (
          <p className="enter e-text mb-stack rounded-well bg-space px-5 py-4 text-small leading-[1.6] text-ink-2">
            {query.ignored.length === 1
              ? `« ${query.ignored[0]} » n’est ni un rayon, ni une famille, ni une marque de ce catalogue : ce filtre a été ignoré.`
              : `${formatCount(query.ignored.length, 'valeur')} de l’adresse ne correspondent à rien au catalogue et ont été ignorées : ${query.ignored.map((value) => `« ${value} »`).join(', ')}.`}
          </p>
        ) : null}

        {/* THE PANEL COMES FIRST IN THE DOCUMENT AND SECOND ON THE SCREEN. A
            reader narrows, then reads; a screen reader and a keyboard should
            meet the controls in that order, and the grid places them on the
            right where the client asked for them. `items-start` is what lets the
            panel be sticky at all: a stretched grid item is as tall as its row
            and has nowhere to stick to. */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-x-10 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-x-14">
          <FilterPanel
            state={state}
            facets={facets}
            bands={bands}
            total={listing.total}
            active={active}
            familyCount={familyCount}
            brandCount={brandCount}
          />

          {/* WHERE "VOIR LES 544 RÉFÉRENCES" LANDS, AND IT HAS TO CLEAR TWO
              PINNED THINGS, NOT ONE. Closing the sheet is a jump to this anchor,
              so `scroll-mt` has to be the full height of everything that stays on
              screen. Measured with the sheet closed by its own foot button: at
              390 the masthead pins at 56 and the filter bar under it is 73, so
              8.5rem lands the results head at 135.9 with 6.9 pixels of air. At
              834 the masthead pins at 121 and the same bar is still drawn — the
              sheet exists everywhere below lg — which is 194, and 8.5rem put the
              head at 136: fifty-eight pixels BEHIND the chrome, so a reader who
              tapped "Voir les 544 références" arrived on a page whose count line
              was covered by the button they had just pressed. 13.125rem is
              121 + 73 + 16. From lg the bar is gone and 8.5rem is right again,
              measured at 1440 landing the head at 124 under a chrome of 121. */}
          <div
            id="resultats"
            className="min-w-0 scroll-mt-[8.5rem] md:scroll-mt-[13.125rem] lg:col-start-1 lg:row-start-1 lg:scroll-mt-[8.5rem]"
          >
            <div className="enter mb-stack flex flex-wrap items-center justify-between gap-x-10 gap-y-3 border-b border-rule pb-5">
              <p className="e-text t-num text-small text-ink-2">
                {listing.total === 0
                  ? 'Aucun produit'
                  : listing.total <= PER_PAGE
                    ? formatCount(listing.total, 'produit')
                    : `${formatAmount(from)} à ${formatAmount(to)} sur ${formatAmount(listing.total)}`}
              </p>
              <p className="e-item text-small text-ink-3">
                {active === 0
                  ? 'Aucun filtre'
                  : formatCount(active, 'filtre actif', 'filtres actifs')}
              </p>
            </div>

            {listing.total === 0 ? (
              <NoResults
                rescue={rescue}
                cleared={catalogueHref({ ...state, filters: NO_FILTERS })}
                active={active}
              />
            ) : (
              // THREE COLUMNS, NOT FOUR. The panel takes 320 pixels off the
              // right of the shell, so the four-column step this listing used to
              // take at xl left each card 160 pixels wide at 1280 — a packshot
              // smaller than the thumbnail in the search panel. Three columns
              // put the card back at 267 at 1440, which is the size it is
              // everywhere else on the site.
              <ProductGrid products={listing.products} columns={3} priorityCount={3} />
            )}

            <Pager
              basePath="/catalogue"
              query={catalogueQuery(state)}
              page={listing.page}
              pages={listing.pages}
            />
          </div>
        </div>
      </section>

      {/* `scroll-mt` because the masthead is sticky: without it the anchor puts
          the heading exactly under the green bar that covers it.

          AND 112 IS THE HEIGHT OF THE BAR, NOT A LANDING. Measured at 360: the
          masthead pins at exactly 112 pixels and `scroll-mt-28` is 112, so
          "Les 218 familles" put the heading's box at y 112.2 — its ascenders
          touching the green edge, with no air at all between the bar and the
          word under it. `scroll-mt-32` is 128 and leaves 16, the same gutter the
          page uses everywhere else. `lg:scroll-mt-28` keeps the pointer on the
          number it was measured with. */}
      <section id="index" className="shell mt-band scroll-mt-32 lg:scroll-mt-28">
        <SectionHeader
          title="L’index des familles"
          context={
            filtering
              ? `L’index décrit le magasin entier, pas la sélection ci-dessus. Le montrer sous une liste filtrée reviendrait à répondre à une question que vous n’avez pas posée.`
              : `Les ${familyCount} familles où le magasin tient effectivement du stock, classées par profondeur sous leur rayon. Le nombre est celui des références en catalogue.`
          }
        />

        {filtering ? (
          <p className="enter e-text max-w-[62ch] text-small leading-[1.65] text-ink-2">
            <Link href="/catalogue#index" className="draw-under font-semibold text-accent hover:text-accent-ink">
              Ouvrir l’index des {familyCount} familles
            </Link>{' '}
            efface la sélection en cours. Pour rester dedans, le groupe « Famille » du panneau
            propose les familles les plus fournies de ce que vous avez déjà retenu.
          </p>
        ) : (
          <FamilyIndex departments={getCatalogIndex()} />
        )}
      </section>
    </>
  )
}
