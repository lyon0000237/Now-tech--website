import Link from 'next/link'

import { AddToCart } from './AddToCart'
import { Price, StockLabel } from './Price'
import { ProductMedia } from './ProductMedia'
import type { ProductSummary } from '@/types/summary'

/**
 * The product card.
 *
 * THE PICTURE IS BORDERED, THE CARD IS NOT. Merchandise is the one thing on this
 * page a reader compares item against item, and comparison needs edges, but the
 * edge belongs to the photograph rather than to the cell: every packshot in this
 * library was shot on white and sits on a white page, so without a hairline the
 * product has no boundary at all. The name, the specs and the price beneath it
 * are type, and type is separated by space here as it is everywhere else.
 *
 * THE PLATE. Behind the photograph is a pale board that turns two degrees when
 * the card is pointed at, so the packshot reads as a print resting on it. It is
 * the whole hover of the card: no lift, no shadow, no colour change. See
 * `.plate` in globals.css for why two degrees and why it is a keyframe.
 *
 * The spec atoms under the name are the reason this catalog is shoppable at all.
 * Fifty black rack-mount boxes are indistinguishable as photographs, and
 * `24 ports`, `4 MP` or `850 VA` is what turns the grid back into a comparison.
 * They are parsed from the product name at ingest, so they cost nothing per card
 * and exist for 1 498 products.
 *
 * THE STAMP. It is rationed and it is a stamp, not a badge. 4 107 of 4 254
 * products carry an "on sale" flag, so a discount chip would appear on 96% of
 * every grid and mean nothing on any of it; 513 are marked down 40% or more, and
 * those are the only ones that get it.
 *
 * Being that rare is what earns it a form. A rectangle with a percentage in it
 * is the shape every marketplace uses because it is the shape a database field
 * suggests; this is a round sticker, pressed on slightly crooked, the way a
 * price is actually marked on a box at a counter. It straightens as the plate
 * behind the photograph turns, so the two movements read as one gesture rather
 * than as two effects on the same card.
 *
 * It is the brand's orange and it is the only orange on the site. Green is the
 * shop: links, labels, controls, and the plate behind every one of these
 * photographs. A green stamp on a green plate is furniture. The orange is the
 * one warm thing on the page, so a marked-down price is found without reading.
 *
 * There are no rating stars anywhere on this site: the catalog holds no reviews,
 * and drawing five of them would be the single dishonest pixel on the page.
 */
const DEAL_THRESHOLD = 40

export function ProductCard({
  product,
  index,
  priority = false,
  sizes = '(max-width: 767px) 45vw, (max-width: 1279px) 30vw, 23vw',
}: {
  product: ProductSummary
  /** Position in the grid, used only to stagger the entrance. */
  index?: number
  priority?: boolean
  /**
   * Must track the grid's own column breakpoints. They ran 640/1100 while the
   * grid changed at 768/1280, so between 1101 and 1279 the browser was told to
   * fetch a 30vw image for a 45vw cell and upscaled the packshot by half.
   */
  sizes?: string
}) {
  const deal =
    product.discountPct && product.discountPct >= DEAL_THRESHOLD ? product.discountPct : null

  return (
    <div
      className="group enter relative flex flex-col"
      style={index === undefined ? undefined : ({ '--enter-index': index } as React.CSSProperties)}
    >
      {/* One child, because `.plate > *` gives every direct child
          `position: relative` to lift it above the board: a second child that
          wanted to be absolute lost its own positioning and fell to the bottom
          of the well. The stamp is therefore positioned against this wrapper. */}
      <div className="plate mb-4">
        <div className="sheen relative overflow-hidden rounded-well">
          <ProductMedia
            src={product.image}
            second={product.imageAlt}
            // The name is already the link's own text, three lines below. Read
            // out twice, every card in the grid announces itself twice.
            alt=""
            sizes={sizes}
            priority={priority}
          />
          {deal ? (
            <span
              className="absolute top-2.5 left-2.5 z-[2] grid size-[3.125rem] -rotate-[9deg] place-items-center rounded-full bg-secondary text-on-surface transition-transform duration-[var(--t-base)] ease-brand group-hover:rotate-0"
              aria-label={`Remise de ${deal} pour cent`}
            >
              {/* One line. Stacked, the per-cent sign had to drop to 9px to sit
                  under the number, and the type scale's floor is 12: a mark
                  nobody can read is not a mark. */}
              <span aria-hidden className="t-num text-[0.8125rem] font-bold tracking-[-0.03em]">
                -{deal}%
              </span>
            </span>
          ) : null}
        </div>
      </div>

      <span className="t-label mb-2.5 text-ink-3">{product.brand ?? product.categoryName}</span>

      <h3 className="mb-3.5 h-[2.8em] text-small leading-[1.4]">
        {/* The link is stretched over the whole card rather than wrapped around
            it, so the basket control beside the price can be a button without
            nesting one interactive element inside another. */}
        <Link href={`/produit/${product.slug}`} className="after:absolute after:inset-0">
          <span className="clamp-2 draw-under">{product.name}</span>
        </Link>
      </h3>

      {product.specs.length > 0 ? (
        <div className="mb-5 flex min-h-[22px] flex-wrap gap-2">
          {product.specs.slice(0, 2).map((spec) => (
            <span
              key={spec}
              className="t-num rounded-[5px] bg-space px-2 py-0.5 text-micro text-ink-2"
            >
              {spec}
            </span>
          ))}
        </div>
      ) : (
        <div className="mb-5 min-h-[22px]" />
      )}

      <div className="mt-auto flex items-end justify-between gap-3">
        <Price
          value={product.price}
          listPrice={product.listPrice}
          discountPct={product.discountPct}
        />
        {/* The same corner says either what you can do or why you cannot: in
            stock it offers the basket, out of stock it says so. */}
        {product.inStock ? <AddToCart product={product} /> : <StockLabel inStock={false} />}
      </div>
    </div>
  )
}
