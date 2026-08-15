'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

import { IconChevronLeft, IconChevronRight } from '@/components/brand/Icons'
import { BANNERS, type Banner } from '@/constants/banners'

/**
 * The opening: the designer's banners, edge to edge, and nothing else.
 *
 * WHY THE SECTION IS EMPTY APART FROM THE PICTURE. Each of these is a finished
 * piece with its own headline, its own line of copy, its own call to action and
 * the shop's mark already in the pixels. Anything the site adds around them is
 * the same sentence twice in two voices. So there is no heading, no rail, no
 * gutter and no margin: the artwork starts at the left edge of the screen and
 * ends at the right one, and the page begins underneath it.
 *
 * THE WIDE PIECE IS SHOWN AT 4.73:1 AND THERE IS NO OTHER OPTION. At full width
 * that is 305 pixels on a 1440 screen and 406 on a 1920, which is a strip rather
 * than an opening, and a taller box does not fix it: `cover` on a source wider
 * than its frame crops the SIDES, so a 3:1 window ate a quarter of the width and
 * cut "plus de plaisir en cuisine" in half. Height cannot be taken out of a
 * 14179 x 3000 file; it was never in it.
 *
 * The two ways out are the designer's, not the code's: a 3:1 or 21:9 cut of each
 * banner, or a taller hero built from the 1:1 pieces. Until one arrives, the
 * artwork is shown whole, because a cropped headline is worse than a short one.
 *
 * THE MOTION IS NVC'S STUDIO CAROUSEL. Same machine, to the number: a track
 * translated by `index * (100 / length)` on a spring at stiffness 300, damping
 * 30, autoplay every 5 000ms, and an IntersectionObserver that stops the cycle
 * while the section is off screen. A spring rather than an eased curve is the
 * character of it: the strip arrives with weight and settles, which is what
 * makes a poster read as a panel sliding into place rather than as an image
 * being swapped.
 *
 * THE PHONE WINDOW IS 21:9, AND THE ARITHMETIC PICKED IT, NOT TASTE. It was
 * 16:9, which shows 1.78 / 4.726 = 37.6% of the artwork's width. Measured on the
 * five pieces, the headline alone spans between 26% and 43% of that width, so a
 * 37.6% window cut every one of them: "plus de plaisir en cuisin", "Protégez
 * votre ré", "Imprimez Sans Lim". A 21:9 window shows 49.4%, which clears the
 * widest headline (banner 6, 42.7%) with room on both sides, and it is the last
 * window that does: 2:1 shows 42.3% and clips that same piece by 1.9%.
 *
 * AND THE CROP WAS CENTRED ON THE WRONG POINT. `focus` is documented as where
 * the words sit ACROSS THE ARTWORK, but it was handed straight to
 * `object-position`, which under `cover` measures a fraction of the OVERFLOW,
 * not of the image. On the cuisine piece, focus 70 put the window's centre at
 * 62.5% instead of 70% and shaved the last word off the headline. The
 * conversion below is the whole fix: X = (focus - k/2) / (1 - k), where k is the
 * share of the artwork's width the window shows.
 *
 * THE PHONE HAS NO ARROWS AND NEVER HAD A SWIPE, WHICH LEFT IT NO CONTROL AT
 * ALL. The arrows are `hidden` under sm on purpose: a 48px disc punched into a
 * 154px picture is a hole. But that left five 6px indicators whose hit areas
 * overlapped each other by 24 pixels as the only way to steer, on the one device
 * that cannot hover. So the track now takes a finger: a horizontal drag past 44
 * pixels moves one banner, `touch-action: pan-y` keeps the page scrolling
 * vertically underneath it, and the drag suppresses the click so a swipe never
 * lands on the department page. The indicators become 44px cells on the phone
 * and keep their 6px mark.
 *
 * AND THE PAUSE IS A MOUSE'S, WHICH IS WHY IT USED TO KILL THE PHONE'S TOUR.
 * `pointerenter` fires for a finger as well as for a cursor, and `pointerleave`
 * does not follow it: a thumb set down on the artwork to scroll the page raised
 * `held` and nothing ever lowered it again. Measured on a 360 screen: the strip
 * sat on banner 1 for eleven seconds after one touch, where two ticks should
 * have taken it to banner 3. A touchscreen has a swipe and needs no brake, so
 * the brake is now a mouse's alone.
 */
