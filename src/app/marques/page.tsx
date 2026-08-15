import type { Metadata } from 'next'
import Link from 'next/link'

import { Action } from '@/components/ui/Action'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { PageHeader } from '@/components/layout/PageHeader'
import { getBrandIndex, getMeta, type BrandEntry } from '@/lib/catalog'
import { formatAmount, formatCount } from '@/lib/format'

/**
 * The brand directory.
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
 * TWO READERS, ONE INDEX. Someone asking "vous avez du Mikrotik ?" needs to hit
 * one name out of 101; someone asking what this shop actually stocks needs to
 * see that HP has 544 references and eight brands have exactly one. Those wants
 * are opposite orderings of the same list, so the list is ordered two ways and
 * the reader picks, exactly as every listing on this site lets them pick. Both
 * orderings are URLs, not state: `?tri=nom` is shareable, back-buttonable and
 * renders without JavaScript, and the filter is a plain GET form for the same
 * reason. No client component, no hydration boundary, no 3.3 MB catalogue
 * anywhere near the browser.
 *
 * THE INDEX IS TYPE, NOT TILES, AND THAT IS THE WHOLE DESIGN PROBLEM. Marks
 * exist for 20 of the 101. A grid of logo cards would therefore be 81 empty
 * boxes, and any substitute drawn to fill them, an initial in a circle, a grey
 * rectangle, is a fabricated logo standing where a real one is missing. So the
 * index has no image slot at all: a brand is a name, a measure and a count, and
 * a brand with no mark is not a broken row. The 20 marks we do hold are gathered
 * once at the foot of the page, where they are a complete set on their own terms
 * rather than 20 survivors of a grid.
 *
 * THE MEASURE IS THE LEADER LINE. The rule between a name and its count is the
 * leader of a printed index; here its filled part is the brand's share of the
 * deepest one. It costs no vertical space, it is linear and unmanipulated, so a
 * single-reference brand renders as a faint tick and is meant to, and the exact
 * figure is always printed beside it.
 */

