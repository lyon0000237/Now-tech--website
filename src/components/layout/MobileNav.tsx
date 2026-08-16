'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  IconClose,
  IconMenu,
  IconPhone,
  IconSearch,
  IconUser,
} from '@/components/brand/Icons'
import { Logo } from '@/components/brand/Logo'
import { CartButton } from './CartButton'
import { lockScroll } from '@/lib/scroll-lock'
import { PHONES, PICKUP_LINE, WHATSAPP, dialable } from '@/constants/site'
import type { DepartmentNav } from '@/types/summary'
/**
 * The phone's whole navigation: one bar that never leaves, and one panel that
 * holds the entire shop.
 *
 * WHAT THIS REPLACES, AND WHY IT HAD TO BE REPLACED RATHER THAN REPAIRED.
 * The masthead was the desktop's three rows stacked: a counter strip, a row with
 * the mark, the search, the account and the basket, a search row of its own, and
 * the green department bar. Measured at 390 by 844 that came to 168 pixels, a
 * fifth of the screen before the first word of the page, and the answer at the
 * time was to hang the header 56 pixels above the viewport so the top row would
 * scroll out of the way. It worked, and it cost the reader the two controls they
 * reach for most: measured after 900 pixels of scrolling, the mark sat at y=-50
 * and the basket at y=-50. Both gone, and neither ever came back.
 *
 * The green bar was worse, because it was silent about it. Its four section
 * links carried `hidden md:flex`, so on a phone Catalogue, Marques, Services and
 * Nous joindre measured zero pixels wide. They were in the document and could
 * not be reached. The site's entire section navigation did not exist on the
 * screen most of this market browses on.
 *
 * SO: ONE ROW OF 56 PIXELS, AND IT NEVER MOVES. Menu, mark, search, basket. The
 * counter strip, the section links and the twelve departments all move into the
 * panel behind the menu, which is the only surface with room to show them
 * together. 168 pixels of chrome become 56, the reader keeps 112 pixels of every
 * screen, and nothing is hidden any more: what left the bar went somewhere a
 * thumb can reach in one tap, instead of somewhere it had scrolled past.
 *
 * WHY THE SEARCH FIELD IS NOT IN THE BAR. It was priced first. At 360, the
 * narrowest screen this shop actually meets, the shell leaves 306 pixels; three
 * 44-pixel targets and their gaps take 156, so the field would have had 150 to
 * hold a department selector, a placeholder and a submit. The field stays a full
 * row of its own below the bar, in the page rather than pinned to it, so it is
 * there when the reader arrives and gone when they are reading. The magnifier in
 * the bar brings it back.
 *
 * THE PANEL IS THE OVERVIEW THE DESKTOP GIVES FOR FREE. On a wide screen the
 * green bar shows four sections and the department panel shows twelve rooms at
 * once; a phone cannot show either beside the page, so it shows both at once
 * when asked. Sections first, because they are where a stranger starts;
 * departments under them with their counts, because that is what makes this shop
 * a shop and not a page; the counter's telephone numbers last, because that is
 * the answer to everything the site could not answer.
 */
