import Link from 'next/link'

import type { IndexDepartment } from '@/lib/catalog'
import { formatAmount } from '@/lib/format'

/**
 * The index: every family the shop has, under the department it belongs to.
 *
 * IT IS SET LIKE AN INDEX BECAUSE THAT IS WHAT IT IS. Not tiles, not cards, not
 * twelve photographs of departments. 268 entries drawn as cards is fourteen
 * screens of scrolling to answer "do they carry onduleurs"; the same 268 set as
 * a multi-column list is two screens, and the eye reads a column of names far
 * faster than a field of boxes. This is the one surface on the site where the
 * whole shape of the business is visible at once, and density is the feature.
 *
 * THE COUNT IS THE SECOND COLUMN, IN MONO. It is what makes the index worth
 * reading rather than just navigable: 845 against 3 is the difference between a
 * department and a shelf, and tabular figures are what let a reader compare them
 * down the column instead of item by item.
 *
 * Ordered by count, not alphabetically. A reader scanning for what this shop is
 * actually deep in gets the answer in the first three lines of each block; a
 * reader hunting one name uses the browser's own find, which does not care what
 * order the list is in.
 *
 * CSS columns rather than a grid, because the blocks are lists of wildly
 * different lengths and a grid would leave one column of a twelve-entry
 * department stranded beside three empty ones. `break-inside: avoid` on the row
 * is what stops a name from being cut across the column boundary.
 *
 * THREE COLUMNS AT THE TOP END, NOT FOUR. Four gave each name 276 pixels, and
 * this taxonomy is full of names like "Lecteurs/pointeuses biométriques" that
 * truncate at that width: three of them appeared in the same block, ellipsed at
 * the same character, telling the reader nothing about which was which. Three
 * columns give 388, which carries all but a handful whole.
 *
 * THE OUTER BOX IS A FLEX COLUMN AND NOT A GRID. A grid's implicit `1fr` track
 * is `minmax(auto, 1fr)`, whose floor is the item's min-content width; with a
 * multi-column list inside, that floor exceeded the shell and the track grew
 * past it, so the fourth column and every count in it were painted outside the
 * page and clipped. A flex column stretches its items to the container instead
 * of being sized by them, which is the behaviour this needs.
 */
export function FamilyIndex({ departments }: { departments: readonly IndexDepartment[] }) {
  return (
    <div className="flex flex-col gap-band">
      {departments.map((department) => (
        <section key={department.id} className="enter min-w-0" aria-labelledby={`index-${department.id}`}>
          {/* The count is on its own baseline at the right edge, exactly where
              the twelve-department grid at the top of this page puts it, and not
              at the end of the tagline: set there it read as the last word of
              the sentence, "interphonie. 747". */}
          <div className="mb-7 border-b border-rule pb-4">
            <div className="flex items-baseline justify-between gap-x-8">
              <h3
                id={`index-${department.id}`}
                className="min-w-0 text-sub font-bold tracking-[-0.02em]"
              >
                <Link href={`/rayon/${department.slug}`} className="draw-under hover:text-accent">
                  {department.name}
                </Link>
              </h3>
              <span className="t-num shrink-0 text-small text-ink-3">
                {formatAmount(department.totalCount)}
              </span>
            </div>
            <p className="e-text mt-1.5 max-w-[62ch] text-small text-ink-3">
              {department.tagline}
            </p>
          </div>

          {department.families.length === 0 ? (
            <p className="text-small text-ink-3">
              Ce rayon n’est pas encore découpé en familles. Tout y est sur une seule page.
            </p>
          ) : (
            <ul className="columns-1 gap-x-10 sm:columns-2 lg:columns-3">
              {department.families.map((family) => (
                <li key={family.slug} className="break-inside-avoid">
                  <Link
                    href={`/categorie/${family.slug}`}
                    className="group flex items-baseline gap-3 py-[0.4375rem] text-small transition-colors duration-[var(--t-fast)] hover:text-accent"
                  >
                    <span className="min-w-0 flex-1 truncate">{family.name}</span>
                    {/* The rule between the name and its count is what makes a
                        ragged list read as a table. It is the leader line of a
                        printed index, drawn with a border rather than dots. */}
                    <span
                      aria-hidden
                      className="h-px min-w-4 flex-1 translate-y-[-0.2em] bg-rule transition-colors duration-[var(--t-fast)] group-hover:bg-accent"
                    />
                    <span className="t-num text-micro text-ink-3">
                      {formatAmount(family.count)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
