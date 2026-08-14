'use client'

import { useEffect, useState } from 'react'

import { IconBasket, IconPhone } from '@/components/brand/Icons'
import { useCart } from '@/lib/cart'
import { WHATSAPP, dialable } from '@/constants/site'

/**
 * The one place on the site where the basket is a real button.
 *
 * IN THE GRID IT IS A WORD. Ten filled accent rectangles in a grid turn a page of
 * products into a page of buttons, so `AddToCart` there is a quiet control that
 * appears on hover. Here there is exactly one product and exactly one decision,
 * and the control that carries it should look like the most important thing on
 * the column. Same store, same action, different weight, because the context is
 * different: that is the rule, not an inconsistency.
 *
 * THE QUANTITY IS PART OF THE DECISION, NOT AN AFTERTHOUGHT IN THE DRAWER. This
 * shop sells switches, cables, cartridges and mounts: quantities above one are
 * the normal case, not the exception, and asking for eight of something in the
 * drawer means adding one, opening a panel, then correcting a number.
 *
 * OUT OF STOCK IS NOT A DISABLED BUTTON. 338 of 4 254 references are on order,
 * and a greyed-out control tells a customer the shop cannot help them, which is
 * false: the counter genuinely sources these. So the same corner becomes a
 * WhatsApp line, which is how a Cameroonian buyer actually asks whether a
 * reference is really available and receives the proforma.
 *
 * The confirmation is spoken where the click happened. The drawer opens on the
 * other side of a wide monitor, and a panel appearing 1 400 pixels away is not
 * feedback for the hand that just moved.
 */
export function BuyBlock({
  product,
}: {
  product: {
    readonly slug: string
    readonly name: string
    readonly price: number
    readonly image: string | null
    readonly inStock: boolean
  }
}) {
  const { add, open } = useCart()
  const [qty, setQty] = useState(1)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (!confirmed) return
    const timer = window.setTimeout(() => setConfirmed(false), 2400)
    return () => window.clearTimeout(timer)
  }, [confirmed])

  if (!product.inStock) {
    return (
      <div>
        <p className="mb-4 text-small leading-[1.6] text-ink-2">
          Cette référence n’est pas au comptoir en ce moment. Elle se commande : envoyez-nous le
          modèle sur WhatsApp et nous confirmons le délai et le prix.
        </p>
        <a
          href={`https://wa.me/${dialable(WHATSAPP)}?text=${encodeURIComponent(
            `Bonjour, je cherche : ${product.name}`,
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="press fill inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-control bg-brand px-7 py-3 text-[0.875rem] font-bold text-paper transition-colors duration-[var(--t-fast)] ease-brand [--fill-to:var(--accent)] sm:w-auto"
        >
          <IconPhone className="text-[1.125rem]" />
          Demander cette référence
        </a>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-stretch gap-3">
        {/* A stepper, not a number input. On a phone a numeric field opens a
            keyboard over the price the customer is looking at, and the answer
            is almost always one, two or three. */}
        <div
          className="flex items-center rounded-control border border-rule"
          role="group"
          aria-label="Quantité"
        >
          <button
            type="button"
            onClick={() => setQty((current) => Math.max(1, current - 1))}
            disabled={qty === 1}
            aria-label="Retirer un article"
            className="press grid size-12 place-items-center rounded-l-control text-ink-2 transition-colors duration-[var(--t-fast)] hover:text-ink disabled:pointer-events-none disabled:opacity-30"
          >
            <span aria-hidden className="text-body">
              −
            </span>
          </button>
          <span aria-live="polite" className="t-num w-8 text-center text-body font-bold">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty((current) => Math.min(99, current + 1))}
            aria-label="Ajouter un article"
            className="press grid size-12 place-items-center rounded-r-control text-ink-2 transition-colors duration-[var(--t-fast)] hover:text-ink"
          >
            <span aria-hidden className="text-body">
              +
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            add(
              {
                slug: product.slug,
                name: product.name,
                price: product.price,
                image: product.image,
              },
              qty,
            )
            setConfirmed(true)
            open()
          }}
          className="press fill inline-flex min-h-12 flex-1 items-center justify-center gap-2.5 rounded-control bg-brand px-7 py-3 text-[0.875rem] font-bold text-paper transition-colors duration-[var(--t-fast)] ease-brand [--fill-to:var(--accent)]"
        >
          <IconBasket className="text-[1.1875rem]" />
          {/* The label does not change to "Ajouté". The drawer opening IS the
              confirmation here, and swapping the word would resize the button
              under the pointer that just pressed it. The live region below says
              it for a reader who cannot see the drawer arrive. */}
          Ajouter au panier
        </button>
      </div>

      <span aria-live="polite" className="sr-only">
        {confirmed ? `${qty} × ${product.name} ajouté au panier` : ''}
      </span>
    </div>
  )
}
