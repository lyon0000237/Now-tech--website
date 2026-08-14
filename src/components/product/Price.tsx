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
}: {
  value: number
  listPrice?: number | null
  discountPct?: number | null
}) {
  const anchored = listPrice && discountPct && discountPct >= ANCHOR_THRESHOLD

  return (
    // Stacked, not inline. Side by side, "200 000 FCFA 105 000 FCFA" is 24
    // characters of tabular mono in a cell 200 pixels wide, and it wraps into a
    // shape where the eye cannot tell which of the two numbers is the price.
    // Above and below, the anchor is unmistakably the smaller, struck one.
    <span className="block">
      {anchored ? (
        <span className="t-num block text-micro text-ink-3 line-through">
          {formatPrice(listPrice)}
        </span>
      ) : null}
      <span className="t-num block text-body font-bold tracking-[-0.015em]">
        {formatPrice(value)}
      </span>
    </span>
  )
}

/**
 * Availability is typography, not a badge, and it only speaks when it has
 * something to say.
 *
 * 3 916 of 4 254 products are in stock, so an "En stock" line renders on 92% of
 * every grid: it costs a line in each cell, it competes with the price for the
 * same corner, and it tells a customer what they already assumed. The 338 that
 * are not are the scarce, decision-relevant fact, and they are the only ones
 * that get a word, in the one warning colour the palette holds.
 */
export function StockLabel({ inStock }: { inStock: boolean }) {
  if (inStock) return null
  return <span className="text-micro whitespace-nowrap text-warn">Sur commande</span>
}
