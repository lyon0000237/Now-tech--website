import Link from 'next/link'

import { IconClose, IconChevronDown, IconChevronRight } from '@/components/brand/Icons'
import {
  NO_FILTERS,
  SORTS,
  getBrandBySlug,
  getCategoryBySlug,
  getUniverseBySlug,
  type CatalogFacets,
  type FacetValue,
} from '@/lib/catalog'
import { formatAmount, formatCount, formatPrice } from '@/lib/format'
import {
  catalogueHref,
  catalogueQuery,
  toggleFacet,
  toggleGroup,
  withPrice,
  type CatalogueState,
  type FacetGroup,
} from '@/lib/params'

/**
 * The catalogue's filter panel.
 *
 * EVERY CONTROL IN HERE IS A LINK TO ANOTHER ADDRESS OF THE SAME PAGE, AND THAT
 * IS THE WHOLE ARCHITECTURE. No client component, no hydration boundary, no
 * local state, and the 3.3 MB catalogue never goes near the browser. What it buys
 * is not purity: it is that the back button walks the reader back through their
 * own filtering one step at a time, that every state can be copied out of the
 * address bar into a WhatsApp message, that a mid-range Android with a slow
 * connection renders the panel with the page instead of after it, and that the
 * whole thing keeps working with scripting off. A faceted panel built on state
 * would have had to reimplement all four of those, badly.
 *
 * THE COUNTS ARE THE POINT, AND THE COUNT IS THE SIZE OF ITS OWN VALUE. Every
 * one of them is computed against the other filters already posted, never
 * against the shop, so 544 beside HP is 544 HP references inside the current
 * selection. Check it as the only value of its group and 544 is exactly what the
 * grid renders. Check a SECOND brand and the grid renders the UNION, which is
 * larger than either number beside it: on `?marque=apple` the panel offers HP at
 * 544 and the two together give 551. That is the one thing the page used to get
 * wrong, and it got it wrong in words rather than in arithmetic — it promised
 * the count was the size of the next grid. The count is the size of the value.
 * The promise is now made only where it holds, and the groups that can be
 * unioned say out loud that a second value widens the list.
 *
 * A filter panel without counts is a row of doors with no windows: the reader
 * opens one to find out whether it was worth opening, and half the time it was
 * not. Which is why NO ROW ON THIS PANEL LEADS TO AN EMPTY GRID. The three slug
 * groups drop their empty values upstream; the price ladder and the three
 * availability boxes are built here, were rendered whatever their count, and are
 * now dropped by the same rule. Measured on `?marque=apple`: four controls with
 * a bare "0" beside them, all four clickable, all four landing on "aucune
 * référence". The panel never disables a row, because there are no dead rows
 * left to disable.
 *
 * WHY SORTING LIVES IN HERE. It is not a filter, and it is in the panel anyway.
 * `SortBar` builds its links as `basePath?tri=…`, which cannot carry a query
 * string that already exists, so on a filtered catalogue it would silently drop
 * every filter the reader had set: choosing "Prix croissant" would have thrown
 * away their selection. Rather than draw a second bar that looks like the first,
 * the four orderings join the controls in the panel, where they gain something:
 * the panel is pinned, so on page 40 of a listing the ordering is still one click
 * away, which it never was at the top of the page.
 *
 * THE SHAPE ON A PHONE IS A DIFFERENT SHAPE, NOT A NARROWER ONE. A column pinned
 * to the right does not exist at 390px: the same markup becomes a full-screen
 * sheet, opened by `?filtres=1` and closed by removing it. That the sheet is a
 * URL and not a piece of state is what makes its two exits work without a line of
 * JavaScript — "Fermer" and "Voir les 231 références" are the same link — and
 * what makes the phone's back button close it, which is the gesture every reader
 * tries first.
 */

/* -------------------------------------------------------------------------- */
/* The price ladder                                                           */
/* -------------------------------------------------------------------------- */

export interface PriceStep {
  readonly label: string
  readonly min: number | null
  /** Inclusive, and one franc below the next step's floor. */
  readonly max: number | null
}