interface Params {
  searchParams: Promise<{ q?: string | string[]; tri?: string | string[] }>
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

/** Every control on this page is a link to another state of the same page. */
function href(query: string, order: 'nom' | null, hash = ''): string {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (order) params.set('tri', order)
  const search = params.toString()
  return `/marques${search ? `?${search}` : ''}${hash}`
}

/**
 * One line of the index.
 *
 * `truncate` on the name and not on the count: names run to "ZEBRA
 * TECHNOLOGIES" while the count is never more than three digits, and a row that
 * drops its number has lost the only thing that distinguishes it from the row
 * above.
 *
 * 44 PIXELS TALL ON A PHONE, 33.5 FROM MD UP. An index row is a real target
 * aimed at with a thumb, and 101 of them stacked at desktop density is a column
 * of misses. `py-3` alone measured 43.5, half a pixel under the floor and
 * therefore under it; `min-h-11` states the number instead of arriving at it by
 * addition. A pointer does not need the same room, and at three columns that
 * density is what lets the whole list be read at once.
 *
 * THE MEASURE IS CENTRED ON A PHONE AND SITS ON THE BASELINE FROM MD UP. The
 * `-0.2em` lift is what puts a one-pixel rule on the baseline of a line of
 * text; in a row that is 44 tall rather than 33.5 the text is no longer at the
 * bottom of its box, so the lift stops being a correction and becomes a
 * displacement. `items-center` with no lift is the same rule in the same place
 * relative to the name it measures.
 */
function BrandRow({ brand, deepest }: { brand: BrandEntry; deepest: number }) {
  const share = deepest > 0 ? (brand.productCount / deepest) * 100 : 0
  return (
    <Link
      href={`/marque/${brand.slug}`}
      className="group flex min-h-11 items-center gap-3 py-2 text-small tracking-[0.01em] transition-colors duration-[var(--t-fast)] hover:text-accent md:min-h-0 md:items-baseline md:py-[0.4375rem]"
    >
      <span className="min-w-0 flex-1 truncate">{brand.name}</span>
      <span
        aria-hidden
        className="relative h-px min-w-6 flex-1 bg-rule md:translate-y-[-0.2em]"
      >
        <span
          className="absolute inset-y-0 left-0 bg-accent transition-colors duration-[var(--t-fast)] group-hover:bg-accent-ink"
          style={{ width: `${share}%` }}
        />
      </span>
      <span className="t-num text-micro text-ink-3 transition-colors duration-[var(--t-fast)] group-hover:text-ink-2">
        {formatAmount(brand.productCount)}
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
  const marked = brands.filter((brand) => brand.file !== null)
  const singles = brands.filter((brand) => brand.productCount === 1).length
  const shallowest = brands[brands.length - 1]

  const needle = fold(query)
  const found = needle ? brands.filter((brand) => fold(brand.name).includes(needle)) : brands
  const rows =
    order === 'nom' ? [...found].sort((a, b) => a.name.localeCompare(b.name, 'fr')) : found

  // A-Z is grouped under its initials. 25 letters carry the 101 names, so the
  // blocks are short and uneven, and CSS columns with `break-inside: avoid` is
  // the only layout that packs them without stranding a two-name letter beside
  // an empty column. Depth order is one flat run: ranking it and then cutting it
  // into 25 pieces would destroy the ranking.
  const letters = [...new Set(rows.map((brand) => brand.letter))].sort()

  return (
    <>
      <PageHeader
        title={`Les ${brands.length} marques que tient le magasin`}
        lead={`Le nom du fabricant n’est pas un champ de l’export : il y est rempli sur 14 lignes sur 7 116. Ces ${brands.length} marques ont été retrouvées à l’ingestion, en lisant les chemins de catégories et les titres de produits. C’est ce qui permet de comparer ici un portable ${deepest?.name ?? 'HP'} et un DELL dans une seule liste.`}
        aside={formatCount(brands.length, 'marque')}
      />

      {/* The three figures that say what kind of list this is: how much of the
          catalogue it covers, how far apart its two ends are, and how much of it
          we hold a drawn mark for. Set as a definition list because that is what
          it is, a figure and what the figure counts. */}
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
              figure: formatAmount(marked.length),
              body: `marques ont une marque graphique dans nos fichiers. Les ${brands.length - marked.length} autres sont des lignes de texte dans l’index, avec exactement le même compte.`,
            },
          ].map((item, index) => (
            <div
              key={item.figure}
              className="enter e-item border-t border-rule pt-5"
              style={{ '--enter-index': index } as React.CSSProperties}
            >
              <dt className="t-num text-title font-bold tracking-[-0.03em]">
                {item.figure}
              </dt>
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
          context={`Par profondeur de catalogue ou par ordre alphabétique, au choix. Le trait qui suit chaque nom est proportionnel à son compte, sur une échelle linéaire dont le maximum est ${deepest?.name ?? ''} avec ${formatAmount(deepest?.productCount ?? 0)} références.`}
        />

        {/* A plain GET form. The filter is a page, not a state: /marques?q=hik
            can be shared, bookmarked, reloaded and read with scripting off, and
            it costs the customer nothing on a phone.

            THE FIELD IS 56 TALL AND SET AT 16 PIXELS ON A PHONE, 48 AND 13 FROM
            MD UP. Two measured reasons, one each. Set at 13, iOS Safari zooms
            the page the instant the field takes focus and leaves it zoomed,
            which on a 101-name index is a page the reader then has to pan
            sideways to read; 16 is the threshold that stops it. And at `h-13`
            the submit button inside — the field is `items-stretch` with `m-1`
            around it — came out 42 tall, four pixels under the floor, on the
            one control that makes the form do anything. 56 puts it at 46. */}
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
          <p className="e-text t-num text-small text-ink-2">
            {query
              ? `${formatCount(rows.length, 'marque')} sur ${brands.length} pour « ${query} »`
              : `${formatCount(brands.length, 'marque')}, de ${formatAmount(deepest?.productCount ?? 0)} références à ${formatAmount(shallowest?.productCount ?? 0)}`}
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

        {rows.length === 0 ? (
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
        ) : order === 'nom' ? (
          <div className="enter columns-1 gap-x-12 sm:columns-2 lg:columns-3">
            {letters.map((letter) => (
              <section key={letter} className="mb-8 break-inside-avoid" aria-label={`Marques en ${letter}`}>
                <h3 className="t-label mb-2 border-b border-rule pb-1.5 text-ink-3">{letter}</h3>
                <ul>
                  {rows
                    .filter((brand) => brand.letter === letter)
                    .map((brand) => (
                      <li key={brand.slug}>
                        <BrandRow brand={brand} deepest={deepest?.productCount ?? 1} />
                      </li>
                    ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <ul className="enter columns-1 gap-x-12 sm:columns-2 lg:columns-3">
            {rows.map((brand) => (
              <li key={brand.slug} className="break-inside-avoid">
                <BrandRow brand={brand} deepest={deepest?.productCount ?? 1} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* The marks, gathered where they are a complete set instead of the 20
          filled cells of a 101-cell grid. Painted with the same mask mechanism
          the homepage wall uses: one SVG serves every state, the mark is the
          page's own ink at rest and takes its own colour under a pointer, which
          is the only way 20 logos stay a page rather than a paint chart. */}
      <section className="shell mt-band">
        <SectionHeader
          title="Les logos que nous tenons"
          context={`${formatCount(marked.length, 'marque')} sur ${brands.length} ${marked.length > 1 ? 'ont' : 'a'} une marque graphique dans nos fichiers, servie depuis notre propre serveur. Les ${brands.length - marked.length} autres sont des lignes de texte dans l’index ci-dessus : ne pas avoir de logo ici ne dit rien du stock.`}
          action={{ href: '#index', label: 'Revenir à l’index' }}
        />

        <div className="grid grid-cols-3 gap-x-8 gap-y-12 sm:grid-cols-4 lg:grid-cols-5">
          {marked.map((brand, index) => (
            <Link
              key={brand.slug}
              href={`/marque/${brand.slug}`}
              style={
                {
                  '--enter-index': index,
                  '--mark-hover': brand.hover,
                  '--mark-src': `url(/brands/${brand.file}.svg)`,
                } as React.CSSProperties
              }
              className="group enter e-item flex flex-col items-center gap-3.5"
            >
              {/* 3rem where the homepage rail draws 2. Every file in the set is
                  a 24x24 square, so `contain` makes the mark height-bound and a
                  wordmark like SAMSUNG or PANASONIC ends up drawn across a
                  fraction of that square: at 32px it is a smudge. This page is
                  the one place the marks are the subject, so they get the height
                  that makes them legible. */}
              <span aria-hidden className="brand-mark" style={{ height: '3rem' }} />
              <span className="flex flex-col items-center gap-1 text-center">
                <span className="text-micro font-semibold tracking-[0.02em] text-ink-2 transition-colors duration-[var(--t-fast)] group-hover:text-ink">
                  {brand.name}
                </span>
                <span className="t-num text-micro text-ink-3">
                  {formatCount(brand.productCount, 'réf.', 'réf.')}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
