import Link from 'next/link'

import { IconChevronLeft, IconChevronRight } from '@/components/brand/Icons'

/**
 * Pages, not an infinite scroll.
 *
 * The whole catalogue is 178 pages of 24. Infinite scroll on a list that long
 * destroys the one thing a buyer needs on it: the ability to leave, come back
 * and be in the same place. It also puts the footer, where this shop keeps its
 * counter addresses and its telephone numbers, permanently out of reach.
 *
 * THE WINDOW. Two neighbours either side of the current page, plus the first and
 * the last, plus a gap where the run is broken. That is seven numbers at most,
 * which fits one line on a phone at the size the rest of the page is set in.
 * The first and the last are always there because they are the two a reader
 * actually jumps to; page 89 of 178 is a number nobody wants.
 *
 * Previous and next are icons at the ends rather than words, because the numbers
 * between them already say what they do, and "Précédent"/"Suivant" set beside
 * seven digits makes the row read as a sentence.
 */
function windowed(page: number, pages: number): (number | 'gap')[] {
  const wanted = new Set<number>([1, pages, page])
  for (let step = 1; step <= 2; step += 1) {
    if (page - step >= 1) wanted.add(page - step)
    if (page + step <= pages) wanted.add(page + step)
  }
  const sorted = [...wanted].sort((a, b) => a - b)

  const out: (number | 'gap')[] = []
  let previous = 0
  for (const value of sorted) {
    if (previous && value - previous > 1) out.push('gap')
    out.push(value)
    previous = value
  }
  return out
}

export function Pager({
  basePath,
  query,
  page,
  pages,
}: {
  basePath: string
  /** Everything except `page`, so an ordering survives a page change. */
  query: Record<string, string>
  page: number
  pages: number
}) {
  if (pages <= 1) return null

  const href = (target: number) => {
    const params = new URLSearchParams(query)
    if (target > 1) params.set('page', String(target))
    const search = params.toString()
    return search ? `${basePath}?${search}` : basePath
  }

  const step =
    'press grid size-11 place-items-center rounded-control border border-rule text-ink-2 transition-colors duration-[var(--t-fast)] hover:border-ink hover:text-ink'

  return (
    <nav aria-label="Pages de résultats" className="mt-band flex justify-center">
      <ul className="flex flex-wrap items-center justify-center gap-2">
        <li>
          {page > 1 ? (
            <Link href={href(page - 1)} rel="prev" aria-label="Page précédente" className={step}>
              <IconChevronLeft className="text-[1.0625rem]" />
            </Link>
          ) : (
            // Present but inert, so the row never changes width between the
            // first page and the second and the numbers stay where the reader
            // last clicked them.
            <span aria-hidden className={`${step} opacity-30`}>
              <IconChevronLeft className="text-[1.0625rem]" />
            </span>
          )}
        </li>

        {windowed(page, pages).map((entry, position) =>
          entry === 'gap' ? (
            <li
              key={`gap-${position}`}
              aria-hidden
              className="grid size-11 place-items-center text-ink-3"
            >
              …
            </li>
          ) : (
            <li key={entry}>
              <Link
                href={href(entry)}
                aria-label={`Page ${entry}`}
                aria-current={entry === page ? 'page' : undefined}
                className={`press t-num grid size-11 place-items-center rounded-control text-small transition-colors duration-[var(--t-fast)] ${
                  entry === page
                    ? 'bg-accent font-bold text-paper'
                    : 'border border-rule text-ink-2 hover:border-ink hover:text-ink'
                }`}
              >
                {entry}
              </Link>
            </li>
          ),
        )}

        <li>
          {page < pages ? (
            <Link href={href(page + 1)} rel="next" aria-label="Page suivante" className={step}>
              <IconChevronRight className="text-[1.0625rem]" />
            </Link>
          ) : (
            <span aria-hidden className={`${step} opacity-30`}>
              <IconChevronRight className="text-[1.0625rem]" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  )
}
