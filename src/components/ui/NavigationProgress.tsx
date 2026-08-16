'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * The bar that runs while the next page is actually being fetched.
 *
 * THREE ATTEMPTS, AND WHY THE FIRST TWO WERE WRONG.
 *
 * A `loading.tsx` was first, because it is the framework's own hook for exactly
 * this. It wraps its segment in a Suspense boundary, and that cost two measured
 * faults: the fallback is streamed the moment the request arrives, which commits
 * the HTTP status, so every wrong address on the site answered 200 instead of
 * 404; and the three pages carrying it were the only three reporting a hydration
 * mismatch, which survived removing the live region and reducing the fallback to
 * one decorative span.
 *
 * The bar then moved into `template.tsx`, which re-mounts on every navigation
 * and creates no boundary. It is honest about the page having changed and
 * useless as a progress indicator, because a template only exists once the new
 * page has ARRIVED: the bar ran after the wait it was supposed to describe. The
 * client said so in one sentence and was right.
 *
 * SO THE START IS THE CLICK, AND THE END IS THE ROUTE. A navigation begins when
 * a reader presses a link, which is an event this can hear, and it ends when the
 * pathname or the query changes, which is a value this can read. Between those
 * two the reader is waiting, and that is precisely the interval nothing was
 * covering. Next 16 exposes `useLinkStatus`, which is the same fact per link,
 * but it only answers inside a `Link` and there are several hundred of them
 * here; one listener on the document is the same information for one component.
 *
 * NO STATE IS SET FROM AN EFFECT. `pending` is derived: the click records the
 * route it was fired from, and the bar shows while that recorded route is still
 * the current one. When the new route commits the two stop matching and the bar
 * is gone, with no effect to write it and no render with the wrong value first.
 *
 * IT DOES NOT CLAIM A PERCENTAGE. Nobody measured one. The bar travels rather
 * than fills, which says "still working" without inventing how much is left.
 *
 * AND IT STAYS LONG ENOUGH TO BE SEEN, WHICH IT DID NOT. The shop reported the
 * indicator had disappeared. It had not: measured frame by frame on a real
 * click, it appeared for THREE FRAMES, seven milliseconds, and was gone. Nothing
 * was broken, there was simply nothing left to wait for. Every `Link` on this
 * site is prefetched when the pointer reaches it, so by the time the button goes
 * down the next page is already in the client, and the honest duration of that
 * navigation really is seven milliseconds.
 *
 * Seven milliseconds is not feedback, it is a flicker, and a flicker is worse
 * than silence. So once the bar is up it stays up for `FLOOR_MS`, whether or not
 * the page beat it there. This is the one concession to appearance in the whole
 * component and it is worth naming: for a fast navigation the bar outlives the
 * wait it describes. It is defensible because the bar never claimed to measure
 * anything, only to say that a press was received and the site is going
 * somewhere, and because the alternative on a prefetched route is a press that
 * produces no visible response at all. On the connections this shop is actually
 * used over, the route is the slower of the two and the floor never binds.
 */
/** Below this, a reader sees a glitch rather than an answer. */
const FLOOR_MS = 500

export function NavigationProgress() {
  const pathname = usePathname()
  const params = useSearchParams()
  const here = `${pathname}?${params.toString()}`
  const [startedAt, setStartedAt] = useState<string | null>(null)
  // Set with the click and cleared by a timer, never by the route: this is the
  // half of the bar's life that the network does not control.
  const [holding, setHolding] = useState(false)

  const waiting = startedAt !== null && startedAt === here
  const pending = waiting || holding

  // The page arrived before the floor did. Keep the bar for what is left of it.
  useEffect(() => {
    if (!holding) return
    const timer = window.setTimeout(() => setHolding(false), FLOOR_MS)
    return () => window.clearTimeout(timer)
  }, [holding])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      // Anything the browser handles itself: a new tab, a download, a modified
      // click. None of them replace this page, so none of them are a wait.
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const link = (event.target as HTMLElement | null)?.closest('a')
      if (!link) return
      if (link.target && link.target !== '_self') return
      if (link.hasAttribute('download')) return

      const href = link.getAttribute('href')
      if (!href || href.startsWith('#')) return

      const url = new URL(link.href, window.location.href)
      if (url.origin !== window.location.origin) return
      // The same address is not a navigation, and an in-page anchor is the
      // browser scrolling, not the server answering.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return

      setStartedAt(`${window.location.pathname}?${window.location.search.replace(/^\?/, '')}`)
      setHolding(true)
    }

    // Back and forward are navigations the reader also waits through.
    const onPop = () => {
      setStartedAt(`${window.location.pathname}?${window.location.search.replace(/^\?/, '')}`)
      setHolding(true)
    }

    document.addEventListener('click', onClick, { capture: true })
    window.addEventListener('popstate', onPop)
    return () => {
      document.removeEventListener('click', onClick, { capture: true })
      window.removeEventListener('popstate', onPop)
    }
  }, [])

  if (!pending) return null

  return (
    <span
      aria-hidden
      // `z-50` clears the masthead's 40 and stays under the basket drawer's 70,
      // so it draws over the green band and never over a panel the reader opened
      // on purpose. `route-bar` is in globals.css: a travelling segment, not a
      // filling one, and it holds still under prefers-reduced-motion.
      className="route-bar fixed inset-x-0 top-0 z-50 block h-[3px]"
    />
  )
}
