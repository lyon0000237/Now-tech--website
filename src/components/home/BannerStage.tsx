'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

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
 * THE PHONE GETS THE PIECES DRAWN FOR IT, NOT A CROP OF THE OTHERS. A 4.73:1
 * banner on a 390px screen is 82 pixels tall. Every window that makes it taller
 * throws away part of a composition that puts the product on one side and the
 * words on the other, and showing it whole leaves a strip floating in 300 pixels
 * of green. So the phone runs the 1:1 pieces the designer already draws for the
 * social feeds, at full bleed, uncropped, and the wide ones sit that screen out.
 * A department drawn in only one format therefore appears on the screens it was
 * drawn for and on no others, which is a registry rule rather than a crop.
 *
 * Two tracks and one clock. The lists differ in length, so each takes the tick
 * modulo its own, which keeps a single interval and a single source of truth
 * while letting the two run at their own lengths. The hidden track carries
 * `sizes: 0px`, so a screen never fetches the format it will not show.
 */
const AUTOPLAY_MS = 5000
const SPRING = { type: 'spring', stiffness: 300, damping: 30 } as const

export function BannerStage() {
  const [tick, setTick] = useState(0)
  const [visible, setVisible] = useState(false)
  const [held, setHeld] = useState(false)
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
    if (!visible || held || reduced) return
    const timer = window.setInterval(() => setTick((current) => current + 1), AUTOPLAY_MS)
    return () => window.clearInterval(timer)
  }, [visible, held, reduced])

  if (BANNERS.length === 0) return null

  return (
    <section
      ref={section}
      aria-label="En avant"
      aria-roledescription="carrousel"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      className="relative w-full overflow-hidden"
    >
      <Track tick={tick} reduced={reduced} onPick={setTick} />
    </section>
  )
}

/**
 * The strip and its controls.
 *
 * One list on every screen. The desktop holds each piece at its own 4.73:1 and
 * the phone takes a 16:9 window centred on the banner's declared `focus`, which
 * is where its words are. That is the widest window that still gives a phone
 * real height, and it is declared per banner because these pieces disagree:
 * four put the copy on the right, the sound-and-picture one puts it on the left.
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

  return (
    <div className="relative">
      <div className="overflow-hidden">
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
              style={{ width: `${100 / BANNERS.length}%` }}
              className="relative block shrink-0"
            >
              <span className="relative block aspect-video w-full sm:aspect-[14179/3000]">
                <Image
                  src={`/branding/${banner.file}`}
                  alt={banner.alt}
                  fill
                  priority={position === 0}
                  sizes="100vw"
                  style={{ objectPosition: `${banner.focus}% center` }}
                  className="object-cover sm:!object-[50%_center]"
                />
              </span>
            </Link>
          ))}
        </motion.div>
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
          The pseudo-element still gives each one a 42px hit area. */}
      <div className="absolute inset-x-0 bottom-4 z-[1] flex items-center justify-center gap-2 md:bottom-5">
        {BANNERS.map((banner, position) => {
          const current = position === index
          return (
            <button
              key={banner.file}
              type="button"
              onClick={() => onPick(position)}
              aria-label={banner.label}
              aria-current={current}
              className={`press relative size-1.5 rounded-full ring-1 ring-[rgb(20_23_21_/_0.2)] transition-[background-color,transform] duration-[var(--t-base)] ease-brand after:absolute after:-inset-4 after:content-[''] ${
                current ? 'scale-150 bg-paper' : 'bg-[rgb(255_255_255_/_0.5)] hover:bg-paper'
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}
