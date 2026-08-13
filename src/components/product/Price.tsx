import { formatPrice } from '@/lib/format'

/**
 * Price is the only number allowed to be loud.
 *
 * Set in tabular mono so a column running from 1 000 to 11 800 000 FCFA stays
 * a column. The pre-discount price appears only when the reduction is deep
 * enough to mean something: 4,107 of 4,256 products carry an "on sale" flag, so
 * a strike-through on every card would be noise, but 513 are genuinely marked
 * down 40% or more and those are worth anchoring.
 */
const ANCHOR_THRESHOLD = 40

export function Price({
  value,
  listPrice,
  discountPct,
  size = 'md',
}: {
  value: number
  listPrice?: number | null
  discountPct?: number | null
  size?: 'md' | 'lg'
}) {
  const anchored = listPrice && discountPct && discountPct >= ANCHOR_THRESHOLD

  return (
    <span className="flex items-baseline gap-2">
      {anchored ? (
        <span className="t-num text-xs text-ink-3 line-through">{formatPrice(listPrice)}</span>
      ) : null}
      <span
        className={`t-num font-bold tracking-[-0.015em] ${
          size === 'lg' ? 'text-[1.75rem]' : 'text-[0.96875rem]'
        }`}
      >
        {formatPrice(value)}
      </span>
    </span>
  )
}

/**
 * Availability is typography, not a badge.
 *
 * Out of stock is the one scarce fact in the dataset (338 of 4,256), so it is
 * the one thing that gets the warning colour. In stock is simply stated.
 */
export function StockLabel({ inStock }: { inStock: boolean }) {
  return (
    <span className={`text-[0.71875rem] ${inStock ? 'text-ink-3' : 'text-warn'}`}>
      {inStock ? 'En stock' : 'Sur commande'}
    </span>
  )
}