const AUTOPLAY_MS = 5000
const SPRING = { type: 'spring', stiffness: 300, damping: 30 } as const

/** The artwork's own proportion, and the window the phone shows it through. */
const ART_RATIO = 14179 / 3000
const PHONE_RATIO = 21 / 9
/** Share of the artwork's width that window shows: 0.4937. */
const WINDOW_SHARE = PHONE_RATIO / ART_RATIO

/**
 * `object-position` for the phone window, from the banner's declared `focus`.
 *
 * Under `object-fit: cover` a percentage aligns the same percentage of the image
 * with that percentage of the box, so the visible span is
 * [(1-k)X, (1-k)X + k] and its centre is (1-k)X + k/2. Setting that centre to
 * the declared focus gives the line below. Clamped, because three of the five
 * pieces put their words far enough right that the window ends up flush to the
 * artwork's edge.
 */
function phoneCrop(focus: number): string {
  const x = (focus / 100 - WINDOW_SHARE / 2) / (1 - WINDOW_SHARE)
  return `${Math.round(Math.min(1, Math.max(0, x)) * 1000) / 10}% center`
}

/** A drag shorter than this is a tap, not a swipe. */
const SWIPE_MIN = 44
/** How far the strip follows a finger before it stops giving ground. */
const DRAG_MAX = 110

export function BannerStage() {
  const [tick, setTick] = useState(0)
  const [visible, setVisible] = useState(false)
  const [held, setHeld] = useState(false)
  // Once the reader has steered, the strip stops steering itself. A carousel
  // that resumes its own tour four seconds after someone chose a panel is
  // taking the choice back.
  const [taken, setTaken] = useState(false)
  const section = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  // Off screen, the cycle stops: every step brings a six-megabyte banner into
  // view, and paying for four of them while the reader is three sections down is
  // this component's whole cost spent on nothing.
  useEffect(() => {
    const node = section.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.1,
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || held || reduced || taken) return
    const timer = window.setInterval(() => setTick((current) => current + 1), AUTOPLAY_MS)
    return () => window.clearInterval(timer)
  }, [visible, held, reduced, taken])

  if (BANNERS.length === 0) return null

  return (
    <section
      ref={section}
      aria-label="En avant"
      aria-roledescription="carrousel"
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setHeld(true)
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') setHeld(false)
      }}
      onFocusCapture={() => setHeld(true)}
      // THE SAME ARRIVAL AS THE GREEN BAND, AND ON A PHONE THAT IS THE
      // WHOLE POINT. `.band-in` paints a surface across the page from its
      // leading edge on load, and until now the one saturated band on the site
      // arrived that way while the artwork above it simply existed. Two
      // openings, two behaviours, on the one screen where they are the only two
      // things visible at once. They are now one gesture.
      className="band-in relative w-full overflow-hidden"
    >
      <Track
        tick={tick}
        reduced={reduced}
        onPick={(next) => {
          setTaken(true)
          setTick(next)
        }}
      />
    </section>
  )
}

/**
 * The strip and its controls.
 *
 * One list on every screen. The desktop holds each piece at its own 4.73:1 and
 * the phone takes a 21:9 window centred on the banner's declared `focus`, which
 * is where its words are. It is declared per banner because these pieces
 * disagree: four put the copy on the right, the sound-and-picture one puts it on
 * the left.
 *
 * THE FINGER IS ON ITS OWN LAYER, AND ON PURPOSE. The paged movement is a
 * spring on the inner track; the drag is a plain translate on the wrapper above
 * it, written straight to the node rather than through state. Twelve renders a
 * second on a 360px Android to move a picture sideways is the kind of cost this
 * audience pays for in dropped frames, and the two transforms compose for free.
 */
