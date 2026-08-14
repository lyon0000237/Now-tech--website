'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

import { IconArrowRight } from '@/components/brand/Icons'
import type { PromoPanel } from '@/lib/catalog'

/**
 * The banner band under the deck, two at a time.
 *
 * WHY IT TRAVELS. Two panels standing still were a pair of shortcuts to the two
 * departments a customer already knew they wanted. Six that walk are the shop
 * saying it has six counters, in the space the two took.
 *
 * WHY PAGES OF TWO AND NOT A FREE SCROLL. A strip that slides by one panel makes
 * the reader track a moving target, and it always leaves a half-panel at the
 * edge, which reads as a layout that ran out of room. Whole pages arrive
 * composed: two banners land together, sit still long enough to be read, and
 * leave together.
 *
 * WHY IT OVERSHOOTS. This is the one bounce on the site, and it is three per
 * cent. Everything else decelerates and stops exactly, which is right for a rack
 * rail and wrong for a poster: a banner that lands dead reads as a slide, one
 * that lands with a little weight reads as a thing that was thrown.
 *
 * WHY IT WALKS BACK. Three pages that loop have to rewind two widths at the end.
 * It goes 1, 2, 3, 2, 1 instead, so every move is one page in one direction and
 * no frame is spent rewinding.
 */
const ADVANCE_MS = 5600
const PER_PAGE = 2
const REDUCED = '(prefers-reduced-motion: reduce)'

function useMotionAllowed(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const query = window.matchMedia(REDUCED)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return useSyncExternalStore(
    subscribe,
    () => !window.matchMedia(REDUCED).matches,
    () => false,
  )
}

export function PromoBand({ panels }: { panels: readonly PromoPanel[] }) {
  const pages = Math.ceil(panels.length / PER_PAGE)
  const [page, setPage] = useState(0)
  const [paused, setPaused] = useState(false)
  const [heading, setHeading] = useState(1)
  const travels = useMotionAllowed() && pages > 1

  useEffect(() => {
    if (!travels || paused) return
    const timer = window.setTimeout(() => {
      setPage((current) => {
        const next = current + heading
        if (next >= pages || next < 0) {
          setHeading(-heading)
          return current - heading
        }
        return next
      })
    }, ADVANCE_MS)
    return () => window.clearTimeout(timer)
  }, [travels, paused, page, pages, heading])

  if (panels.length === 0) return null

  return (
    <div
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
    >
      <div
        role="group"
        aria-roledescription="carrousel"
        aria-label="Rayons en avant"
        className="w-full overflow-hidden"
      >
        <div
          className="flex transition-transform duration-[var(--e-bounce)] ease-[var(--ease-bounce)] motion-reduce:transition-none"
          style={{ transform: `translateX(-${page * 100}%)` }}
        >
          {Array.from({ length: pages }, (_, group) => (
            <div
              key={group}
              inert={group !== page}
              aria-hidden={group !== page}
              className="grid w-full shrink-0 gap-5 sm:grid-cols-2 sm:gap-6"
            >
              {panels.slice(group * PER_PAGE, group * PER_PAGE + PER_PAGE).map((panel) => (
                <Link
                  key={panel.id}
                  href={panel.href}
                  className="group flex flex-col items-start gap-6 rounded-space bg-space p-6 transition-colors duration-[var(--t-base)] hover:bg-space-2 sm:flex-row sm:items-center sm:gap-8 sm:p-8 xl:gap-10 xl:p-10"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sub font-semibold leading-[1.2] tracking-[-0.02em] text-balance">
                      {panel.headline}
                    </p>
                    <p className="mt-3.5 text-small leading-[1.6] text-pretty text-ink-2">
                      {panel.body}
                    </p>
                    <span className="mt-7 inline-flex items-center gap-2.5 text-small font-semibold text-accent">
                      <span className="measure">Voir le rayon</span>
                      <IconArrowRight className="travel text-[1.0625rem]" />
                    </span>
                  </div>

                  {panel.image ? (
                    <span
                      aria-hidden
                      className="relative block aspect-[16/10] w-full shrink-0 overflow-hidden rounded-well bg-surface sm:aspect-square sm:w-[30%] sm:max-w-[15rem] xl:w-[34%]"
                    >
                      <Image
                        src={panel.image}
                        alt=""
                        fill
                        sizes="(max-width: 639px) 46vw, (max-width: 1279px) 26vw, 240px"
                        className="lift object-contain p-4"
                      />
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* The pages are the control. There is no stop button beside them: the band
          halts while a pointer is on it, and a dot is a way to say which page
          rather than a way to say later. */}
      {travels ? (
        <div className="mt-7 flex items-center gap-2.5">
          {Array.from({ length: pages }, (_, group) => (
            <button
              key={group}
              type="button"
              onClick={() => {
                setHeading(group >= page ? 1 : -1)
                setPage(group)
              }}
              aria-label={`Page ${group + 1} sur ${pages}`}
              aria-current={group === page}
              // 3px tall is a 3px target. The bar keeps its weight and the
              // pseudo-element carries a thumb-sized hit area around it.
              className="press relative h-[3px] w-9 rounded-pill transition-colors duration-[var(--t-base)] after:absolute after:-inset-5 after:content-['']"
              style={{ background: group === page ? 'var(--accent)' : 'var(--rule-2)' }}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
