import type { Metadata } from 'next'
import Link from 'next/link'

import { Pager } from '@/components/catalog/Pager'
import { Action } from '@/components/ui/Action'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { PageHeader } from '@/components/layout/PageHeader'
import { getBrandIndex, getMeta, type BrandEntry } from '@/lib/catalog'
import { formatAmount, formatCount } from '@/lib/format'

/**
 * The brand directory: ONE index, in tiles, paginated.
 *
 * WHAT THIS LIST IS, BEFORE ANYTHING ELSE. The WooCommerce export carries no
 * brand taxonomy: the column exists and is filled on 14 rows out of 7 116. The
 * 101 names below were recovered at ingest by reading category paths and product
 * titles, which is what makes it possible to hold an HP laptop and a Dell one in
 * a single list, something the current site cannot do. The page says so out
 * loud, because a wall of manufacturer names on a retailer's site is normally
 * read as a claim of distribution, and this one is not one. Nothing here is a
 * partnership, an official distribution or a certification. It is an inventory
 * fact: 3 042 of the 4 254 references carry a recovered brand, and each name
 * opens the same query a customer could run themselves.
 *
 * THERE USED TO BE TWO LISTS AND NOW THERE IS ONE. The page carried a text
 * index of 101 names and, at its foot, a separate wall titled "Les logos que
 * nous tenons" holding the 33 brands we have a drawn mark for. Two surfaces for
 * one set is two places to look for the same name, and the second one quietly
 * ranked 33 brands above the other 68 for a reason that has nothing to do with
 * the shop: whether Simple Icons still ships the file. The wall is gone. Its
 * composition, a grid of tiles rather than a column of rows, is what the index
 * is now built in.
 *
 * ONE TILE IN THREE CARRIES A MARK, AND THAT IS THE WHOLE DESIGN PROBLEM.
 * Marks exist for 33 of the 101 and never will for the other 68: the names were
 * checked one by one against Simple Icons' index, 3 453 entries, and 67 are not
 * in it. Simple Icons dropped most non-free marks in 2024, so Canon, Logitech,
 * Microsoft, Philips, Xerox, Brother, SanDisk, Western Digital, Hisense, TCL,
 * BenQ, Transcend, Ricoh, Legrand, Eaton, Tenda, D-Link, APC, HPE and HIKVISION
 * are absent, and HIKVISION is 266 references, the second deepest brand in the
 * shop. Nothing may be drawn in their place: an initial in a circle or a grey
 * rectangle is a fabricated logo standing exactly where a real one is missing.
 *
 * SO THE TILE IS A NAME AND A COUNT, AND THE MARK IS A STAMP IN ITS CORNER.
 * The inversion is the answer. A logo grid with holes fails because the image
 * is the object the eye scans and two thirds of the objects are missing; here
 * the object is the name, set in the page's own type at 18px on a phone and
 * 18.72px at 1440, identical in kind and position in all 101 tiles, and the mark
 * rides in the bottom corner where a maker's stamp goes. A corner that is empty
 * on 68 tiles is not a hole, because nothing above it depended on it: the top
 * rule, the name, the count and the department all land at the same place with
 * or without it. The page also says the ratio in figures, three lines up, so a
 * reader who notices the unevenness is told what it means rather than left to
 * guess it means stock.
 *
 * WHY THE STAMP IS 40 PIXELS AND NOT 48. Every file in the set is a 24x24
 * square, so `contain` binds the mark to the box and a wordmark like PANASONIC,
 * 6.25 wide for 1 tall inside its file, is drawn across 40 by 6.4 of it. The old
 * wall answered with 48, which multiplied whatever the file already painted, and
 * the heaviest files paint a great deal: the ink measurement that decides which
 * ones are cut back to 30 is written out over the constant below. At 48 they
 * came out as black slabs beside every wordmark, which is the audit finding this
 * page was rebuilt to answer.
 *
 * THE LEADER LINE IS GONE, AND IT WAS MEASURED BEFORE IT WENT. Each row used to
 * end in a rule whose filled part was the brand's share of the deepest one.
 * Measured at 1440 on the live page: the rule is 165px, and on 93 of the 101
 * rows the filled part came out under 20px, on 51 rows under 4px and on 14 rows
 * under one whole pixel. A scale on which nine tenths of the population is a
 * tick indistinguishable from every other tick is not a measure, it is texture.
 * Worse, the rule was `flex-1` sharing its row with the count, so a one-digit
 * count and a three-digit one left it 172.3px and 165px: three different leader
 * lengths in one column, and a leader that does not align across rows is the one
 * thing a leader cannot do. The exact figure was always printed next to it, and
 * that figure is now the whole measure, in tabular figures, plus the department
 * the brand actually sits in, which is real data the old rule never showed.
 *
 * TWO READERS, ONE INDEX. Someone asking "vous avez du Mikrotik ?" needs to hit
 * one name out of 101; someone asking what this shop actually stocks needs to
 * see that HP has 544 references and eight brands have exactly one. Those wants
 * are opposite orderings of the same list, so the list is ordered two ways and
 * the reader picks. Both orderings are URLs, not state: `?tri=nom` is shareable,
 * back-buttonable and renders without JavaScript, the filter is a plain GET form
 * for the same reason, and so is the page number. No client component, no
 * hydration boundary, no 3.3 MB catalogue anywhere near the browser.
 */

