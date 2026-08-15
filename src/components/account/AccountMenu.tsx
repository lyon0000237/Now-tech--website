'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'

import { IconChevronDown, IconUser } from '@/components/brand/Icons'
import { counterLabel, firstName, useAccount } from '@/lib/account'

/**
 * The account control in the masthead.
 *
 * It stands where "Mon devis" stood, and it swallows that link rather than
 * losing it: the quote is now the first row of the menu, which is the honest
 * hierarchy anyway. A material list belongs to somebody.
 *
 * TWO CONTROLS IN ONE POSITION, NOT ONE CONTROL WITH TWO LABELS. Signed out,
 * this is a button that opens a dialog, so it says `aria-haspopup="dialog"` and
 * has no chevron: nothing drops from it. Signed in, it is a menu button, so it
 * says `aria-haspopup="menu"`, carries `aria-expanded`, and grows the chevron
 * that promises a panel. A trigger that claims a menu and opens a modal is a
 * lie a screen reader repeats out loud.
 *
 * THE DENSITY IS THE OLD LINK'S DENSITY. Two lines, a 20px mark, the same
 * padding, so the masthead row does not reflow when the customer signs in and
 * the label changes length. Below `lg` the two lines are dropped and the mark
 * stands alone, which is what the row can afford at 390px: wordmark, account,
 * basket, and nothing wraps.
 *
 * AND WHEN IT STANDS ALONE IT IS 44 BY 44, MEASURED, NOT 36 BY 44. The height
 * came from `min-h-11` and the width came from whatever a 20px mark plus 8px of
 * padding on each side happened to make, which was 36: tall enough to pass a
 * glance and eight pixels short of the target on the axis nobody checked. Both
 * axes are now pinned by the same rule, and the mark is centred inside it. The
 * floor is dropped at `lg`, where the two lines of text set the width and the
 * pointer is a mouse.
 *
 * THE PANEL CARRIES AN EXPLICIT Z-INDEX, WHICH IS NOT DECORATION. The whole
 * masthead is one stacking context (`header` is z-40) and the green department
 * bar is a later sibling of this row, so at `z-index: auto` the panel is painted
 * underneath it and the bottom third of the menu disappears into the green. The
 * search scope listbox had exactly this bug. Same fix, same value.
 *
 * The keyboard contract is the one `ScopeSelect` and `DepartmentMenu` already
 * keep: arrows move, Home and End jump, Escape closes and hands the focus back
 * to the trigger, Tab leaves, a pointer outside closes, and focus leaving the
 * container closes. `next &&` on the blur matters, because clicking a
 * non-focusable part of the panel reports a null relatedTarget in Chrome.
 */
