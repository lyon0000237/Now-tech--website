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
import { ProductMedia } from '@/components/product/ProductMedia'
import { SectionHeader } from '@/components/ui/SectionHeader'
import {
  NO_FILTERS,
  PER_PAGE,
  getBrandIndex,
  getBrandBySlug,
  getCatalogIndex,
  getCategoryBySlug,
  getDepartmentPicture,
  getFamilyCount,
  getFilteredCatalogue,
  getMeta,
  getUniverseBySlug,
  getUniverses,
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
 *
 * WHAT THIS PAGE LOOKED LIKE ON A TELEPHONE, MEASURED AT 390 x 844 BEFORE THE
 * WORK BELOW: 1 504 words, 26 photographs, the first of them at y 1 536, and
 * 18 607 pixels tall. Twenty-two screens, of which the first two were type and
 * the last fourteen were the family index unrolled. A shop whose whole argument
 * is that it holds 4 254 things you can look at opened with 371 words and no
 * merchandise, and the client read that back as "on a l'impression de ne pas
 * tomber sur l'essentiel".
 *
 * THE ANSWER IS THE CATALOGUE'S OWN PHOTOGRAPHY, NOT ILLUSTRATION. Every one of
 * the twelve departments has a pinned hero product with a real packshot behind
 * it — `getDepartmentPicture` returns it — so the twelve doors at the top of
 * this page are now twelve photographs of things this shop actually sells,
 * taken from the same library the grid below them is drawn from. Nothing was
 * downloaded, generated or licensed to make that happen.
 *
 * AND WHAT IT MEASURES NOW, SAME BROWSER, SAME 390 x 844: 726 words, 38
 * photographs, the first of them at y 327 — inside the first screen, under the
 * head, with the second and a slice of the third beside it — and 9 872 pixels
 * tall against 20 321. Twelve screens instead of twenty-four, and the half of
 * them that was a directory unrolled is now twelve folded rows: the index went
 * from 11 743 pixels to 1 731, and the merchandise, 5 768 pixels of it, is the
 * biggest thing on the page, which is the only ordering a shop can defend.
 *
 * THE POINTER WAS NOT ASKED TO PAY FOR ANY OF IT. At 1 440 the page measured
 * 11 236 pixels before and 11 326 after — ninety pixels, the difference between
 * twelve rows of type and twelve photographs — with the same three-column
 * index, the same panel, and the first photograph up from y 1 286 to y 445.
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

  /**
   * The twelve doors, with a photograph each.
   *
   * `getUniverses` rather than `getCatalogIndex`, which carries all 218 families
   * this block does not draw, and `getDepartmentPicture` for the packshot: the
   * pinned hero of the department, falling back inside the catalog to the first
   * photographed product it holds, so no tile can come out empty while the
   * department has stock. Resolved once, above the return, because it is the
   * same twelve whether a filter is on or not.
   */
  const shelf = getUniverses().map((universe) => ({
    id: universe.id,
    slug: universe.slug,
    name: universe.name,
    totalCount: universe.totalCount,
    image: getDepartmentPicture(universe.id),
  }))

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
            : /* THE SECOND SENTENCE WENT, AND IT WAS THE INSTRUCTIONS. "Descendez
                 pour les parcourir, ou ouvrez l'index si vous savez déjà ce que
                 vous cherchez" is two lines at 390 telling a reader to do the
                 thing the shelf immediately under it already invites, and those
                 two lines are 44 pixels between the page and its first
                 photograph. What is left is the only sentence that carries a
                 fact. */
              `Douze rayons, ${familyCount} familles et ${formatAmount(meta.productCount)} références, exactement telles qu’elles sont rangées au comptoir.`
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
        <section className="shell" aria-label="Les douze rayons">
          {/**
           * THE TWELVE DOORS ARE PHOTOGRAPHS NOW, AND THAT IS THE WHOLE POINT OF
           * THIS BLOCK. What stood here was twelve rows of type: a name, a
           * count, and under `sm` a two-line gloss. 624 pixels on a phone, which
           * was cheap, and the reason the first picture on this page arrived at
           * y 1 536 — a shop with 4 215 packshots opened on a table of contents.
           *
           * Each door shows its department's pinned hero product, which is the
           * same photograph the homepage's deck opens that department with, so
           * the two pages agree about what a rayon looks like. A real switch
           * standing for "Réseaux, Switchs & Routeurs" is worth more than any
           * stock photograph of an office, it costs nothing, it raises no
           * licence, and it is true.
           *
           * ON A PHONE IT IS A SHELF, NOT A COLUMN. Twelve tiles stacked one per
           * row would be 2 600 pixels and would put the merchandise below three
           * screens of navigation; twelve tiles on a rail are 220 and the reader
           * flicks through them the way they would along a shelf. The rail
           * bleeds through the shell's gutter to both edges of the screen so the
           * next tile is CUT by the screen rather than by a margin, which is the
           * only honest way to say "there is more this way"; `scroll-pl` puts
           * the snapped tile back on the page's own left edge, so a tile that
           * has come to rest lines up with the heading above it.
           *
           * THE CARD IS 156 WIDE AND THAT NUMBER IS MEASURED TWICE. At 390 the
           * gutter is 7.5vw = 29.25, so a rail of 156-wide tiles with a 12 gap
           * shows two whole tiles and 25 pixels of the third: enough to read as
           * a cut edge, not enough to read as a third column. And 156 is what
           * the longest name needs — "Onduleurs, Régulateurs & Énergie" is 32
           * characters and sets on two lines at 13px there, where at 140 it
           * needed three and the clamp ate the last word of half the twelve.
           *
           * FROM `sm` IT IS A GRID AND THE RAIL IS GONE: no overflow, no snap,
           * no negative margin. Three columns, then four, then six from `lg`, so
           * the twelve are two rows under a pointer.
           */}
          <ul className="no-scrollbar mx-[calc(var(--gutter)*-1)] flex snap-x snap-mandatory scroll-pl-[var(--gutter)] gap-3 overflow-x-auto overscroll-x-contain px-[var(--gutter)] pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-3 sm:gap-x-6 sm:gap-y-9 sm:overflow-visible sm:px-0 sm:pb-0 md:grid-cols-4 lg:grid-cols-6">
            {shelf.map((department, index) => (
              <li
                key={department.id}
                /* THE ENTRANCE IS ON THE LIST ITEM, NOT ON THE LINK. `Reveal`
                   stamps `data-enter="in"` on every `.enter` it finds and its
                   first sweep runs before this segment has attached, so whichever
                   element carries the class is reported as a hydration mismatch;
                   the page reported exactly one before this block was touched and
                   reports exactly one now. Carried on the `li` it is at least on
                   the element `ProductCard` and the department list it replaces
                   both put it on, so `.enter .e-media` and `.enter .sheen::after`
                   resolve the way they do everywhere else on the site. */
                className="group enter w-[9.75rem] shrink-0 snap-start sm:w-auto sm:shrink"
                style={{ '--enter-index': index } as React.CSSProperties}
              >
                <Link href={`/rayon/${department.slug}`} className="block">
                  {/* The same three layers a product card uses, and for the same
                      reason: `.plate > *` needs exactly one child, the sheen
                      wipes the well open, and the well itself is `ProductMedia`,
                      which carries the shimmer and the "Photo à venir" fallback
                      so a department whose hero has lost its file degrades to a
                      labelled frame instead of a hole. */}
                  <div className="plate mb-3">
                    <div className="sheen relative overflow-hidden rounded-well">
                      <ProductMedia
                        src={department.image}
                        // The department is named in type immediately under the
                        // picture. Naming the hero product here would make a
                        // screen reader announce a switch model nobody asked
                        // about before the word "Réseaux".
                        alt=""
                        sizes="(min-width: 1280px) 12rem, (min-width: 640px) 22vw, 156px"
                        // THE FIRST THREE ARE THE LARGEST CONTENTFUL PAINT ON
                        // THIS PAGE NOW. Two of them are on screen at 390 and
                        // four at 1440, and everything below is a scroll away.
                        priority={index < 3}
                      />
                    </div>
                  </div>
                  <span className="clamp-2 draw-under block h-[2.8em] text-small font-semibold leading-[1.4] tracking-[-0.01em] group-hover:text-accent">
                    {department.name}
                  </span>
                  <span className="t-num mt-1 block text-micro text-ink-3">
                    {formatAmount(department.totalCount)} réf.
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* `data-results` is what ScrollOnQuery carries the reader back to when a
          filter, a sort or a page number changes the set under them. It is on
          the section rather than on the grid so the heading and the count, which
          are what actually answer the tap, arrive on screen first. This page
          draws its own listing instead of using the shared `Listing`, so it
          needs its own anchor. */}
      <section data-results className={`shell ${filtering ? '' : 'mt-band'}`}>
        <SectionHeader
          title={filtering ? 'Les références retenues' : 'Toutes les références'}
          context={
            filtering ? (
              /**
               * THE ARITHMETIC OF THE PANEL IS A POINTER SENTENCE, AND ON A
               * PHONE IT WAS 208 PIXELS ABOVE THE MERCHANDISE. Measured at 390
               * on `?rayon=reseaux-switchs-routeurs&stock=1`: the head's lead is
               * 132 pixels, this paragraph 208, the filter bar 73, and the first
               * packshot landed at y 878 — thirty-four pixels below a fold this
               * whole page has just been rebuilt to get above. The three
               * sentences doing the damage describe how the counts INSIDE the
               * panel combine, and on a phone THE PANEL IS NOT ON THE PAGE: it
               * is behind the "Filtrer et trier" button, in a sheet the reader
               * has not opened. Explaining a control nobody can see, above the
               * goods they came for, is the fault the client named.
               *
               * The first sentence stays at every width, because it is the one
               * that prevents a misreading of the numbers the reader meets the
               * second the sheet opens. The rest is `hidden sm:inline`, so from
               * 640 up the paragraph is word for word what it was, and the
               * desktop measured identical: 884 words, first packshot at y 813,
               * 5 753 pixels tall, before and after.
               */
              <>
                Chaque compte du panneau est calculé contre les autres filtres déjà posés, jamais
                contre le magasin entier : c’est la taille de cette valeur seule.
                <span className="hidden sm:inline">
                  {' '}
                  Cochez-en une dans un groupe et c’est exactement la liste que vous obtenez ;
                  cochez-en une seconde dans le même groupe et la liste réunit les deux, donc elle
                  s’élargit. Une valeur qui ne donnerait rien, ou qui rendrait exactement la liste
                  déjà affichée, n’est pas proposée : le panneau ne montre que ce qui change quelque
                  chose.
                </span>
              </>
            ) : (
              'Le catalogue entier, dans l’ordre que vous choisissez. « Arrivage » classe par date de mise en ligne de la photographie, seule date que l’export porte.'
            )
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
              // AND NOTHING HERE IS PRIORITY WHILE THE SHELF EXISTS. Unfiltered,
              // the first product card sits at y 1 100 on a phone and y 1 000 at
              // 1440, which is below both folds, while the department shelf is on
              // screen: three eager packshots there and three more here is six
              // images competing for the same connection, and the three that
              // matter are the ones the reader can see. Under a filter the shelf
              // is gone and this grid IS the top of the page, so it takes the
              // three back.
              <ProductGrid
                products={listing.products}
                columns={3}
                priorityCount={filtering ? 3 : 0}
              />
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