interface Params {
  searchParams: Promise<{
    q?: string | string[]
    tri?: string | string[]
    page?: string | string[]
  }>
}

/**
 * 36 tiles a page: 101 brands in three pages of 36, 36 and 29.
 *
 * Not the catalogue's 24. A brand index is scanned, not shopped, and 24 would
 * cut 101 names into five pages whose last one holds five tiles. 36 is also the
 * only round number that divides by 2, 3 and 4, which are the three column
 * counts this grid runs at, so no page but the last ever ends on a ragged row.
 */
const PER_PAGE = 36

/**
 * The mark files that outweigh the set, and the measured rule that picks them.
 *
 * MEASURED, NOT JUDGED, AND RE-RUNNABLE. Every file in `public/brands` is a
 * 24x24 square painted with `mask-size: contain` inside a box of one size, so
 * the only thing deciding how much ink lands in a tile is the share of that
 * 24x24 box the artwork paints. Each of the 33 was rasterised at 200x200 in the
 * browser and every pixel over alpha 24 counted: the set runs from KASPERSKY at
 * 6.8 % to XIAOMI at 74.5 %, median INTEL 17.8 %.
 *
 * THE RULE IS TWO AND A HALF TIMES THE MEDIAN, 44.5 %, and it takes seven:
 * XIAOMI 74.5, MIKROTIK 56.8, HP 54.6, APPLE 52.3, LINKSYS 51.5, UBIQUITI 48.6,
 * TP-LINK 46.0. HUAWEI at 42.9 and FORTINET at 41.0 sit just under it and stay
 * where they are. A hand-picked four is what this replaces, and it was picked
 * wrong: it cut UBIQUITI while leaving APPLE and LINKSYS, both of which paint
 * more ink than UBIQUITI does.
 *
 * WHY 30 PIXELS AND NOT 40. Area falls with the square, so a 30-pixel box is
 * 900 square pixels against 1 600 and the ink drops to 56 % of what it was.
 * XIAOMI goes from 1 192 painted pixels to 671, and the heaviest mark left in
 * the grid becomes HUAWEI at 686, which is 2.4 times the median's 285 where it
 * used to be XIAOMI at 4.2 times. Nothing is ever enlarged: a mark can only be
 * too loud on this page, never too quiet, because the name set above it is what
 * identifies the brand and the mark is an ornament on a tile that already reads.
 *
 * LENOVO IS NOT IN THE LIST AND IT IS THE ONE THAT LOOKS LIKE IT SHOULD BE. Its
 * file is a filled bar with the word reversed out of it, so it reads darker than
 * anything near it, but it paints 28.8 % of the box, 460 square pixels, 1.6
 * times the median and well inside the range the rest of the set lives in.
 * Shrinking it would not make it less of a bar, only a smaller one. The rule is
 * ink, because ink is the thing that unbalances a grid.
 *
 * Keyed by file name, because what is corrected is a property of the artwork and
 * not of the manufacturer.
 */
