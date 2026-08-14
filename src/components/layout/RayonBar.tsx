import Link from 'next/link'

import { DepartmentMenu } from './DepartmentMenu'
import type { DepartmentNav } from '@/types/summary'

/**
 * The department bar.
 *
 * The one saturated band on the page, and it is spent on navigation rather than
 * on a promotion. Everything above it is the shop identifying itself and
 * everything below it is merchandise, so the band reads as the line between
 * the two, which is why it carries the catalog trigger at its head.
 *
 * ON A PHONE IT IS THE TRIGGER AND NOTHING ELSE. It carried a second row under
 * this one, a flickable strip of the twelve departments, and that row cost 44
 * pixels of a sticky header already 204 tall on an 844px screen: a quarter of
 * the phone spent on chrome. The strip also showed one and a half departments
 * out of twelve, which is not navigation, it is a hint that navigation exists.
 * The trigger beside it opens all twelve with their families, so the row was
 * paying rent to say something the button already says better.
 */
const SECTIONS = [
  { href: '/catalogue', label: 'Catalogue' },
  { href: '/catalogue?tri=recent', label: 'Nouveautés' },
  { href: '/marques', label: 'Marques' },
  { href: '/rayon/services-occasion', label: 'Occasion' },
  { href: '/services', label: 'Installation' },
  { href: '/contact', label: 'Nous joindre' },
] as const

export function RayonBar({
  departments,
  familyCount,
}: {
  departments: readonly DepartmentNav[]
  familyCount: number
}) {
  return (
    <div className="on-rail band-in bg-rail text-rail-ink">
      <div className="shell flex h-12 items-stretch">
        <DepartmentMenu departments={departments} familyCount={familyCount} />

        <nav aria-label="Sections" className="hidden items-stretch md:flex">
          {SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="rail-link flex items-center px-3 text-small whitespace-nowrap text-rail-ink-2 transition-colors duration-[var(--t-fast)] hover:text-rail-ink lg:px-5"
            >
              {section.label}
            </Link>
          ))}
        </nav>

      </div>

    </div>
  )
}
