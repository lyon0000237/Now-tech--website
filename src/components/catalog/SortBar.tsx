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

  return (
    <div className="enter mb-stack flex flex-wrap items-center justify-between gap-x-10 gap-y-5 border-b border-rule pb-5">
      <p className="e-text t-num text-small text-ink-2">
        {total === 0
          ? 'Aucun produit'
          : total <= PER_PAGE
            ? `${formatAmount(total)} produits`
            : `${formatAmount(from)} à ${formatAmount(to)} sur ${formatAmount(total)}`}
      </p>

      <div className="e-item flex flex-wrap items-center gap-x-2 gap-y-2">
        <span id="sort-label" className="t-label mr-1 hidden text-ink-3 sm:inline">
          Trier
        </span>
        <ul aria-labelledby="sort-label" className="flex flex-wrap gap-2">
          {SORTS.map((option) => {
            const active = option.key === sort
            return (
              <li key={option.key}>
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
