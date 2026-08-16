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
 */
export function NavigationProgress() {
  const pathname = usePathname()
  const params = useSearchParams()
  const here = `${pathname}?${params.toString()}`
  const [startedAt, setStartedAt] = useState<string | null>(null)

  const pending = startedAt !== null && startedAt === here

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
    }

    // Back and forward are navigations the reader also waits through.
    const onPop = () =>
      setStartedAt(`${window.location.pathname}?${window.location.search.replace(/^\?/, '')}`)

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
