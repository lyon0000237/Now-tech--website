'use client'

import Link from 'next/link'
import { useId, useRef, useState } from 'react'

import { ProductGrid } from '@/components/product/ProductGrid'
import { SectionHeader } from '@/components/ui/SectionHeader'
import type { Selection } from '@/lib/catalog'

/**
 * Four lists behind four tabs.
 *
 * The tabs are filters a buyer would actually apply, and each one names the rule
 * it follows in a line under the grid. That line is the whole point of the
 * component: a storefront that labels a shelf "populaire" or "tendance" is
 * asking to be believed, and this catalog carries no order history to be
 * believed with. Naming the rule turns a merchandising claim into a statement a
 * customer can check against the prices in front of them.
 *
 * All four lists are rendered on the server and shipped together, so switching
 * tabs is instant and works the same on a stalled connection as on a fast one.
 * Only the active one is in the DOM: forty cards mounted at once would cost more
 * than the switch saves.
 *
 * KEYBOARD. A `tablist` promises arrow-key navigation, and a tablist that does
 * not deliver it is worse than four ordinary buttons: it tells a screen-reader
 * user to press a key that does nothing. So the roving tabindex below is not a
 * refinement, it is the price of using the role at all. One stop enters the set,
 * arrows move within it, Home and End jump to the ends.
 */
export function Selections({ selections }: { selections: readonly Selection[] }) {
  const [activeId, setActiveId] = useState(selections[0]?.id)
  const active = selections.find((selection) => selection.id === activeId) ?? selections[0]
  const panelId = useId()
  const tabs = useRef<(HTMLButtonElement | null)[]>([])

  if (!active) return null

  const activeIndex = selections.indexOf(active)

  const move = (to: number) => {
    const next = (to + selections.length) % selections.length
    setActiveId(selections[next].id)
    tabs.current[next]?.focus()
  }

  return (
    <div>
      {/* The head is the shared one. This component used to carry its own copy
          of SectionHeader's container, rule and mask, which is how two headings
          that must line up start drifting a pixel at a time. `aside` is the slot
          it was given for exactly this. */}
      <SectionHeader
        title="Ce qui vaut le détour"
        aside={
          <div
            role="tablist"
            aria-label="Sélections"
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') move(activeIndex + 1)
              else if (event.key === 'ArrowLeft') move(activeIndex - 1)
              else if (event.key === 'Home') move(0)
              else if (event.key === 'End') move(selections.length - 1)
              else return
              event.preventDefault()
            }}
            className="e-item flex flex-wrap gap-2"
          >
            {selections.map((selection, position) => {
              const isActive = selection.id === active.id
              return (
                <button
                  key={selection.id}
                  ref={(node) => {
                    tabs.current[position] = node
                  }}
                  type="button"
                  role="tab"
                  id={`${panelId}-${selection.id}`}
                  aria-selected={isActive}
                  aria-controls={panelId}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveId(selection.id)}
                  // 44px on a phone, where a thumb is aiming; the desktop pill
                // keeps its own proportions.
                className={`press min-h-11 rounded-pill px-5 py-2 text-small transition-colors duration-[var(--t-fast)] md:min-h-0 ${
                    isActive
                      ? 'bg-accent font-semibold text-paper'
                      : 'border border-rule text-ink-2 hover:border-ink hover:text-ink'
                  }`}
                >
                  {selection.label}
                </button>
              )
            })}
          </div>
        }
      />

      <div id={panelId} role="tabpanel" aria-labelledby={`${panelId}-${active.id}`}>
        <ProductGrid products={active.products} columns={4} />
      </div>

      <div className="mt-stack flex flex-wrap items-baseline justify-between gap-x-12 gap-y-3 border-t border-rule pt-6">
        <p className="text-small text-ink-3">{active.rule}</p>
        <Link
          href="/catalogue"
          className="draw-under text-small font-semibold text-accent hover:text-accent-ink"
        >
          Ouvrir le catalogue complet
        </Link>
      </div>
    </div>
  )
}
