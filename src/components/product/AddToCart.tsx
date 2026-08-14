'use client'

import { useEffect, useState } from 'react'

import { useCart } from '@/lib/cart'
import type { ProductSummary } from '@/types/summary'

/**
 * Add to basket, from inside a product card.
 *
 * WHY IT IS A QUIET CONTROL AND NOT A BUTTON. Ten of these in a grid, each one a
 * filled accent rectangle, and the grid stops being a page of products and
 * becomes a page of buttons. It is a word with the house rule under it, it
 * appears when the card is pointed at, and on a touch screen, where there is no
 * pointer to appear for, it is simply always there.
 *
 * WHY IT CONFIRMS ON ITSELF. The drawer opens on the other side of the screen,
 * which on a wide monitor is 1 400 pixels from the reader's attention. The
 * control says "Ajouté" where the click happened, and says it politely to a
 * screen reader too, which otherwise gets nothing at all from a panel appearing
 * elsewhere in the document.
 */
export function AddToCart({ product }: { product: ProductSummary }) {
  const { add } = useCart()
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (!confirmed) return
    const timer = window.setTimeout(() => setConfirmed(false), 2000)
    return () => window.clearTimeout(timer)
  }, [confirmed])

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          // The whole card is a link; this control is not a way into it.
          event.preventDefault()
          event.stopPropagation()
          add({
            slug: product.slug,
            name: product.name,
            price: product.price,
            image: product.image,
          })
          setConfirmed(true)
        }}
        // The word is small on purpose, so the grid stays a grid of products
        // rather than of buttons. The hit area is not: the pseudo-element takes
        // it to 46px, which is what a thumb needs on the screen where this
        // control is permanently visible.
        className="press relative z-[1] text-micro font-semibold text-accent opacity-0 transition-opacity duration-[var(--t-fast)] after:absolute after:-inset-3 after:content-[''] group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <span className="measure">{confirmed ? 'Ajouté' : 'Ajouter'}</span>
      </button>
      <span aria-live="polite" className="sr-only">
        {confirmed ? `${product.name} ajouté au panier` : ''}
      </span>
    </>
  )
}
