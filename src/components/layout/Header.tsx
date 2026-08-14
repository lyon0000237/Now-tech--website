import Link from 'next/link'

import { IconUser } from '@/components/brand/Icons'
import { Logo } from '@/components/brand/Logo'
import { CartButton } from './CartButton'
import { RayonBar } from './RayonBar'
import { SearchField } from './SearchField'
import { UtilityBar } from './UtilityBar'
import { getMenuDepartments, getFamilyCount } from '@/lib/catalog'

/**
 * The masthead, in three rows.
 *
 * Counter strip, then the shop and its search, then the departments. That order
 * is the order the three questions arrive in: who are you, what do you have,
 * where do I start.
 *
 * WHAT PINS AND WHY. Three rows is 144 pixels, and pinning all of them would
 * spend a fifth of a phone screen on chrome. The header is therefore sticky at a
 * negative offset equal to its own first row, so that row scrolls out of the way
 * and the rest stays. The row that leaves is different per breakpoint because
 * the row worth keeping is: a desktop reader loses the phone numbers and keeps
 * search and the departments, a phone reader loses the wordmark and keeps search
 * and the departments. Search survives both, which is the point. No JavaScript
 * is involved: the offset is a `top` value and the browser does the rest.
 *
 * The phone layout is not the desktop one shrunk. On a 390px screen a search
 * field sharing a row with a wordmark and a basket is left about 110 pixels,
 * which is a field nobody can read what they typed into, so search takes a row
 * of its own.
 */
export function Header() {
  const departments = getMenuDepartments(5)
  const familyCount = getFamilyCount()
  const scopes = departments.map((department) => ({
    slug: department.slug,
    label: department.shortName,
  }))

  return (
    <header className="sticky top-[-3.5rem] z-[var(--z-header)] bg-paper md:top-[-2.25rem]">
      <UtilityBar />

      <div className="masthead-in shell flex h-14 items-center gap-6 md:h-[72px] md:gap-10">
        <Logo />

        <div className="hidden min-w-0 flex-1 md:block">
          <SearchField scopes={scopes} />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 md:ml-0 md:gap-2">
          <Link
            href="/devis"
            className="hidden items-center gap-2.5 rounded-control px-3 py-2 text-small transition-colors duration-[var(--t-fast)] hover:text-accent lg:flex"
          >
            <IconUser className="text-[1.25rem] text-ink-3" />
            <span className="leading-tight">
              Mon devis
              <span className="block text-micro text-ink-3">Liste de matériel</span>
            </span>
          </Link>

          <CartButton />
        </div>
      </div>

      <div className="shell pb-3 md:hidden">
        <SearchField scopes={scopes} />
      </div>

      <RayonBar departments={departments} familyCount={familyCount} />
    </header>
  )
}