/**
 * Five named steps, and no slider.
 *
 * THE CATALOGUE RUNS FROM 100 FCFA TO 11 800 000, WHICH IS FIVE ORDERS OF
 * MAGNITUDE, and that single fact kills the control every shop reaches for
 * first. On a linear track the median price, 80 000 FCFA, sits at 0.7% of the
 * way along: nine tenths of the references are crushed into the first six per
 * cent of the handle's travel, so the gesture that picks between a 12 000 FCFA
 * patch cable and a 45 000 FCFA switch is two pixels wide. A logarithmic track
 * fixes the crowding and replaces it with a worse problem — the reader can no
 * longer tell where the handle is, because the only honest tick labels are
 * 1 000, 10 000, 100 000, 1 000 000, and nobody reads their budget that way.
 * Both need a pointer, both need JavaScript, and both must round the value they
 * hand back.
 *
 * The steps below are the log scale, written out in the round numbers a
 * Cameroonian buyer actually names, roughly tripling at each step. Read off the
 * unfiltered panel they hold 1 562 / 1 139 / 979 / 426 / 148, which sums to the
 * 4 254 of the catalogue — the first step carries the 8 references the export
 * leaves unpriced — and is as even a split as five human-readable boundaries can
 * give. Every one of them is one click, one tap target and one shareable URL.
 *
 * FIVE IS THE CEILING, NOT THE COUNT. Under a filter the ladder is only the
 * steps that still hold something: `?marque=apple` is seven references, all of
 * them above 500 000, so the panel offers two steps and not five. See the note
 * over `steps` in the panel for why the other three had to go.
 *
 * The two fields underneath are the escape hatch for the reader who has an exact
 * budget, and they are a plain GET form, so they work with scripting off.
 *
 * THE BOUNDS ARE EXCLUSIVE AT THE TOP, WHICH IS WHY THE URLs END IN 9. A
 * reference priced at exactly 150 000 belongs to one step, not two, or the five
 * counts stop adding up to the total and the panel is quietly lying about a
 * number a reader can check.
 */
export const PRICE_STEPS: readonly PriceStep[] = [
  { label: `Moins de ${formatPrice(50_000)}`, min: null, max: 49_999 },
  { label: `${formatAmount(50_000)} à ${formatPrice(150_000)}`, min: 50_000, max: 149_999 },
  { label: `${formatAmount(150_000)} à ${formatPrice(500_000)}`, min: 150_000, max: 499_999 },
  { label: `${formatAmount(500_000)} à ${formatPrice(1_500_000)}`, min: 500_000, max: 1_499_999 },
  { label: `Plus de ${formatPrice(1_500_000)}`, min: 1_500_000, max: null },
]

export interface PriceBand extends PriceStep {
  readonly count: number
}

/* -------------------------------------------------------------------------- */
/* Labels                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The human name of a slug, resolved here rather than read off the facets.
 *
 * A selected value can be missing from its own facet list: the list is capped at
 * 24 and a value whose combination with the other filters gives nothing is
 * dropped from the tally altogether. Both cases are exactly when a reader most
 * needs to see the chip that lets them undo it, so the name comes from the
 * catalogue and never from the list being drawn.
 */
function facetLabel(group: FacetGroup, value: string): string {
  switch (group) {
    case 'rayon':
      return getUniverseBySlug(value)?.name ?? value
    case 'famille':
      return getCategoryBySlug(value)?.name ?? value
    case 'marque':
      return getBrandBySlug(value)?.name ?? value
  }
}

/** `50 000 à 300 000 FCFA`, and the two half-open forms of it. */
export function priceLabel(min: number | null, max: number | null): string {
  if (min !== null && max !== null) return `${formatAmount(min)} à ${formatPrice(max)}`
  if (min !== null) return `À partir de ${formatPrice(min)}`
  if (max !== null) return `Jusqu’à ${formatPrice(max)}`
  return 'Tous les prix'
}

const FLAGS = [
  {
    key: 'stock',
    label: 'En stock au comptoir',
    note: 'Disponible tout de suite, sans commande fournisseur.',
  },
  {
    key: 'remise',
    label: 'Remisé de 40 % ou plus',
    note: 'La remise est celle de l’export, prix barré contre prix payé.',
  },
  {
    key: 'photo',
    label: 'Avec photographie',
    note: 'Le fournisseur a livré une image du produit.',
  },
] as const satisfies readonly {
  key: 'stock' | 'remise' | 'photo'
  label: string
  note: string
}[]

/**
 * Six values, then a link.
 *
 * Twelve departments, twenty-four families and twenty-four brands stacked open
 * is 1 800 pixels of panel before the reader has read a single one of them.
 * Selected values are floated to the head of their own group upstream, so
 * folding never hides a control the reader has already used, and the fold is
 * itself in the URL, which is what stops it snapping shut on the next click —
 * the failure mode of every `<details>` in a page that navigates.
 */
const FOLD = 6

/* -------------------------------------------------------------------------- */
/* Parts                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * One value: a mark, a name, a count.
 *
 * A LINK WEARING A CHECKBOX, AND THE ACCESSIBLE NAME SAYS SO. The square is the
 * convention every shop uses and every reader recognises, but the control is a
 * navigation, so nothing here claims to be an input. What a screen reader hears
 * is the visible name, its count, and the verb — "HP, 544 références, retirer ce
 * filtre" — which carries the state the square carries visually.
 *
 * `widens` IS THE HALF OF THAT SENTENCE THAT USED TO BE A LIE. In a group where
 * something is already chosen, "ajouter ce filtre" beside 544 tells a reader
 * using a screen reader that they are about to arrive at 544 references, and
 * they are about to arrive at 551: values of one group are unioned, not
 * intersected. The visible note under the group heading carries this for a
 * reader who can see the panel; this carries it for one who cannot.
 *
 * 44 pixels tall on a phone, 34 from md up. The panel becomes a sheet under a
 * thumb at 390 and a pinned column under a pointer at 1440, and those are not the
 * same target.
 */
