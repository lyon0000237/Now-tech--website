import Link from 'next/link'

import { Logo } from '@/components/brand/Logo'
import { SearchField } from './SearchField'
import { getUniverses } from '@/lib/catalog'
import { DELIVERY_CITIES } from '@/constants/site'

/**
 * The masthead.
 *
 * Three things earn their place on the first row, and they are the three the
 * research says decide whether this market buys: search, the delivery city, and
 * the basket. The city is not a preference toggle. Home delivery and pickup
 * exist in Douala and Yaoundé only; everywhere else ships by intercity travel
 * agency in 8 to 72 hours. That changes what is buyable, when it arrives and
 * how it can be paid for, so it belongs in the masthead and propagates from
 * there.
 *
 * The second row is the twelve departments. It is a grouping of the real
 * category tree, never an extra step: each link goes to a real listing.
 */
export function Header() {
  const universes = getUniverses()

  return (
    <header className="sticky top-0 z-[var(--z-header)] border-b border-rule bg-paper">
      <div className="shell flex h-[62px] items-center gap-3 md:h-[74px] md:gap-[22px]">
        <Logo />
        <SearchField />
        <div className="ml-auto flex shrink-0 items-center gap-5 text-sm">
          <span className="hidden text-ink-2 lg:inline">
            Livrer à{' '}
            <b className="border-b border-rule-2 font-semibold text-ink">{DELIVERY_CITIES[0]}</b>
          </span>
          <Link href="/panier" className="flex items-center gap-2 font-semibold">
            Panier
            <span className="t-num rounded-[999px] bg-accent px-[7px] py-px text-xs text-paper">
              0
            </span>
          </Link>
        </div>
      </div>

      <div className="shell">
        <nav
          aria-label="Rayons"
          className="no-scrollbar flex h-11 items-center gap-[22px] overflow-x-auto border-t border-rule text-[0.84375rem] font-medium text-ink-2"
        >
          <Link
            href="/catalogue"
            className="whitespace-nowrap border-b-2 border-transparent py-[3px] font-semibold text-ink hover:border-accent"
          >
            Tout le catalogue
          </Link>
          {universes.map((universe) => (
            <Link
              key={universe.id}
              href={`/rayon/${universe.slug}`}
              className="whitespace-nowrap border-b-2 border-transparent py-[3px] hover:border-accent hover:text-ink"
            >
              {universe.shortName}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
