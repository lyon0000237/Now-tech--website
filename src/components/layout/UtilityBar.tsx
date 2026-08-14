import Link from 'next/link'

import { IconBox, IconPhone } from '@/components/brand/Icons'
import { DELIVERY_CITIES, PHONES, PICKUP_LINE, dialable } from '@/constants/site'

/**
 * The counter strip.
 *
 * The thinnest row on the page and the one that decides whether the rest of it
 * gets read. The obstacle in this market is not price and it is not choice, it
 * is the reasonable fear of sending money to a website that may not exist in
 * the physical world, and the answer to that fear is a number that dials, a
 * street you can drive to, and a delivery promise stated before anything is in
 * the basket.
 *
 * It scrolls away and does not come back: the header lifts by exactly this
 * row's height when it pins, so the strip does its work in the first screen and
 * then gives its 36 pixels back to the catalog.
 */
export function UtilityBar() {
  return (
    <div className="hidden border-b border-rule bg-space md:block">
      <div className="shell flex h-9 items-center justify-between gap-8 text-micro">
        <div className="flex items-center gap-7">
          {PHONES.map((phone) => (
            <a
              key={phone}
              href={`tel:${dialable(phone)}`}
              className="flex items-center gap-2 text-ink-2 transition-colors duration-[var(--t-fast)] hover:text-ink"
            >
              <IconPhone className="text-[0.875rem] text-ink-3" />
              <span className="t-num">{phone}</span>
            </a>
          ))}
          <span className="hidden text-ink-3 xl:inline">Retrait le jour même à {PICKUP_LINE}</span>
        </div>

        <div className="flex items-center gap-7">
          <span className="hidden items-center gap-2 text-ink-3 lg:flex">
            <IconBox className="text-[0.875rem]" />
            Livraison 24 à 48 h à {DELIVERY_CITIES.join(' et ')}
          </span>
          <Link
            href="/devis"
            className="font-semibold text-accent transition-colors duration-[var(--t-fast)] hover:text-accent-ink"
          >
            Devis entreprise
          </Link>
        </div>
      </div>
    </div>
  )
}
