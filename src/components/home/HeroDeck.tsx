'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
} from 'react'

import { DEPARTMENT_ICON, IconArrowRight, IconChevronRight } from '@/components/brand/Icons'
import { ProductMedia } from '@/components/product/ProductMedia'
import { Action } from '@/components/ui/Action'
import type { HeroPanel } from '@/lib/catalog'

/**
 * The opening: a rail of twelve departments, and the deck they drive.
 *
 * WHY THE RAIL DRIVES THE DECK. The rail used to open a floating panel over the
 * card, which meant a visitor pointing at `Stockage` got a list of families
 * covering the thing they were trying to look at, in a different visual register
 * from everything around it. Two surfaces answering one gesture is one surface
 * too many. There is one card now and the rail chooses which department is in
 * it: twelve doors, twelve rooms, and pointing at a door shows you the room.
 *
 * HOW A CARD BECOMES THE NEXT ONE. It is redrawn in place: the card wipes in
 * from the leading edge, its heading rises from behind its own baseline, its
 * sentence resolves out of blur and its picture is uncovered by a shutter. Four
 * gestures, the same four the rest of the page arrives with, spaced 80ms apart.
 *
 * A horizontal track was tried and taken back out. With twelve slides the whole
 * strip travels, so pointing at `Bureautique` from `Sécurité` sweeps nine cards
 * past the reader at speed and throws the one they were reading off the screen.
 * The strip also has to walk back at the ends, which makes the direction of the
 * movement mean something it does not mean. Redrawing in place is the quieter
 * description, and the more accurate one: the department changed, the page did
 * not move.
 *
 * WHAT IT COSTS. One card in the DOM at a time, keyed on its department, so
 * React remounts it and the keyframes in `globals.css` run as the switch. Only
 * the department on screen is fetched. The aspect ratio is reserved, so an image
 * that has not decoded leaves white space on a white surface rather than a jump.
 */
const ADVANCE_MS = 6500

const REDUCED = '(prefers-reduced-motion: reduce)'
const POINTER = '(hover: hover) and (pointer: fine)'

/**
 * Whether this device gets an automatic tour at all.
 *
 * The media queries are read as one external store rather than copied into
 * state by an effect: the server has no pointer and no motion preference, so the
 * server snapshot is `false` and the client corrects it during hydration without
 * a cascading render. It stays correct afterwards too, since a reader who turns
 * on "reduce motion" mid-visit, or docks a tablet to a mouse, fires a change
 * event the store is already listening for.
 *
 * Touch is excluded on purpose: there is no hover to pause with, so a tour would
 * keep moving under a reader with only a button to stop it. On a phone the deck
 * holds still and the rail underneath is the control, one tap away.
 */
function useTourAllowed(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const queries = [window.matchMedia(REDUCED), window.matchMedia(POINTER)]
    for (const query of queries) query.addEventListener('change', onChange)
    return () => {
      for (const query of queries) query.removeEventListener('change', onChange)
    }
  }, [])

  return useSyncExternalStore(
    subscribe,
    () => !window.matchMedia(REDUCED).matches && window.matchMedia(POINTER).matches,
    () => false,
  )
}