function Value({
  href,
  label,
  count,
  selected,
  widens = false,
}: {
  href: string
  label: string
  count: number
  selected: boolean
  /** Its group already holds a value, so checking this one enlarges the list. */
  widens?: boolean
}) {
  return (
    <Link
      href={href}
      scroll={false}
      title={label}
      aria-label={`${label}, ${formatCount(count, 'référence')}, ${
        selected
          ? 'retirer ce filtre'
          : widens
            ? 'ajouter ce filtre, la liste s’élargira'
            : 'ajouter ce filtre'
      }`}
      className="group flex min-h-11 items-center gap-3 py-1 text-small transition-colors duration-[var(--t-fast)] hover:text-accent md:min-h-[2.125rem]"
    >
      <span
        aria-hidden
        className={`grid size-4 shrink-0 place-items-center rounded-[3px] border transition-colors duration-[var(--t-fast)] ${
          selected ? 'border-accent bg-accent' : 'border-ink-3 group-hover:border-accent'
        }`}
      >
        {/* The mark is the fill itself. There is no tick glyph in the house set
            and inventing one here would be a second icon language on the site
            for a 10 x 10 square. The inner notch is what stops the filled state
            reading as a solid dot. */}
        <span
          className={`block size-1.5 rounded-[1px] ${selected ? 'bg-paper' : ''}`}
        />
      </span>

      <span className={`min-w-0 flex-1 truncate ${selected ? 'font-semibold text-ink' : 'text-ink-2'}`}>
        {label}
      </span>

      <span className="t-num shrink-0 text-micro text-ink-3">{formatAmount(count)}</span>
    </Link>
  )
}

/**
 * A group of values, folded to six, with its own heading.
 *
 * THE THREE SLUG GROUPS ARE THE ONLY PLACE ON THIS PANEL WHERE A SECOND CLICK
 * ENLARGES THE LIST, AND THE ONLY PLACE THE COUNTS NEEDED A SENTENCE. Rayon,
 * famille and marque are multi-valued, and multi-valued means UNION: two brands
 * is HP or Dell, never HP and Dell, because no reference carries two brands.
 * Everything else on the panel intersects — a price step replaces the bracket,
 * a checkbox is on or off — so for those the count beside a value IS the grid it
 * produces, and no note is drawn.
 *
 * WHY THE COUNTS STAY AS THEY ARE AND THE WORDS MOVE INSTEAD. The honest
 * alternative was to print, beside each unchecked value, the total the reader
 * would land on: 24 brands, 24 families and 12 departments re-queried against the
 * union, sixty more passes over 4 254 products on every request. It buys a
 * column of numbers that are worse. They stop being comparable, because they all
 * carry the same base total and differ only in the tail; the "most references
 * first" ordering the panel is sorted on becomes meaningless; and beside a
 * chosen HP at 544 the reader would read 551, 553, 549 down the list and learn
 * nothing about Dell at all. The size of a value is the number that describes
 * the shop, is stable, is comparable, and is exactly the grid whenever the
 * reader checks one thing — which is what almost every reader does. So the count
 * keeps its meaning and the panel states it, once, in the group where the
 * second click changes what it means.
 */
