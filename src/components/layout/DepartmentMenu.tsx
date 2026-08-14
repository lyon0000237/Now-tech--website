'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'

import { DEPARTMENT_ICON, IconClose, IconMenu } from '@/components/brand/Icons'
import type { DepartmentNav } from '@/types/summary'

/**
 * The catalog map.
 *
 * Twelve department names in a row is a list, not a map: it says nothing about
 * the families underneath them, which is the level a buyer actually shops at. One trigger replaces the row, and opening it shows the whole structure at
 * once, every department with its deepest families and a count on each.
 *
 * The trigger is the block at the head of the department bar rather than a
 * button floating in the masthead. That position is doing real work: it is the
 * first thing on the one saturated band of the page, it is the same width and
 * weight on every route, and on a phone it is the only navigation that reaches
 * the whole catalog.
 *
 * The panel is rendered inside the sticky header, so `top-full` puts it under
 * the entire masthead rather than under the trigger, which is what lets it run
 * the full width of the page.
 */
export function DepartmentMenu({
  departments,
  familyCount,
}: {
  departments: readonly DepartmentNav[]
  familyCount: number
}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      // Escape used to drop the focus on <body>, which on a page with 130 tab
      // stops means the next Tab starts again from the masthead. The reader
      // gets put back where they were: on the control they just closed.
      trigger.current?.focus()
    }
    const onPointer = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  return (
    // POINTING OPENS IT. The map is the shop's whole structure and it costs
    // nothing to look at, so asking for a click first is a toll on the one
    // navigation a stranger needs most. Restricted to a mouse: a touch reports
    // pointerenter as well, and there the tap would open the panel and the click
    // that follows would immediately shut it again.
    //
    // The panel is a DOM child of this container even though it is painted
    // across the page, so the pointer never leaves while it is inside it.
    //
    // Closing on focus leaving keeps a keyboard pass honest: with the panel open
    // and 660px of opaque paper over the page, 38 of the tab stops underneath
    // were still reachable and invisible. `next &&` matters, because clicking a
    // non-focusable part of the panel reports a null relatedTarget in Chrome.
    <div
      ref={container}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setOpen(true)
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') setOpen(false)
      }}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null
        if (next && !event.currentTarget.contains(next)) setOpen(false)
      }}
      className="flex shrink-0"
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={`press flex items-center gap-2.5 px-4 text-small font-semibold whitespace-nowrap transition-colors duration-[var(--t-fast)] md:px-5 ${
          open ? 'bg-paper text-accent' : 'bg-rail-hover text-rail-ink hover:bg-paper hover:text-accent'
        }`}
      >
        {open ? <IconClose className="text-[1.125rem]" /> : <IconMenu className="text-[1.125rem]" />}
        Tous les rayons
      </button>

      {open ? (
        <div
          id={panelId}
          // The panel paints its own ink. It is a DOM descendant of the department
          // bar, which sets white on the green, so a label that did not name a colour
          // inherited white and landed on white paper: the twelve department names
          // were rendered, sized and laid out, and invisible.
          className="absolute inset-x-0 top-full max-h-[min(74vh,660px)] overflow-y-auto border-b border-rule-panel bg-paper text-ink shadow-[var(--shadow-panel)]"
        >
          <div className="shell grid gap-x-10 gap-y-9 py-10 md:grid-cols-2 lg:grid-cols-3">
            {departments.map((department) => {
              const Icon = DEPARTMENT_ICON[department.id]
              return (
                <div key={department.id}>
                  <Link
                    href={`/rayon/${department.slug}`}
                    onClick={() => setOpen(false)}
                    className="group flex items-baseline gap-3 border-b border-rule pb-3.5"
                  >
                    <Icon className="translate-y-0.5 text-[1.125rem] text-accent" />
                    <span className="flex-1 text-body font-semibold tracking-[-0.015em] group-hover:text-accent">
                      {department.name}
                    </span>
                    <span className="t-num shrink-0 text-micro text-ink-3">
                      {department.totalCount}
                    </span>
                  </Link>
                  <ul className="mt-5 space-y-3">
                    {department.families.map((family) => (
                      <li key={family.slug}>
                        <Link
                          href={`/categorie/${family.slug}`}
                          onClick={() => setOpen(false)}
                          className="flex items-baseline justify-between gap-4 text-small text-ink-2 hover:text-accent"
                        >
                          <span>{family.name}</span>
                          <span className="t-num shrink-0 text-micro text-ink-3">
                            {family.count}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>

          <div className="shell border-t border-rule py-6">
            <Link
              href="/catalogue"
              onClick={() => setOpen(false)}
              className="draw-under text-small font-semibold text-accent hover:text-accent-ink"
            >
              Voir l’index complet des {familyCount} familles
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