export function HeroDeck({ panels }: { panels: readonly HeroPanel[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const heading = useRef(1)
  const tours = useTourAllowed() && panels.length > 1
  const active = panels[index] ?? panels[0]

  /**
   * One timeout per slide rather than one interval for the whole tour, so
   * choosing a department from the rail resets the clock: a card picked by hand
   * gets its full reading time instead of sliding away half a second later.
   */
  useEffect(() => {
    if (!tours || paused) return
    const timer = window.setTimeout(() => {
      setIndex((current) => {
        if (current + heading.current >= panels.length) heading.current = -1
        else if (current + heading.current < 0) heading.current = 1
        return current + heading.current
      })
    }, ADVANCE_MS)
    return () => window.clearTimeout(timer)
  }, [tours, paused, index, panels.length])

  if (panels.length === 0) return null

  const take = (position: number) => {
    // Pointing at a row sets the direction as well as the destination, so the
    // tour carries on from where the reader left it instead of doubling back.
    heading.current = position >= index ? 1 : -1
    setIndex(position)
  }

  /**
   * THE ROW ONLY ANSWERS A CURSOR, AND ON THIS MARKET THAT IS A DATA BILL.
   * `pointerenter` fires for a finger too, immediately before the tap that
   * follows the row's own link. So tapping `Stockage` remounted the card, ran
   * the four entrance keyframes and started fetching a second department
   * photograph on a page the reader was in the act of leaving: one wasted
   * request of the size of a packshot, on a metered connection, plus the work
   * of a remount at the exact moment the tap has to feel instant. A finger
   * follows the link; a cursor drives the deck.
   */
  const point = (position: number) => (event: ReactPointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType === 'mouse') take(position)
  }

  return (
    <div className="grid gap-x-14 gap-y-10 lg:grid-cols-[17.5rem_1fr]">
      {/* ON A PHONE THE RAIL COMES FIRST, AND THAT IS THE ANSWER TO A MEASURED
          FAULT. The tour only runs where there is a fine pointer, so on a
          touchscreen the card never changes and the rail is the only way into
          the other eleven departments. It was sitting 656 pixels below the top
          of the card, which is a full screen of scrolling past a panel the
          reader cannot steer. Above the card it is the shop's directory,
          reached in one flick under the artwork. The order is restored at sm,
          so every screen from 640 up is untouched. */}
      <nav
        aria-label="Rayons"
        /* A SHELF ON A PHONE, THE SAME ONE THE CATALOGUE USES FOR THE
            SAME TWELVE ROOMS. Stacked two-by-two the rail was 336 pixels of
            links before the card it drives, which is half a screen spent on a
            table of contents. Rolled sideways it is one row: the reader sees
            where the shop begins, and the ones off the right edge announce
            themselves by being cut rather than by being scrolled to.
            The negative gutter margins let it run edge to edge, which is what
            tells a thumb it moves. From sm it is the grid it always was. */
        className="no-scrollbar order-1 mx-[calc(var(--gutter)*-1)] flex snap-x snap-mandatory scroll-pl-[var(--gutter)] gap-3 overflow-x-auto overscroll-x-contain px-[var(--gutter)] pb-1 sm:order-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-3 sm:gap-x-8 sm:overflow-visible sm:px-0 sm:pb-0 lg:order-1 lg:h-full lg:grid-cols-1 lg:gap-x-0 lg:[grid-template-rows:repeat(12,minmax(0,1fr))]"
      >
        {panels.map((panel, position) => {
          const Icon = DEPARTMENT_ICON[panel.id]
          const isActive = position === index
          return (
            <Link
              key={panel.id}
              href={panel.href}
              onPointerEnter={point(position)}
              onFocus={() => take(position)}
              aria-current={isActive ? 'true' : undefined}
              // The active row states itself with its own hairline. A separate
              // marker bar would have to live in the page gutter to clear the
              // icon, and the rule is already there, already the right weight,
              // and already the language the rest of the page answers in.
              // A TILE ON A PHONE, A ROW FROM `sm`, AND THE TILE IS THE
              // CATALOGUE'S OWN. That page shows the same twelve rooms as
              // photographs on a plate, and a reader who meets them as icons on
              // the home page and as pictures on the catalogue meets two
              // different shops. Below `sm` this is the catalogue's tile, to the
              // class: plate, sheen, ProductMedia, name underneath. From `sm`
              // the rail is the row it has always been, because from `sm` it is
              // beside a card it drives rather than being the content itself.
              className={`group/row group flex w-[9.75rem] shrink-0 snap-start flex-col sm:w-auto text-small transition-colors duration-[var(--t-fast)] sm:min-h-14 sm:shrink sm:snap-align-none sm:flex-row sm:items-center sm:gap-3 sm:border-b lg:min-h-0 lg:pr-2 ${
                isActive
                  ? 'text-accent sm:border-accent'
                  : 'text-ink-2 hover:text-accent sm:border-rule'
              }`}
            >
              <span className="plate mb-2.5 block sm:hidden">
                <span className="sheen relative block overflow-hidden rounded-well">
                  <ProductMedia
                    src={panel.image}
                    // The department is named in type immediately under the
                    // picture; naming the hero product here would make a screen
                    // reader announce a switch model before the word "Réseaux".
                    alt=""
                    sizes="156px"
                    priority={position < 3}
                  />
                </span>
              </span>

              <Icon
                className={`hidden shrink-0 text-[1.25rem] transition-transform duration-[var(--t-base)] ease-brand sm:block ${
                  isActive ? 'scale-110' : 'group-hover/row:scale-110'
                }`}
              />
              <span className="clamp-1 flex-1">{panel.shortName}</span>
              <IconChevronRight
                className={`hidden shrink-0 text-[0.875rem] transition-transform duration-[var(--t-base)] ease-brand lg:block ${
                  isActive ? 'translate-x-1' : 'text-ink-3 group-hover/row:translate-x-1'
                }`}
              />
            </Link>
          )
        })}
      </nav>

      {/* The deck sets the height and the rail divides it. The other way round,
          twelve 60px rows made a 720px column beside a 510px card and the
          opening ended on 200px of nothing. */}
      {/* `min-w-0` is load-bearing, not tidiness. The track is twelve slides
          wide, and a grid item's automatic minimum size is its content's
          min-content: without this the `1fr` column sized itself to the whole
          strip, 3 011px instead of 944, and the square picture inside it grew to
          match. The clip below hides the overflow; this is what stops it
          claiming the space first. */}
      <div
        /* THE CARD DOES NOT EXIST ON A PHONE, AND THAT IS THE ARCHITECTURE,
           NOT A CUT. The deck is a rail that drives a card: point at a door,
           see the room. A phone has no pointer, so the tour is already disabled
           there and the card can only ever show one department, chosen for the
           reader, under a list that already offers all twelve. Measured at 390
           it cost 660 pixels, more than two thirds of a screen, to advertise one
           of twelve rooms whose door was 300 pixels above it. The rail alone is
           the honest phone version: twelve doors, no anteroom. From `sm` the
           card returns and the desktop is untouched. */
        className="order-2 hidden min-w-0 sm:order-1 sm:block lg:order-2"
        // A finger cannot lift the brake it puts on. On a touchscreen laptop,
        // where the tour runs because the pointer is fine, one touch on the
        // card raised `paused` and no `pointerleave` ever followed.
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') setPaused(true)
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') setPaused(false)
        }}
        onFocusCapture={() => setPaused(true)}
      >
        {/* The carousel is only announced where one exists. Without a fine
            pointer nothing advances and nothing can be advanced, so a reader on
            a screen reader and a phone was being told to look for controls on a
            panel that has none. */}
        <div
          role="group"
          aria-roledescription={tours ? 'carrousel' : undefined}
          aria-label="Les douze rayons"
        >
          {/* Keyed on the department, so React remounts the card and the
              keyframes play as the switch. */}
          <article
            key={active.id}
            className="switch-in grid h-full grid-cols-1 items-center gap-8 sm:grid-cols-[1.55fr_1fr] sm:gap-10 lg:min-h-[34rem]"
          >
            <div>
              <h1 className="text-display font-bold leading-[1.04] tracking-[-0.035em] text-balance">
                {active.headline.map((line) => (
                  <span key={line} className="-mb-[0.14em] block overflow-hidden pb-[0.14em]">
                    <span className="e-line">{line}</span>
                  </span>
                ))}
              </h1>
              <p className="e-text mt-5 max-w-[52ch] text-lead leading-[1.6] text-pretty text-ink-2">
                {active.body}
              </p>

              <Action href={active.href} className="group/cta e-item mt-9">
                {active.cta}
                <IconArrowRight className="text-[1.125rem] transition-transform duration-[var(--t-base)] ease-brand group-hover/action:translate-x-1" />
              </Action>

              {/* Five family links wrap onto three lines on a 390px screen,
                  which turns the card's closing line into a paragraph. Three fit
                  on two and say the same thing: there is depth behind this
                  door.

                  They are not links inside a sentence, they are a list of
                  doors, and they measured 19.5 pixels tall with 12 between
                  them. On the phone each one takes 14 pixels of padding top and
                  bottom, which brings the target to 47.5, and the row gap drops
                  to 8 so the block does not grow into a paragraph again. From
                  sm the padding goes and the desktop spacing returns.

                  AND ON A PHONE THEY DID NOT LOOK LIKE LINKS AT ALL. Their
                  whole affordance is `.draw-under`, which is a hover, and a
                  touchscreen has no hover: three doors were rendering as three
                  lines of 14px grey metadata under the button. Below sm the
                  rule is simply drawn, one pixel, four from the baseline, which
                  is the same mark the pointer draws on the desktop. From sm it
                  is taken back off and `.draw-under` is the affordance again. */}
              <ul className="e-item mt-9 flex flex-wrap gap-x-7 gap-y-2 text-small text-ink-3 sm:gap-y-3">
                {active.families.map((family, rank) => (
                  <li key={family.slug} className={rank > 2 ? 'hidden sm:list-item' : undefined}>
                    <Link
                      href={`/categorie/${family.slug}`}
                      className="draw-under inline-block py-3.5 underline decoration-1 underline-offset-4 transition-colors duration-[var(--t-fast)] hover:text-ink sm:py-0 sm:no-underline"
                    >
                      {family.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative order-first aspect-[4/3] w-full rounded-well bg-surface sm:order-none sm:aspect-square">
              {active.image ? (
                <Image
                  src={active.image}
                  alt=""
                  fill
                  priority={index === 0}
                  sizes="(max-width: 639px) 66vw, (max-width: 1023px) 34vw, (max-width: 1279px) 20vw, 23vw"
                  className="e-media object-contain"
                />
              ) : null}
            </div>
          </article>
        </div>

      </div>
    </div>
  )
}