function Group({
  title,
  group,
  values,
  state,
  more,
}: {
  title: string
  group: FacetGroup
  values: readonly FacetValue[]
  state: CatalogueState
  /** Where the values that did not fit in 24 can still be found. */
  more?: { href: string; label: string }
}) {
  if (values.length === 0) return null

  const open = state.open.includes(group)
  const shown = open ? values : values.slice(0, FOLD)
  const chosen = values.filter((value) => value.selected).length

  return (
    <section className="border-t border-rule pt-5" aria-labelledby={`facet-${group}`}>
      <h4 id={`facet-${group}`} className="t-label mb-2 flex items-baseline gap-2 text-ink">
        {title}
        {chosen > 0 ? <span className="t-num font-normal text-accent">{chosen}</span> : null}
      </h4>

      {/* Drawn only once a value is chosen and something is left to add, because
          until then there is no ambiguity to resolve: with the group empty, the
          count beside a value is the grid that value gives. */}
      {chosen > 0 && chosen < values.length ? (
        <p className="-mt-0.5 mb-2.5 text-micro leading-[1.55] text-ink-3">
          Une seconde valeur élargit la liste au lieu de la réduire : elle réunit les deux. Le
          nombre est la taille de chaque valeur, pas le total après le second choix.
        </p>
      ) : null}

      <ul>
        {shown.map((value) => (
          <li key={value.value}>
            <Value
              href={catalogueHref({
                ...state,
                filters: toggleFacet(state.filters, group, value.value),
              })}
              label={value.label}
              count={value.count}
              selected={value.selected}
              widens={chosen > 0}
            />
          </li>
        ))}
      </ul>

      {values.length > FOLD ? (
        <Link
          href={catalogueHref({ ...state, open: toggleGroup(state.open, group) })}
          scroll={false}
          className="press mt-1 inline-flex min-h-11 items-center gap-1.5 text-small text-accent hover:text-accent-ink md:min-h-0 md:py-1"
        >
          {open ? 'Replier' : `Voir les ${values.length}`}
          <IconChevronDown
            className={`text-[0.9375rem] transition-transform duration-[var(--t-fast)] ${open ? 'rotate-180' : ''}`}
          />
        </Link>
      ) : null}

      {/* The list is capped upstream at 24. Saying where the other 77 brands or
          194 families are is the difference between a bounded list and a list
          that quietly stops. */}
      {more && values.length >= 24 ? (
        <p className="mt-2 text-micro leading-[1.55] text-ink-3">
          Les 24 plus fournies de cette sélection.{' '}
          <Link href={more.href} className="draw-under text-accent hover:text-accent-ink">
            {more.label}
          </Link>
        </p>
      ) : null}
    </section>
  )
}

/** A removable summary of one active filter. */
function Chip({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        scroll={false}
        aria-label={`Retirer le filtre ${label}`}
        className="press inline-flex min-h-11 items-center gap-2 rounded-pill border border-rule-2 bg-space py-1.5 pr-2.5 pl-3.5 text-small text-ink transition-colors duration-[var(--t-fast)] hover:border-ink md:min-h-0"
      >
        <span className="max-w-[14rem] truncate">{label}</span>
        <IconClose className="shrink-0 text-[0.9375rem] text-ink-3" />
      </Link>
    </li>
  )
}

/* -------------------------------------------------------------------------- */
/* The panel                                                                  */
/* -------------------------------------------------------------------------- */