export function AccountMenu() {
  const { account, open: openDialog, signOut } = useAccount()
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  /** Set only when the panel was opened from the keyboard, so a mouse click
      does not draw a focus ring on the first row of a menu nobody is tabbing. */
  const takeFocus = useRef(false)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  useEffect(() => {
    if (!open || !takeFocus.current) return
    takeFocus.current = false
    panel.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
  }, [open])

  const rows = () =>
    Array.from(panel.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])

  const move = (step: number, absolute?: number) => {
    const list = rows()
    if (list.length === 0) return
    const from = list.indexOf(document.activeElement as HTMLElement)
    const to = absolute ?? (from < 0 ? 0 : from + step)
    list[(to + list.length) % list.length].focus()
  }

  const dismiss = () => {
    setOpen(false)
    trigger.current?.focus()
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        if (!account) return // The dialog trigger; let the click handler run.
        event.preventDefault()
        takeFocus.current = true
        setOpen(true)
      }
      return
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        move(1)
        break
      case 'ArrowUp':
        event.preventDefault()
        move(-1)
        break
      case 'Home':
        event.preventDefault()
        move(0, 0)
        break
      case 'End':
        event.preventDefault()
        move(0, rows().length - 1)
        break
      case 'Escape':
        event.preventDefault()
        dismiss()
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  const title = account ? firstName(account.name) : 'Mon compte'
  const caption = account
    ? account.counter
      ? `Retrait à ${account.counter}`
      : 'Fiche client'
    : 'Devis et retrait'

  return (
    <div
      ref={container}
      onKeyDown={onKeyDown}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null
        if (next && !event.currentTarget.contains(next)) setOpen(false)
      }}
      className="relative flex shrink-0"
    >
      <button
        ref={trigger}
        type="button"
        aria-haspopup={account ? 'menu' : 'dialog'}
        aria-expanded={account ? open : undefined}
        aria-controls={account && open ? panelId : undefined}
        aria-label={account ? `Compte de ${account.name}` : 'Ouvrir ma fiche client'}
        onClick={() => {
          if (account) setOpen((state) => !state)
          else openDialog()
        }}
        className="press flex min-h-11 min-w-11 items-center justify-center gap-2.5 rounded-control px-2 py-2 text-small transition-colors duration-[var(--t-fast)] hover:text-accent lg:min-h-0 lg:min-w-0 lg:justify-start lg:px-3"
      >
        <IconUser className="shrink-0 text-[1.25rem] text-ink-3" />
        <span className="hidden text-left leading-tight lg:block">
          <span className="clamp-1 block max-w-[9rem]">{title}</span>
          <span className="block text-micro text-ink-3">{caption}</span>
        </span>
        {account ? (
          <IconChevronDown
            className={`hidden shrink-0 text-[1rem] text-ink-3 transition-transform duration-[var(--t-base)] ease-brand lg:block ${
              open ? 'rotate-180' : ''
            }`}
          />
        ) : null}
      </button>

      {account && open ? (
        <div
          ref={panel}
          id={panelId}
          role="menu"
          aria-label="Mon compte"
          className="absolute top-[calc(100%+0.5rem)] right-0 z-[var(--z-header)] w-[17.5rem] overflow-hidden rounded-well border border-rule-panel bg-paper text-ink shadow-[var(--shadow-panel)]"
        >
          <div className="border-b border-rule px-4 py-3.5">
            <p className="clamp-1 text-small font-semibold">{account.name}</p>
            <p className="t-num mt-1 text-micro text-ink-3">{account.phone}</p>
            {account.counter ? (
              <p className="mt-1.5 text-micro text-ink-2">
                Comptoir : {counterLabel(account.counter)}
              </p>
            ) : null}
          </div>

          <Link
            href="/devis"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex min-h-11 flex-col justify-center px-4 py-2.5 text-small transition-colors duration-[var(--t-fast)] hover:bg-space hover:text-accent"
          >
            Mon devis
            <span className="text-micro text-ink-3">Liste de matériel</span>
          </Link>

          {/* THE FOCUS IS MOVED TO THE TRIGGER BEFORE THE DIALOG IS ASKED FOR,
              AND THE ORDER OF THOSE TWO LINES IS THE WHOLE POINT. The dialog
              remembers whatever held the focus when it opened and hands it back
              on close; if that were this row, it would be handing the focus to a
              button that no longer exists, since closing the menu unmounts it.
              The focus would then fall to `body` and the next Tab would restart
              at the top of the document. Focusing the trigger first makes the
              remembered element one that outlives the menu, so Escape on the
              dialog returns the customer to the control they opened it from. */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              trigger.current?.focus()
              setOpen(false)
              openDialog()
            }}
            className="flex min-h-11 w-full flex-col justify-center px-4 py-2.5 text-left text-small transition-colors duration-[var(--t-fast)] hover:bg-space hover:text-accent"
          >
            Mes coordonnées
            <span className="text-micro text-ink-3">Nom, WhatsApp, comptoir</span>
          </button>

          {/* EIGHT PIXELS OF PAPER BEFORE THE DESTRUCTIVE ROW, ON A PHONE ONLY.
              Measured at 360, "Mes coordonnées" and "Se déconnecter" were one
              pixel apart: two 44px targets stacked with a hairline between
              them, the lower of which erases the card. A thumb that lands two
              millimetres low on a moving taxi seat should not be able to do
              that. From `md` the pointer is precise and the row closes up
              again, so the panel measures the same 280 x 270 it did before. */}
          <div className="mt-2 border-t border-rule md:mt-0">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                signOut()
                setOpen(false)
                trigger.current?.focus()
              }}
              className="flex min-h-11 w-full flex-col justify-center px-4 py-2.5 text-left text-small transition-colors duration-[var(--t-fast)] hover:bg-space hover:text-warn"
            >
              Se déconnecter
              <span className="text-micro text-ink-3">Efface la fiche de cet appareil</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