const EASE = [0.22, 1, 0.36, 1] as const
export function MobileNav({ departments }: { departments: readonly DepartmentNav[] }) {
  // THE PANEL REMEMBERS WHICH ROUTE IT WAS OPENED ON, AND `open` IS DERIVED
  // FROM THAT. Closing on navigation is not optional: without it the panel stays
  // over the page it just navigated to, which reads as the tap having done
  // nothing. The obvious way to write that is an effect that calls setOpen(false)
  // when the pathname changes, and this repository forbids it
  // (react-hooks/set-state-in-effect) for the reason the rule exists: it renders
  // once with the wrong value and then again with the right one. Comparing the
  // two strings costs nothing and is right on the first render.
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const pathname = usePathname() ?? '/'
  const open = openedAt === pathname
  const setOpen = (next: boolean) => setOpenedAt(next ? pathname : null)
  const panelId = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
  useEffect(() => {
    if (!open) return
    const release = lockScroll()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenedAt(null)
        trigger.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      release()
    }
  }, [open])
  return (
    <>
      {/* 56 pixels, sticky at the very top, four targets of at least 44. This is
          the entire mobile chrome.
          THE MARK ALONE ON THE LEFT, THE THREE CONTROLS TOGETHER ON THE RIGHT.
          The menu button opened on the left first, mirroring the desktop's
          "Tous les rayons" at the head of the green bar. On a phone that reads
          differently: the mark is the one thing on the bar that is not a
          control, and putting a control before it makes the reader's eye start
          on a button instead of on the shop. Left is identity, right is what you
          can do, and the three things you can do sit under the same thumb. */}
      <div className="shell flex h-14 items-center justify-between gap-2 md:hidden">
        <Logo className="-ml-1 min-h-11 min-w-11 justify-center" />
        <div className="-mr-1 flex items-center">
          {/* Anchors the search row below rather than opening a second surface:
              the field is 56 pixels down the page, and sending the reader there
              is cheaper than building a sheet that holds the same field. */}
          <a
            href="#recherche"
            aria-label="Aller à la recherche"
            className="press grid size-11 place-items-center rounded-control text-ink transition-colors duration-[var(--t-fast)] hover:text-accent"
          >
            <IconSearch className="text-[1.1875rem]" />
          </a>
          <CartButton />
          <button
            ref={trigger}
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label="Ouvrir le menu"
            className="press grid size-11 place-items-center rounded-control text-ink transition-colors duration-[var(--t-fast)] hover:text-accent"
          >
            <IconMenu className="text-[1.1875rem]" />
          </button>
        </div>
      </div>
      {/* PORTALLED TO THE BODY, AND THAT IS NOT TIDINESS.
          The panel declares z-[--z-drawer], which is 70, and Bod's launcher
          declares 60, so the panel should win. Measured, it lost: the panel is a
          DOM child of <header>, which declares z-[--z-header] = 40 and is
          therefore a stacking context, so the panel's 70 only ranks INSIDE the
          header and the whole header ranks 40 against Bod's 60. The same trap
          took the search-scope listbox under the green bar a few days ago. A
          `fixed` element inherits its ancestors' stacking, so the only fix is to
          stop being their descendant.
          Mounted only on the client: `document` does not exist while this
          renders on the server, and useSyncExternalStore gives the right answer
          on the first client render without an effect that flips it. */}
      {mounted
        ? createPortal(
            <AnimatePresence>
                    {open ? (
                <>
                  <motion.div
                    ref={panel}
                    id={panelId}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Menu"
                    initial={reduced ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduced ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.28, ease: EASE }}
                    className="fixed inset-0 z-[var(--z-drawer)] flex flex-col overflow-y-auto overscroll-contain bg-paper md:hidden"
                  >
                    {/* The panel opens with the bar still drawn on it, in the
                        same place and at the same height, so the menu reads as
                        the bar turning over rather than as a second object
                        arriving from somewhere. Only the glyph changes. */}
                    <div className="shell flex h-14 shrink-0 items-center justify-between gap-2">
                      <Logo className="-ml-1 min-h-11 min-w-11 justify-center" />
                      <button
                        type="button"
                        onClick={() => {
                          setOpenedAt(null)
                          trigger.current?.focus()
                        }}
                        aria-label="Fermer le menu"
                        className="press -mr-1 grid size-11 place-items-center rounded-control text-ink transition-colors duration-[var(--t-fast)] hover:text-accent"
                      >
                        <IconClose className="text-[1.1875rem]" />
                      </button>
                    </div>
                    <nav aria-label="Menu" className="shell flex flex-1 flex-col pt-8 pb-12">
                      {SECTIONS.map((section, index) => {
                        const current = owns(section.owns, pathname)
                        return (
                          <Row key={section.href} index={index} reduced={!!reduced}>
                            <Link
                              href={section.href}
                              aria-current={current ? 'page' : undefined}
                              className={`press block border-b border-rule py-4 text-title leading-[1.1] font-bold tracking-[-0.03em] transition-colors duration-[var(--t-fast)] ${
                                current ? 'text-accent' : 'text-ink hover:text-accent'
                              }`}
                            >
                              {section.label}
                            </Link>
                          </Row>
                        )
                      })}
                      <Row index={SECTIONS.length} reduced={!!reduced}>
                        <p className="t-label mt-10 mb-4 text-ink-3">Les rayons</p>
                      </Row>
                      {/* TWO COLUMNS, WHICH IS WHAT MAKES TWELVE ROOMS FIT ON
                          ONE SCREEN. Stacked they were twelve rows and the last
                          four sat below the fold on a 640-tall Android; side by
                          side they are six, and the whole shop is visible at
                          once, which is the one thing the desktop's department
                          panel does that a phone had lost. */}
                      <div className="grid grid-cols-2 gap-x-6">
                        {departments.map((department, index) => (
                          <Row
                            key={department.id}
                            index={SECTIONS.length + 1 + index}
                            reduced={!!reduced}
                          >
                            <Link
                              href={`/rayon/${department.slug}`}
                              className="press flex min-h-12 items-baseline gap-2 border-b border-rule text-small text-ink-2 transition-colors duration-[var(--t-fast)] hover:text-accent"
                            >
                              <span className="min-w-0 flex-1 truncate">
                                {department.shortName}
                              </span>
                              <span className="t-num shrink-0 text-micro text-ink-3">
                                {department.totalCount}
                              </span>
                            </Link>
                          </Row>
                        ))}
                      </div>
                      <Row
                        index={SECTIONS.length + 1 + departments.length}
                        reduced={!!reduced}
                      >
                        <div className="mt-auto pt-10">
                          <Link
                            href="/devis"
                            className="press flex min-h-12 items-center gap-3 text-small font-semibold text-ink transition-colors duration-[var(--t-fast)] hover:text-accent"
                          >
                            <IconUser className="shrink-0 text-[1.125rem] text-ink-3" />
                            Mon devis
                          </Link>
                          {PHONES.map((phone) => (
                            <a
                              key={phone}
                              href={`tel:${dialable(phone)}`}
                              className="press t-num flex min-h-12 items-center gap-3 text-small text-ink-2 transition-colors duration-[var(--t-fast)] hover:text-accent"
                            >
                              <IconPhone className="shrink-0 text-[1.125rem] text-ink-3" />
                              {phone}
                            </a>
                          ))}
                          <a
                            href={`https://wa.me/${dialable(WHATSAPP)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="press flex min-h-12 items-center gap-3 text-small font-semibold text-accent transition-colors duration-[var(--t-fast)] hover:text-accent-ink"
                          >
                            <IconPhone className="shrink-0 text-[1.125rem]" />
                            WhatsApp
                          </a>
                          <p className="mt-3 text-micro leading-[1.6] text-ink-3">
                            Retrait le jour même à {PICKUP_LINE}.
                          </p>
                        </div>
                      </Row>
                    </nav>
                  </motion.div>
                      </>
                    ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  )
}
/** The same four the green bar carries on a wide screen, and the same rule. */
const SECTIONS = [
  {
    href: '/catalogue',
    label: 'Catalogue',
    owns: ['/catalogue', '/rayon', '/categorie', '/produit', '/recherche'],
  },
  { href: '/marques', label: 'Marques', owns: ['/marques', '/marque'] },
  { href: '/services', label: 'Services', owns: ['/services'] },
  { href: '/contact', label: 'Nous joindre', owns: ['/contact'] },
] as const
function owns(roots: readonly string[], pathname: string): boolean {
  return roots.some((root) => pathname === root || pathname.startsWith(`${root}/`))
}
/**
 * One row of the menu, arriving after the one above it.
 *
 * THE STAGGER IS THE CHARACTER OF THIS MENU, AND IT IS E-SHOP'S TO THE NUMBER:
 * 420ms, 14 pixels of rise, 45ms between rows on a 50ms head start. A
 * full-screen panel whose contents all appear at once reads as a page that
 * replaced another page; the same contents arriving in order read as a drawer
 * being pulled, and the eye is led down the list instead of being handed all of
 * it at once.
 *
 * `reduced` removes the movement rather than shortening it. A reader who asked
 * for no motion is not asking for less of it.
 */
function Row({
  children,
  index,
  reduced,
}: {
  children: ReactNode
  index: number
  reduced: boolean
}) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay: 0.05 + index * 0.045, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}