export function FilterPanel({
  state,
  facets,
  bands,
  total,
  active,
  familyCount,
  brandCount,
}: {
  state: CatalogueState
  facets: CatalogFacets
  bands: readonly PriceBand[]
  /** References the current filters give, printed on the sheet's way out. */
  total: number
  /** Filters set, counted as the reader can count them: see `countFilters`. */
  active: number
  familyCount: number
  brandCount: number
}) {
  const { filters } = state
  const cleared = catalogueHref({ ...state, filters: NO_FILTERS })
  const closed = catalogueHref({ ...state, sheet: false }, '#resultats')

  /**
   * The ladder, and the boxes, reduced to what actually leads somewhere.
   *
   * A CONTROL THAT LANDS ON AN EMPTY GRID IS A CONTROL THAT LIES, and these two
   * groups were the last on the panel still drawing them. Rayon, famille and
   * marque have their empty values dropped in `getFilteredCatalogue` before they
   * ever reach this file; the five price steps and the three availability boxes
   * are assembled here from a fixed list, so they were rendered whatever their
   * count said. Measured on `?marque=apple` — seven references, all above
   * 500 000 FCFA, none discounted: the panel offered "Moins de 50 000 FCFA 0",
   * "50 000 à 150 000 FCFA 0", "150 000 à 500 000 FCFA 0" and "Remisé de 40 % ou
   * plus 0", four full-width tap targets whose only destination was the
   * dead-end screen. Now four rows shorter and every remaining row has stock
   * behind it.
   *
   * A SELECTED VALUE SURVIVES ITS OWN ZERO, which is the one exception and it is
   * not a nicety: the reader who checked "En stock" and emptied the grid needs
   * the box they checked still on screen to uncheck it. Its count reads 0 and
   * that is the truth of it.
   *
   * The ladder can only empty completely when nothing matches at any price, so
   * the price section keeps its two fields either way: it is the escape hatch,
   * and a reader standing on a dead end should still be able to widen their
   * bracket by hand.
   */
  const steps = bands.filter(
    (band) =>
      band.count > 0 || (filters.prixMin === band.min && filters.prixMax === band.max),
  )
  const flags = FLAGS.filter(
    (flag) => facets[flag.key].count > 0 || facets[flag.key].selected,
  )

  /* The price is one filter to the reader even when it is two bounds in the
     URL, so it is one chip and one removal. */
  const chips: { key: string; label: string; href: string }[] = []
  for (const group of ['rayon', 'famille', 'marque'] as const) {
    const key = group === 'rayon' ? 'rayons' : group === 'famille' ? 'familles' : 'marques'
    for (const value of filters[key]) {
      chips.push({
        key: `${group}-${value}`,
        label: facetLabel(group, value),
        href: catalogueHref({ ...state, filters: toggleFacet(filters, group, value) }),
      })
    }
  }
  if (filters.prixMin !== null || filters.prixMax !== null) {
    chips.push({
      key: 'prix',
      label: priceLabel(filters.prixMin, filters.prixMax),
      href: catalogueHref({ ...state, filters: withPrice(filters, null, null) }),
    })
  }
  for (const flag of FLAGS) {
    if (!filters[flag.key]) continue
    chips.push({
      key: flag.key,
      label: flag.label,
      href: catalogueHref({ ...state, filters: { ...filters, [flag.key]: false } }),
    })
  }

  /* Everything except the price, carried through the price form as hidden
     fields so submitting it keeps the reader's selection, their ordering and,
     on a phone, the sheet they are standing in. */
  const carried = Object.entries(catalogueQuery(state)).filter(([key]) => key !== 'prix')

  return (
    <>
      {/* The way in, on a phone. It carries the count because a button that says
          only "Filtrer" cannot tell a reader whether the list under it has
          already been narrowed, which is the one thing they need to know before
          reading a single price.

          AND IT IS PINNED, BECAUSE MEASURED IN PLACE IT WAS UNREACHABLE. On
          /catalogue at 360 this button sits 2 247 pixels down an 18 848-pixel
          page; under a filter it sits above 24 cards, so a reader eight screens
          into the grid who wants to change one value has to scroll back through
          all of them. It pins at `z-30`, under the header's 40 and clear of the
          drawer's 70. The negative gutter margins let the white band and its
          rule run to both screen edges while the button keeps the shell's
          measure, which is what stops a pinned control from reading as a
          floating card.

          THE TWO OFFSETS ARE MEASURED, AND `top-28` WAS BOTH OF THEM WRONG. It
          was set to 112 when the phone masthead was three rows deep; the phone
          architecture is now ONE 56-pixel bar with the search field outside the
          sticky box, and the header was re-measured pinning at 56 flat at 360,
          390 and 414. A bar at 112 therefore hung 56 pixels below the chrome
          with the grid running through the window between them: captured at 390
          scrolled to 2 500, two packshots were sliced across the middle by a
          white band that read as a card floating in the listing rather than as
          part of the chrome. From md up the same class was wrong the other way
          — the masthead is 157 tall and pins at 121, its first row sliding away
          under `md:top-[-2.25rem]`, so 112 put the button 9 pixels UNDER the
          green band, clipped along its top edge at 768, 834 and 1023. `top-14`
          and `md:top-[121px]` are those two measurements, and the bar now sits
          flush against the chrome at every width below lg, where it stops
          existing.

          NONE OF THIS EXISTS ON A POINTER: the wrapper is `lg:hidden`, the
          panel is a pinned column of its own from lg up, and every class here
          is behind a `lg:` reset anyway. */}
      <div className="mb-stack sticky top-14 z-30 -mx-[var(--gutter)] border-b border-rule bg-paper px-[var(--gutter)] py-3 md:top-[121px] lg:static lg:z-auto lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:hidden">
        <Link
          href={catalogueHref({ ...state, sheet: true })}
          className="press fill flex min-h-12 w-full items-center justify-center gap-3 rounded-control bg-accent px-6 text-[0.875rem] font-bold text-paper [--fill-to:var(--accent-ink)]"
        >
          Filtrer et trier
          {active > 0 ? (
            <span className="t-num grid size-6 place-items-center rounded-pill bg-paper text-micro font-bold text-accent">
              {active}
            </span>
          ) : null}
        </Link>
      </div>

      <aside
        id="filtres"
        aria-labelledby="filtres-titre"
        style={
          {
            /* Measured, not guessed: from md up the masthead is 157 tall and
               pins at 121, its first row scrolling away under a negative `top`.
               Only the `lg:` rules below read this, so 121 is the only number it
               needs. Anything less and the panel's own head slides under the
               green band; anything more and it floats. Re-measured at 1440 with
               the panel scrolled: chrome bottom 121, panel top 145, panel height
               791, and it scrolls inside itself. */
            '--pin': '121px',
          } as React.CSSProperties
        }
        className={`${
          state.sheet
            ? 'fixed top-0 right-0 bottom-0 left-0 z-[var(--z-drawer)] flex flex-col overflow-hidden bg-paper'
            : 'hidden'
        } lg:sticky lg:top-[calc(var(--pin)+1.5rem)] lg:right-auto lg:bottom-auto lg:left-auto lg:z-auto lg:block lg:max-h-[calc(100dvh-var(--pin)-3rem)] lg:overflow-y-auto lg:overscroll-contain lg:border-l lg:border-rule lg:pr-1 lg:pl-8`}
      >
        {/* The sheet's own head. On a pointer it is not drawn at all: the panel
            is already visible and has nothing to close. */}
        {state.sheet ? (
          <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-rule px-[var(--gutter)] lg:hidden">
            <p className="text-body font-semibold">
              Filtrer et trier
              {active > 0 ? <span className="t-num ml-2 text-accent">{active}</span> : null}
            </p>
            <Link
              href={closed}
              aria-label="Fermer les filtres"
              className="press -mr-2 grid size-11 place-items-center rounded-control text-ink-2 hover:text-ink"
            >
              <IconClose className="text-[1.25rem]" />
            </Link>
          </div>
        ) : null}

        <div
          className={
            state.sheet
              ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain px-[var(--gutter)] pt-6 pb-8 lg:overflow-visible lg:px-0'
              : ''
          }
        >
          {/* In the sheet the title is already in the bar above, so the heading
              stays for the landmark that names it and leaves the screen.

              AND SO DOES THE ROW IT WAS SITTING IN, BECAUSE IN THE SHEET IT SAYS
              NOTHING THE SHEET DOES NOT ALREADY SAY TWICE. Measured at 360, 390
              and 414: 231.5 pixels of the sheet's scrolling body passed before
              the first facet — a bar at the top that already prints "Filtrer et
              trier 3", a row holding nothing but "Tout effacer", the chips, a
              line repeating the total, and only then a control. On an 800-pixel
              screen the body is 671 tall, so a third of what the reader could
              see was a recap. The bar above carries the count of active filters,
              the pinned foot carries both "Effacer" and "Voir les 691
              références", and neither can be scrolled away from; the two copies
              in the middle can. 231.5 becomes 140, which is one more facet value
              on screen at every one of the three widths.

              `lg:` restores both: on a pointer the panel has no bar and no foot,
              so this row IS the panel's head, measured unchanged at 1440 — the
              body's first section still starts 196 pixels down. */}
          <div
            className={`flex flex-wrap items-baseline gap-x-4 gap-y-1 ${
              state.sheet ? 'justify-end lg:justify-between lg:pb-4' : 'justify-between pb-4'
            }`}
          >
            <h3
              id="filtres-titre"
              className={
                state.sheet
                  ? 'sr-only lg:not-sr-only lg:text-sub lg:font-bold lg:tracking-[-0.02em]'
                  : 'text-sub font-bold tracking-[-0.02em]'
              }
            >
              Filtrer
            </h3>
            {active > 0 ? (
              /* Measured at 78 x 27.5 in the panel, which is a control that
                 throws away everything the reader has just built, sized under
                 half a thumb. `inline-flex min-h-11` takes it to 44 where it is
                 still drawn; `md:inline md:min-h-0` gives the pointer back the
                 baseline-set link the header row is aligned on. */
              <Link
                href={cleared}
                scroll={false}
                className={`draw-under items-center py-1 text-small text-accent hover:text-accent-ink md:min-h-0 ${
                  state.sheet
                    ? 'hidden lg:inline'
                    : 'inline-flex min-h-11 md:inline'
                }`}
              >
                Tout effacer
              </Link>
            ) : (
              <span
                className={`t-num text-small text-ink-3 ${state.sheet ? 'hidden lg:inline' : ''}`}
              >
                {formatAmount(total)}
              </span>
            )}
          </div>

          {chips.length > 0 ? (
            <div className="pb-5">
              <p className="sr-only" id="chips-titre">
                Filtres actifs, un par un
              </p>
              <ul aria-labelledby="chips-titre" className="flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <Chip key={chip.key} href={chip.href} label={chip.label} />
                ))}
              </ul>
              {/* The same total the sheet's foot prints on a button that cannot
                  be scrolled away from, so in the sheet it is drawn once and
                  not twice: 31.5 pixels back, and the reader stops reading the
                  same number in two places on one screen. */}
              <p
                className={`t-num mt-3 text-small text-ink-2 ${
                  state.sheet ? 'hidden lg:block' : ''
                }`}
              >
                {formatCount(total, 'référence')}
              </p>
            </div>
          ) : null}

          {/* A keyboard reaches the panel before the grid, which is the right
              document order and the wrong thing to be trapped in: forty links
              stand between the head of the page and the first product. Drawn
              only under focus, because a reader using a pointer already has the
              grid in front of them and does not need a second count of it. */}
          <a
            href="#resultats"
            className="sr-only text-small text-accent focus:not-sr-only focus:mb-4 focus:block hover:text-accent-ink"
          >
            Passer aux {formatAmount(total)} références
          </a>

          <section className="border-t border-rule pt-5" aria-labelledby="facet-tri">
            <h4 id="facet-tri" className="t-label mb-2.5 text-ink">
              Trier
            </h4>
            <ul className="flex flex-wrap gap-2">
              {SORTS.map((option) => {
                const current = option.key === state.sort
                return (
                  <li key={option.key}>
                    <Link
                      href={catalogueHref({ ...state, sort: option.key })}
                      scroll={false}
                      aria-current={current ? 'true' : undefined}
                      className={`press inline-flex min-h-11 items-center rounded-pill px-4 py-1.5 text-small whitespace-nowrap transition-colors duration-[var(--t-fast)] md:min-h-0 ${
                        current
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
          </section>

          {flags.length > 0 ? (
            <section className="mt-5 border-t border-rule pt-5" aria-labelledby="facet-etat">
              <h4 id="facet-etat" className="t-label mb-2 text-ink">
                Disponibilité
              </h4>
              <ul>
                {flags.map((flag) => (
                  <li key={flag.key}>
                    <Value
                      href={catalogueHref({
                        ...state,
                        filters: { ...filters, [flag.key]: !filters[flag.key] },
                      })}
                      label={flag.label}
                      count={facets[flag.key].count}
                      selected={facets[flag.key].selected}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-5 border-t border-rule pt-5" aria-labelledby="facet-prix">
            <h4 id="facet-prix" className="t-label mb-2 text-ink">
              Prix
            </h4>

            {steps.length > 0 ? (
              <ul>
                {steps.map((band) => {
                  const selected = filters.prixMin === band.min && filters.prixMax === band.max
                  return (
                    <li key={band.label}>
                      <Value
                        href={catalogueHref({
                          ...state,
                          filters: withPrice(
                            filters,
                            selected ? null : band.min,
                            selected ? null : band.max,
                          ),
                        })}
                        label={band.label}
                        count={band.count}
                        selected={selected}
                      />
                    </li>
                  )
                })}
              </ul>
            ) : null}

            {/* A plain GET form, exactly as /marques filters its index. Two
                fields rather than one, because that is what a budget is, and
                the reader who has one wants to type it rather than pick the
                step that contains it.

                THE TWO FIELDS ARE SET AT 16 PIXELS ON A PHONE AND 13 FROM MD
                UP, AND THAT IS NOT A TYPOGRAPHIC PREFERENCE. Measured at 13px,
                iOS Safari zooms the whole page on focus and never zooms back
                out: the reader taps "Min", the sheet is suddenly 1.3 times too
                wide, the action bar at the foot is off-screen, and the way out
                is a pinch. 16 is the threshold that stops it. `md:text-small`
                keeps the panel at the 13 pixels it is measured at under a
                pointer. */}
            <form action="/catalogue" method="get" className="mt-3">
              {carried.map(([key, value]) => (
                <input key={key} type="hidden" name={key} value={value} />
              ))}

              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <label htmlFor="prix-min" className="t-label mb-1 block text-ink-3">
                    Min
                  </label>
                  <div className="field flex h-12 items-stretch rounded-control border border-rule-2 bg-space transition-[border-color,box-shadow] duration-[var(--t-fast)] md:h-11">
                    <input
                      id="prix-min"
                      name="prixmin"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      defaultValue={filters.prixMin ?? ''}
                      placeholder={formatAmount(facets.prixPlancher)}
                      aria-label={`Prix minimum en FCFA, à partir de ${formatAmount(facets.prixPlancher)}`}
                      className="t-num min-w-0 flex-1 bg-transparent px-3 text-[1rem] text-ink outline-none placeholder:text-ink-3 md:text-small"
                    />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <label htmlFor="prix-max" className="t-label mb-1 block text-ink-3">
                    Max
                  </label>
                  <div className="field flex h-12 items-stretch rounded-control border border-rule-2 bg-space transition-[border-color,box-shadow] duration-[var(--t-fast)] md:h-11">
                    <input
                      id="prix-max"
                      name="prixmax"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      defaultValue={filters.prixMax ?? ''}
                      placeholder={formatAmount(facets.prixPlafond)}
                      aria-label={`Prix maximum en FCFA, jusqu’à ${formatAmount(facets.prixPlafond)}`}
                      className="t-num min-w-0 flex-1 bg-transparent px-3 text-[1rem] text-ink outline-none placeholder:text-ink-3 md:text-small"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="press fill h-12 shrink-0 rounded-control bg-accent px-4 text-[0.875rem] font-bold text-paper [--fill-to:var(--accent-ink)] md:h-11"
                >
                  OK
                </button>
              </div>

              <p className="mt-2 text-micro leading-[1.55] text-ink-3">
                En FCFA, de {formatAmount(facets.prixPlancher)} à{' '}
                {formatAmount(facets.prixPlafond)}. Laissez un champ vide pour ne borner que
                d’un côté.
              </p>
            </form>
          </section>

          <Group title="Rayon" group="rayon" values={facets.rayons} state={state} />

          <div className="mt-5">
            <Group
              title="Famille"
              group="famille"
              values={facets.familles}
              state={state}
              more={{ href: '/catalogue#index', label: `L’index des ${familyCount} familles` }}
            />
          </div>

          <div className="mt-5">
            <Group
              title="Marque"
              group="marque"
              values={facets.marques}
              state={state}
              more={{ href: '/marques', label: `Les ${brandCount} marques` }}
            />
          </div>
        </div>

        {/* The sheet's foot. It says the number it is about to show, because a
            reader who has just tapped four values needs to know whether the
            fifth left them anything before they close the sheet to look. */}
        {state.sheet ? (
          <div className="flex shrink-0 items-center gap-3 border-t border-rule bg-paper px-[var(--gutter)] py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden">
            {active > 0 ? (
              <Link
                href={catalogueHref({ ...state, filters: NO_FILTERS })}
                className="press inline-flex min-h-12 shrink-0 items-center rounded-control border border-rule-2 px-5 text-[0.875rem] font-bold text-ink"
              >
                Effacer
              </Link>
            ) : null}
            <Link
              href={closed}
              className="press fill inline-flex min-h-12 flex-1 items-center justify-center rounded-control bg-accent px-5 text-[0.875rem] font-bold text-paper [--fill-to:var(--accent-ink)]"
            >
              {total === 0 ? 'Aucune référence' : `Voir les ${formatAmount(total)} références`}
            </Link>
          </div>
        ) : null}
      </aside>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* The dead end                                                               */
/* -------------------------------------------------------------------------- */

export interface Rescue {
  /** `drop` removes the offending filter; `keep` throws away all the others. */
  readonly mode: 'drop' | 'keep'
  readonly total: number
  readonly label: string
  readonly href: string
}

/**
 * Nothing matched, and the page says which filter is to blame.
 *
 * "AUCUN RÉSULTAT" ON ITS OWN IS THE WORST SCREEN IN RETAIL, because it makes the
 * reader undo their own work by trial: eight filters are on, one of them is the
 * one too many, and the page knows which. The rescue is computed upstream by
 * re-running the same query once per active dimension; see the note on that
 * block for why it needs a second pass when no single removal is enough.
 */
export function NoResults({
  rescue,
  cleared,
  active,
}: {
  rescue: Rescue | null
  cleared: string
  active: number
}) {
  return (
    <div className="rounded-well bg-space px-6 py-10 sm:px-10">
      <p className="max-w-[52ch] text-body leading-[1.6] text-ink">
        {active > 1
          ? `Aucune référence ne réunit ces ${active} filtres à la fois.`
          : 'Aucune référence ne répond à ce filtre.'}
      </p>

      {rescue ? (
        <p className="mt-3 max-w-[52ch] text-small leading-[1.65] text-ink-2">
          {rescue.mode === 'drop' ? (
            <>
              Le plus contraignant est « {rescue.label} ». Sans lui, il reste{' '}
              <span className="t-num font-semibold text-ink">
                {formatCount(rescue.total, 'référence')}
              </span>
              .
            </>
          ) : (
            <>
              Ces filtres ne se rencontrent nulle part : en retirer un seul ne suffit pas. Le plus
              large est « {rescue.label} », qui donne à lui seul{' '}
              <span className="t-num font-semibold text-ink">
                {formatCount(rescue.total, 'référence')}
              </span>
              .
            </>
          )}
        </p>
      ) : null}

      {/* The rescue carries a label built from the reader's own filter, which
          runs to "Marque : HP et 2 autres": on a 306-pixel shell that is three
          lines inside a pill sized by its content. Full width and 48 tall on a
          phone, so the label wraps inside a box that is already the width of
          the screen; `sm:w-auto sm:min-h-11` puts back the content-sized
          control the pointer is measured on. */}
      <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
        {rescue ? (
          <Link
            href={rescue.href}
            className="press fill inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-control bg-accent px-7 text-center text-[0.875rem] font-bold text-paper [--fill-to:var(--accent-ink)] sm:min-h-11 sm:w-auto sm:text-left"
          >
            {rescue.mode === 'drop' ? 'Retirer' : 'Ne garder que'} « {rescue.label} »
            <IconChevronRight className="shrink-0 text-[1.0625rem]" />
          </Link>
        ) : null}
        <Link
          href={cleared}
          className="draw-under inline-flex min-h-11 items-center text-small text-ink-2 hover:text-accent sm:inline sm:min-h-0"
        >
          Tout effacer
        </Link>
      </div>

      <p className="mt-7 max-w-[62ch] text-small leading-[1.65] text-ink-3">
        Le comptoir tient du stock que l’export ne montre pas : si vous cherchez une référence
        précise, appelez-nous, elle est peut-être en atelier.
      </p>
    </div>
  )
}