function Track({
  tick,
  reduced,
  onPick,
}: {
  tick: number
  reduced: boolean | null
  onPick: (tick: number) => void
}) {
  const index = tick % BANNERS.length
  const layer = useRef<HTMLDivElement>(null)
  const from = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)

  const settle = () => {
    const node = layer.current
    if (!node) return
    node.style.transition = ''
    node.style.transform = ''
  }

  // A mouse is left alone: the desktop already has two arrows and a click that
  // must stay a click.
  const grab = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') return
    from.current = { x: event.clientX, y: event.clientY }
    swiped.current = false
  }

  const drag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = from.current
    if (!start) return
    const moved = event.clientX - start.x
    const fell = event.clientY - start.y
    // Below eight pixels the gesture has not declared itself yet; past that, a
    // steeper travel than it is wide belongs to the page, not to the strip.
    if (!swiped.current) {
      if (Math.abs(moved) < 8) return
      if (Math.abs(fell) > Math.abs(moved)) {
        from.current = null
        settle()
        return
      }
      swiped.current = true
    }
    const node = layer.current
    if (!node) return
    node.style.transition = 'none'
    node.style.transform = `translate3d(${Math.max(-DRAG_MAX, Math.min(DRAG_MAX, moved))}px,0,0)`
  }

  const release = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = from.current
    from.current = null
    settle()
    if (!start) return
    const moved = event.clientX - start.x
    if (Math.abs(moved) < SWIPE_MIN) return
    onPick(moved < 0 ? index + 1 : index - 1 + BANNERS.length)
  }

  return (
    <div className="relative">
      <div
        className="touch-pan-y overflow-hidden"
        onPointerDown={grab}
        onPointerMove={drag}
        onPointerUp={release}
        onPointerCancel={() => {
          from.current = null
          settle()
        }}
        // The slides are links, so a swipe would otherwise end on a department
        // page. The capture phase is where that click is stopped.
        onClickCapture={(event) => {
          if (!swiped.current) return
          swiped.current = false
          event.preventDefault()
          event.stopPropagation()
        }}
      >
        <div
          ref={layer}
          className="transition-transform duration-[var(--t-base)] ease-brand"
        >
          <motion.div
            className="flex"
            style={{ width: `${BANNERS.length * 100}%` }}
            animate={{ x: `-${index * (100 / BANNERS.length)}%` }}
            transition={reduced ? { duration: 0 } : SPRING}
          >
            {BANNERS.map((banner: Banner, position) => (
              <Link
                key={banner.file}
                href={banner.href}
                inert={position !== index}
                aria-hidden={position !== index}
                draggable={false}
                style={{ width: `${100 / BANNERS.length}%` }}
                className="relative block shrink-0"
              >
                {/* THE PHONE TAKES A SHORTER WINDOW, NOT A TALLER ONE, AND THAT
                    IS THE PART THAT IS EASY TO GET BACKWARDS. These pieces are
                    14 179 by 3 000, which is 4.73:1. `cover` on a source wider
                    than its frame crops the SIDES, so making the band taller
                    shows LESS of the composition, not more: a 16:9 window came
                    out at 219 pixels and 38 per cent, and cut "Moins d'effort"
                    in half. Going the other way pays twice. At 3:1 the band is
                    130 pixels instead of 167 and shows 63 per cent instead of
                    49.

                    A letterbox filled with the blurred picture was tried, which
                    shows the piece whole at any height. It reads as a photograph
                    resting on a smear of itself, and this page has no other
                    blurred surface anywhere. Cropping honestly and keeping the
                    band low is the quieter answer.

                    `objectPosition` carries the banner's declared `focus`, so
                    what survives the crop is the half with the words in it. */}
                <span className="relative block aspect-[3/1] w-full sm:aspect-[14179/3000]">
                  <Image
                    src={`/branding/${banner.file}`}
                    alt={banner.alt}
                    fill
                    priority={position === 0}
                    sizes="100vw"
                    draggable={false}
                    style={{ objectPosition: phoneCrop(banner.focus) }}
                    className="object-cover select-none sm:!object-[50%_center]"
                  />
                </span>
              </Link>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Manual passage, at the two edges where a hand reaches for it. Quiet: a
          translucent disc that firms up under the pointer, because the artwork is
          what the reader came for and the controls are how they stay with it.
          Hidden from a phone, where the thumb swipes and a 48px disc over the
          picture is a hole punched in it. */}
      <button
        type="button"
        onClick={() => onPick(index - 1 + BANNERS.length)}
        aria-label="Bannière précédente"
        className="press absolute top-1/2 left-4 z-[1] hidden -translate-y-1/2 place-items-center rounded-full bg-[rgb(255_255_255_/_0.55)] text-ink ring-1 ring-[rgb(20_23_21_/_0.12)] backdrop-blur-[2px] transition-[background-color,transform] duration-[var(--t-base)] ease-brand hover:bg-paper active:scale-95 sm:grid sm:size-10 md:left-6 md:size-12"
      >
        <IconChevronLeft className="text-[1.125rem]" />
      </button>
      <button
        type="button"
        onClick={() => onPick(index + 1)}
        aria-label="Bannière suivante"
        className="press absolute top-1/2 right-4 z-[1] hidden -translate-y-1/2 place-items-center rounded-full bg-[rgb(255_255_255_/_0.55)] text-ink ring-1 ring-[rgb(20_23_21_/_0.12)] backdrop-blur-[2px] transition-[background-color,transform] duration-[var(--t-base)] ease-brand hover:bg-paper active:scale-95 sm:grid sm:size-10 md:right-6 md:size-12"
      >
        <IconChevronRight className="text-[1.125rem]" />
      </button>

      {/* On the picture, at its foot, centred. Circles rather than bars because
          they sit on artwork: a bar reads as a rule, and this page draws rules
          to mean structure. Six pixels: they are a position readout, not a
          control anyone hunts for, and the arrows beside them are the control.

          THE MARK AND THE TARGET ARE NOW TWO ELEMENTS, BECAUSE THEY WERE ONE
          AND IT COST THE PHONE ITS CONTROLS. A 6px button with `-inset-4`
          reaches 38px, under the hand's 44, and five of them 14px apart made
          five hit areas that overlapped each other by 24 pixels: on a phone
          every tap in that row was a coin toss. The button is a 44px cell
          below sm, spaced 8px clear of its neighbours, and the span inside it
          keeps the 6px mark. From sm the button is the mark again, at exactly
          its old size, and the pseudo-element carries the pointer's hit area. */}
      <div className="absolute inset-x-0 bottom-0 z-[1] flex items-center justify-center gap-2 sm:bottom-4 md:bottom-5">
        {BANNERS.map((banner, position) => {
          const current = position === index
          return (
            <button
              key={banner.file}
              type="button"
              onClick={() => onPick(position)}
              aria-label={banner.label}
              aria-current={current}
              className={`press relative grid size-11 place-items-center transition-transform duration-[var(--t-base)] ease-brand after:absolute after:inset-0 after:content-[''] sm:size-1.5 sm:after:-inset-4 ${
                current ? 'sm:scale-150' : ''
              }`}
            >
              <span
                className={`block size-1.5 rounded-full ring-1 ring-[rgb(20_23_21_/_0.2)] transition-[background-color,transform] duration-[var(--t-base)] ease-brand ${
                  current
                    ? 'scale-150 bg-paper sm:scale-100'
                    : 'bg-[rgb(255_255_255_/_0.5)] hover:bg-paper'
                }`}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