const DENSE_MARKS: ReadonlySet<string> = new Set([
  'xiaomi',
  'mikrotik',
  'hp',
  'apple',
  'linksys',
  'ubiquiti',
  'tplink',
])

/** The stamp box, in rem: 40 pixels, or 30 for a file that paints too much. */
function stampSize(file: string): string {
  return DENSE_MARKS.has(file) ? '1.875rem' : '2.5rem'
}

export async function generateMetadata(): Promise<Metadata> {
  const brands = getBrandIndex()
  const branded = brands.reduce((sum, brand) => sum + brand.productCount, 0)
  return {
    title: 'Les marques',
    description:
      `Les ${brands.length} marques présentes au catalogue NowTech Center, ` +
      `de ${brands[0]?.name ?? ''} à la référence unique. ` +
      `${formatAmount(branded)} références portent l’une d’elles, retrouvée dans les titres et les chemins de catégories.`,
  }
}

/** Accent and punctuation folded away, so « tp link » and « TP-LINK » meet. */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function readOne(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ''
}

/**
 * Every control on this page is a link to another state of the same page.
 *
 * `page` is deliberately absent: changing the ordering or clearing the filter
 * returns to the first page, and a helper that could not express page 7 is a
 * helper that cannot forget to reset it.
 */
function href(query: string, order: 'nom' | null, hash = ''): string {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (order) params.set('tri', order)
  const search = params.toString()
  return `/marques${search ? `?${search}` : ''}${hash}`
}

/**
 * One tile of the index.
 *
 * THE WHOLE TILE IS THE TARGET AND IT IS NEVER UNDER 44 PIXELS. Measured at
 * 390: two columns of 158, the name on one or two lines, the foot row held at
 * 40 by `min-h-10`, which gives 108 and 128 tall. The foot is pinned with
 * `mt-auto` so that in a row of four tiles the counts sit on one line whatever
 * the names above them did, and the stamp sits on that same line.
 *
 * THE HAIRLINE ON TOP IS THE TILE. There is no box, no fill and no shadow: 36
 * bordered cards is a page of frames, and the rule alone states the column the
 * name starts at, which is all a grid of type needs. It takes the page's ink on
 * hover, which is the only thing on the tile that moves besides the name's
 * colour and the stamp's.
 */
function BrandTile({ brand, index }: { brand: BrandEntry; index: number }) {
  // One department is worth naming; six is worth counting. Both are facts of
  // the ingest, and between them they replace a rule that showed neither.
  const place =
    brand.departments.length === 1
      ? brand.departments[0]
      : brand.departments.length > 1
        ? formatCount(brand.departments.length, 'rayon')
        : ''

  return (
    <Link
      href={`/marque/${brand.slug}`}
      style={
        {
          '--enter-index': index % 8,
          ...(brand.file
            ? {
                '--mark-hover': brand.hover ?? undefined,
                '--mark-src': `url(/brands/${brand.file}.svg)`,
              }
            : null),
        } as React.CSSProperties
      }
      className="group enter e-item flex h-full flex-col border-t border-rule pt-4 transition-colors duration-[var(--t-fast)] hover:border-ink"
    >
      <span className="text-sub font-semibold leading-[1.2] tracking-[-0.02em] text-ink transition-colors duration-[var(--t-fast)] group-hover:text-accent">
        {brand.name}
      </span>

      <span className="mt-auto flex min-h-10 items-end justify-between gap-3 pt-6">
        <span className="flex min-w-0 flex-col gap-1">
          <span className="t-num text-micro text-ink-2">
            {formatCount(brand.productCount, 'référence')}
          </span>
          {place ? <span className="clamp-1 text-micro text-ink-3">{place}</span> : null}
        </span>

        {/* The stamp. A real square box the size of the mark, because `contain`
            on a 24x24 file centres the mark in whatever it is given and a wide
            box would float it away from the corner it belongs in. Height and
            width come from one number so the two can never drift apart. */}
        {brand.file ? (
          <span
            aria-hidden
            className="block shrink-0"
            style={{ width: stampSize(brand.file), height: stampSize(brand.file) }}
          >
            <span className="brand-mark" style={{ height: stampSize(brand.file) }} />
          </span>
        ) : null}
      </span>
    </Link>
  )
}

