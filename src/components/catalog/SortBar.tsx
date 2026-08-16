import Link from 'next/link'

import { PER_PAGE, SORTS, type SortKey } from '@/lib/catalog'
import { formatAmount } from '@/lib/format'

/**
 * The slice you are looking at, and the four ways to order it.
 *
 * LINKS, NOT A SELECT, AND NOT STATE. Every ordering of a family is a page in
 * its own right: it can be shared, opened in a new tab, reached by the back
 * button and rendered without JavaScript. A `<select>` with an onChange would
 * have cost a client component, a hydration boundary and the back button, and
 * bought nothing a reader can see.
 *
 * IT READS "25 A 48 SUR 307", NOT "307 PRODUITS". The total is already printed
 * beside the title, forty pixels above, and a bar that repeats it says the same
 * number twice on one screen while leaving the reader to work out where in the
 * 307 they currently are. The range is the one fact this row can add, and it is
 * what makes the pager underneath legible.
 *
 * Changing the order returns to the first page, which is why the links carry no
 * page parameter. Sorting by price and landing on page 7 of the old order is the
 * classic listing bug: the customer asked for the cheapest and got the middle of
 * something else.
 *
 * FOUR ORDERINGS DO NOT FIT ACROSS A PHONE AND THEY ARE NOT MEANT TO. Measured
 * at 390 with a 331-pixel shell: "Arrivage", "Prix croissant", "Prix
 * décroissant" and "Remise" need about 530 pixels of pills, so they broke onto
 * two rows of 44 and this bar cost 155 pixels plus 40 of margin — nearly a
 * quarter of a screen, immediately above the grid it introduces, on a page
 * whose first photograph was already at y=900. Below `md` the four go on one
 * horizontal rail with the same `snap-x snap-mandatory` / `snap-start` /
 * `overscroll-x-contain` behaviour as the family shelf above, bled to both
 * screen edges so the fourth is visibly cut and says so. One row of 44 instead
 * of two: the bar measures 91 at 390 with 24 of margin under it, against 155
 * and 40, and at 1440 it is unchanged at 59 with 57.6 under it.
 *
 * THE RANGE STAYS ON ITS OWN LINE AND OUTSIDE THE RAIL. It is a statement about
 * the page and not a control, and a fact that scrolls away when the reader
 * flicks the pills is a fact they will not find again.
 *
 * AND IT NAMES THE ORDERING, BECAUSE ON A RAIL THE LIT PILL CAN BE THE ONE OFF
 * SCREEN. The four pills need about 480 pixels and 361 are visible at 390, so
 * "Remise" is past the right edge; choose it and the bar comes back with
 * nothing highlighted in view, which reads as a control that did not take. The
 * range line answers it in words for the price of no pixels at all — "1 à 24
 * sur 704 · Remise" — and it is `md:hidden`, so from 768 up, where all four are
 * in view and one of them is filled, the line is the same string it always was.
 *
 * `Trier` is still `hidden sm:inline` and still names the list through
 * `aria-labelledby`: a `display:none` element is a legal label target, the name
 * is computed from it, and hiding it below `sm` costs the assistive reader
 * nothing while buying the rail the whole width. The row it sits in is a flex
 * row at every width, not only from `md`, so the 640 to 767 band keeps the
 * label beside the pills exactly as it had it.
 */
export function SortBar({
  basePath,
  sort,
  total,
  page,
}: {
  basePath: string
  sort: SortKey
  total: number
  page: number
}) {
  const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const to = Math.min(page * PER_PAGE, total)
  // `parseSort` only ever returns a key that is in this list, so the fallback is
  // unreachable; it is written so a fifth ordering added to SORTS can never make
  // this line the one that throws.
  const activeLabel = SORTS.find((option) => option.key === sort)?.label ?? SORTS[0].label

  return (
    <div className="enter mb-6 border-b border-rule pb-2 md:mb-stack md:flex md:flex-wrap md:items-center md:justify-between md:gap-x-10 md:gap-y-5 md:pb-5">
      <p className="e-text t-num text-small text-ink-2">
        {total === 0
          ? 'Aucun produit'
          : total <= PER_PAGE
            ? `${formatAmount(total)} produits`
            : `${formatAmount(from)} à ${formatAmount(to)} sur ${formatAmount(total)}`}
        {/* The ordering, named in words, below `md` only. See the head of this
            file: on a rail the chosen pill can be the one that is off screen,
            and the reader would be looking at a bar where nothing is lit. From
            `md` all four are in view and lit, so this would be the same word
            twice on one line. */}
        <span className="text-ink-3 md:hidden"> · {activeLabel}</span>
      </p>

      <div className="e-item mt-1.5 flex items-center gap-x-2 gap-y-2 md:mt-0 md:flex-wrap">
        <span id="sort-label" className="t-label mr-1 hidden shrink-0 text-ink-3 sm:inline">
          Trier
        </span>
        <ul
          aria-labelledby="sort-label"
          className="no-scrollbar mx-[calc(var(--gutter)*-1)] flex min-w-0 flex-1 snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain px-[var(--gutter)] py-1.5 scroll-pl-[var(--gutter)] md:mx-0 md:flex-none md:flex-wrap md:snap-none md:overflow-visible md:px-0 md:py-0"
        >
          {SORTS.map((option) => {
            const active = option.key === sort
            return (
              <li key={option.key} className="snap-start shrink-0 md:shrink md:snap-align-none">
                <Link
                  href={option.key === 'recent' ? basePath : `${basePath}?tri=${option.key}`}
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
  )
}