export default async function MarquesPage({ searchParams }: Params) {
  const params = await searchParams
  const query = readOne(params.q)
  const order = readOne(params.tri) === 'nom' ? 'nom' : 'profondeur'

  const brands = getBrandIndex()
  const meta = getMeta()

  const deepest = brands[0]
  const branded = brands.reduce((sum, brand) => sum + brand.productCount, 0)
  const marked = brands.filter((brand) => brand.file !== null).length
  const singles = brands.filter((brand) => brand.productCount === 1).length
  const shallowest = brands[brands.length - 1]

  const needle = fold(query)
  const found = needle ? brands.filter((brand) => fold(brand.name).includes(needle)) : brands
  const sorted =
    order === 'nom' ? [...found].sort((a, b) => a.name.localeCompare(b.name, 'fr')) : found

  // A page number out of range is clamped rather than 404ed: it arrives from a
  // stale link or a hand-edited address, and the reader wants the list.
  const pages = Math.max(1, Math.ceil(sorted.length / PER_PAGE))
  const raw = Number(readOne(params.page))
  const page = Number.isFinite(raw) && raw >= 1 ? Math.min(Math.floor(raw), pages) : 1
  const shown = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  /**
   * The running head, in the terms of whatever ordering is on.
   *
   * A dictionary prints the first and last word of the spread at the top of it,
   * and a paginated index needs the same thing for the same reason: the reader
   * has to know whether the name they want is on this page before they read 36
   * tiles. It is also what replaces the old letter grouping. That grouping does
   * not survive a tile grid: 25 initials carry the 101 names, an average of four
   * names each, so in a four-column grid a letter band would fall on every
   * single row and the page would be more band than index.
   */
  const edge = shown[shown.length - 1]
  const head =
    shown.length === 0 || !edge
      ? ''
      : order === 'nom'
        ? `de ${shown[0]?.name} à ${edge.name}`
        : `de ${formatAmount(shown[0]?.productCount ?? 0)} à ${formatAmount(edge.productCount)} références`

  const pagerQuery: Record<string, string> = {}
  if (query) pagerQuery.q = query
  if (order === 'nom') pagerQuery.tri = 'nom'

  return (
    <>
      <PageHeader
        title={`Les ${brands.length} marques que tient le magasin`}
        lead={`Le nom du fabricant n’est pas un champ de l’export : il y est rempli sur 14 lignes sur 7 116. Ces ${brands.length} marques ont été retrouvées à l’ingestion, en lisant les chemins de catégories et les titres de produits. C’est ce qui permet de comparer ici un portable ${deepest?.name ?? 'HP'} et un DELL dans une seule liste.`}
        aside={formatCount(brands.length, 'marque')}
      />

      {/* The three figures that say what kind of list this is: how much of the
          catalogue it covers, how far apart its two ends are, and how many of
          its tiles carry a drawn mark. The third one is not housekeeping. It is
          the sentence that stops an uneven grid from being read as a statement
          about the shop, and it has to be printed above the grid, not under it. */}
      <section className="shell" aria-label="Ce que couvre cette liste">
        <dl className="grid gap-x-12 gap-y-8 sm:grid-cols-3">
          {[
            {
              figure: formatAmount(branded),
              body: `références sur ${formatAmount(meta.productCount)} portent une marque retrouvée. Les ${formatAmount(meta.productCount - branded)} autres n’en portent aucune, et ne sont dans aucune de ces listes.`,
            },
            {
              figure: formatAmount(deepest?.productCount ?? 0),
              body: `références derrière ${deepest?.name ?? ''}, la marque la plus fournie. ${formatCount(singles, 'marque')} n’en ${singles > 1 ? 'ont' : 'a'} qu’une seule : le bas de la liste est aussi vrai que le haut.`,
            },
            {
              figure: `${formatAmount(marked)} sur ${brands.length}`,
              body: `tuiles portent un logo, parce que nous n’avons le fichier que pour celles-là. Les ${brands.length - marked} autres portent le même nom et le même compte : un coin vide ne dit rien du stock.`,
            },
          ].map((item, index) => (
            <div
              key={item.figure}
              className="enter e-item border-t border-rule pt-5"
              style={{ '--enter-index': index } as React.CSSProperties}
            >
              <dt className="t-num text-title font-bold tracking-[-0.03em]">{item.figure}</dt>
              <dd className="mt-2 max-w-[38ch] text-small leading-[1.6] text-ink-3">{item.body}</dd>
            </div>
          ))}
        </dl>

        <p className="enter e-text mt-stack max-w-[74ch] text-small leading-[1.65] text-ink-2">
          Cette liste dit ce qui est en rayon, pas qui nous représentons : elle ne revendique ni
          distribution officielle, ni partenariat, ni certification. Chaque nom ouvre la même
          requête que vous pouvez refaire vous-même, tous les produits dont le titre ou le chemin de
          catégorie porte ce nom.
        </p>
      </section>

      {/* Every control on this page returns to `#index`, so where the anchor
          lands is where the page is read from. Measured at 360: the masthead
          pins at exactly 112 and `scroll-mt-28` is 112, which put the heading's
          box flush against the green bar with nothing between them. 128 leaves
          the 16-pixel gutter the rest of the page is set on; the pointer keeps
          the 112 it was measured with. */}
      <section id="index" className="shell mt-band scroll-mt-32 lg:scroll-mt-28">
        <SectionHeader
          title="L’index des marques"
          context={`Les ${brands.length} noms, par profondeur de catalogue ou par ordre alphabétique, ${formatCount(PER_PAGE, 'tuile')} par page. Chaque tuile porte le nom, le nombre de références derrière ce nom et le rayon où il se trouve ; les ${marked} dont nous avons le fichier portent aussi leur logo, dans le coin.`}
        />

        {/* A plain GET form. The filter is a page, not a state: /marques?q=hik
            can be shared, bookmarked, reloaded and read with scripting off, and
            it costs the customer nothing on a phone.

            THE FIELD IS 56 TALL AND SET AT 16 PIXELS ON A PHONE, 48 AND 13 FROM
            MD UP. Two measured reasons, one each. Set at 13, iOS Safari zooms
            the page the instant the field takes focus and leaves it zoomed,
            which on a 101-name index is a page the reader then has to pan
            sideways to read; 16 is the threshold that stops it. And at `h-13`
            the submit button inside, the field is `items-stretch` with `m-1`
            around it, came out 42 tall, four pixels under the floor, on the one
            control that makes the form do anything. 56 puts it at 46. */}
        <form
          action="/marques#index"
          method="get"
          className="enter e-item mb-stack flex flex-wrap items-center gap-x-5 gap-y-3"
        >
          {order === 'nom' ? <input type="hidden" name="tri" value="nom" /> : null}
          <label htmlFor="brand-filter" className="t-label text-ink-3">
            Trouver une marque
          </label>
          <div className="field flex h-14 w-full max-w-[24rem] items-stretch rounded-control border border-rule-2 bg-space transition-[border-color,box-shadow] duration-[var(--t-fast)] md:h-12">
            <input
              id="brand-filter"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="hik, tp, ubi…"
              className="min-w-0 flex-1 bg-transparent px-4 text-[1rem] text-ink outline-none placeholder:text-ink-3 md:text-small"
            />
            <button
              type="submit"
              className="press m-1 flex shrink-0 items-center rounded-[6px] bg-accent px-5 text-small font-semibold text-paper transition-colors duration-[var(--t-fast)] hover:bg-accent-ink"
            >
              Filtrer
            </button>
          </div>
          {query ? (
            <Link
              href={href('', order === 'nom' ? 'nom' : null, '#index')}
              className="draw-under inline-flex min-h-11 items-center py-1 text-small text-ink-2 hover:text-accent md:inline md:min-h-0"
            >
              Revoir les {brands.length}
            </Link>
          ) : null}
        </form>

        <div className="enter mb-stack flex flex-wrap items-center justify-between gap-x-10 gap-y-4 border-b border-rule pb-5">
          <p className="e-text text-small text-ink-2">
            <span className="t-num">
              {query
                ? `${formatCount(sorted.length, 'marque')} sur ${brands.length} pour « ${query} »`
                : `${formatCount(brands.length, 'marque')}, de ${formatAmount(deepest?.productCount ?? 0)} références à ${formatAmount(shallowest?.productCount ?? 0)}`}
            </span>
            {pages > 1 && head ? (
              <span className="t-num block text-ink-3">{`Page ${page} sur ${pages}, ${head}`}</span>
            ) : null}
          </p>

          <div className="e-item flex flex-wrap items-center gap-x-2 gap-y-2">
            <span id="order-label" className="t-label mr-1 hidden text-ink-3 sm:inline">
              Classer
            </span>
            <ul aria-labelledby="order-label" className="flex flex-wrap gap-2">
              {(
                [
                  { key: 'profondeur', label: 'Par profondeur', param: null },
                  { key: 'nom', label: 'De A à Z', param: 'nom' },
                ] as const
              ).map((option) => {
                const active = option.key === order
                return (
                  <li key={option.key}>
                    <Link
                      href={href(query, option.param, '#index')}
                      scroll={false}
                      aria-current={active ? 'true' : undefined}
                      className={`press inline-flex min-h-11 items-center rounded-pill px-5 py-2 text-small whitespace-nowrap transition-colors duration-[var(--t-fast)] md:min-h-0 ${
                        active
                          ? 'bg-accent font-semibold text-paper'
                          : 'border border-rule text-ink-2 hover:border-ink hover:text-ink'
                      }`}
                    >
                      {option.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        {shown.length === 0 ? (
          <div className="enter max-w-[62ch]">
            <p className="text-body text-ink">Aucune marque ne contient « {query} ».</p>
            <p className="e-text mt-3 text-small leading-[1.65] text-ink-2">
              Le nom peut être partiel : « hik » trouve HIKVISION, « tp » trouve TP-LINK. Si vous
              cherchez un produit plutôt qu’un fabricant, il est dans le catalogue, qui se parcourt
              rayon par rayon.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Action href="/catalogue" variant="secondary">
                Ouvrir le catalogue
              </Action>
              <Link href="/marques" className="draw-under text-small text-ink-2 hover:text-accent">
                Voir les {brands.length} marques
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* TWO ON A PHONE, THREE FROM SM, FOUR FROM LG, and the tile is 158
                wide at 390, which is what the longest name in the set, WESTERN
                DIGITAL, needs to break on two lines rather than three. The
                vertical gap is larger than the horizontal one on purpose: the
                top rule is the tile, and rules that sit too close to the foot of
                the tile above read as an underline for it. */}
            <ul className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3 sm:gap-x-8 lg:grid-cols-4">
              {shown.map((brand, index) => (
                <li key={brand.slug}>
                  <BrandTile brand={brand} index={index} />
                </li>
              ))}
            </ul>

            {/* The pager writes `?page=`, keeps `q` and `tri`, and lands the
                reader at the top of the page rather than back on the grid: it
                builds its own hrefs and has no room for a fragment. On a
                three-page index that is a fair trade, and it puts the sentence
                that says what this list is back in front of a reader who is
                about to read 36 more manufacturer names. */}
            <Pager basePath="/marques" query={pagerQuery} page={page} pages={pages} />
          </>
        )}
      </section>
    </>
  )
}
