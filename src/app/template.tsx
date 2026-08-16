'use client'

import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

/**
 * What the reader sees while a page is being fetched.
 *
 * WHY A TEMPLATE AND NOT A PROGRESS BAR. Next re-mounts a `template.tsx` on
 * every navigation, which is the one hook that fires for every route change
 * without a router listener, a spinner library or a piece of global state. The
 * page arrives rather than appearing, and that arrival IS the feedback: a bar
 * crawling across the top of the screen is a second thing to watch, and it
 * describes a duration nobody measured.
 *
 * THIS IS NVC'S GESTURE, ADAPTED. That site uses the same file with a spring at
 * stiffness 260 and damping 20, and a 20px rise. Two things are changed here.
 * The rise is 12px, because this masthead is 204 pixels tall on a phone and a
 * 20px jump under a fixed header reads as the header moving. And it is an eased
 * curve rather than a spring: everything on this site decelerates into place and
 * nothing overshoots, which is written into the token file as `--ease-draw`, and
 * a page that bounces would be the only thing here that does.
 *
 * 260ms, which is the one number that mattered. Long enough to be seen on a slow
 * connection, short enough that a reader who knows where they are going does not
 * wait for it. Below that the movement is a flicker; above 320 it starts to feel
 * like the site is thinking.
 *
 * IT DOES NOT REPLACE THE SCROLL-REVEAL. `.enter` still stages the bands inside
 * a page as they are scrolled to. This is the page as a whole answering the
 * click; that is its contents answering the scroll. The two run at different
 * moments and neither waits for the other.
 *
 * `useReducedMotion` removes the transform entirely rather than shortening it.
 * A reader who asked for no motion is not asking for less of it.
 */
const EASE_DRAW = [0.22, 1, 0.28, 1] as const

export default function Template({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion()

  return (
    <>
      {/* THE BAR LIVES HERE AND NOT IN A `loading.tsx`, AND THAT IS THE WHOLE
          LESSON OF THIS FILE. A loading.tsx is the framework's own hook for
          "the next page is being fetched", and it cost this site two measured
          faults: it wraps its segment in a Suspense boundary, which streams a
          fallback and commits the HTTP status, so every wrong address answered
          200 instead of 404; and the three pages carrying it were the only
          three on the site reporting a hydration mismatch.

          A template re-mounts on every navigation and creates no boundary, sets
          no status and hydrates once. So the bar is drawn by the page that has
          ARRIVED rather than by the wait, and it sweeps once across the top edge
          of the window as that page settles. It says the same thing to the same
          reader, at the top of the screen where they are looking after a tap,
          and it cannot break a status code.

          `z-50` clears the masthead's 40 and stays under the basket drawer's 70,
          so it draws over the green band and never over a panel the reader
          opened. It is `aria-hidden`: the arrival is announced by the page's own
          heading, and a decorative sweep has nothing to add to that. */}
      {reduced ? null : (
        <motion.span
          aria-hidden
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 1, opacity: 0 }}
          transition={{
            scaleX: { duration: 0.5, ease: EASE_DRAW },
            opacity: { duration: 0.25, delay: 0.42 },
          }}
          style={{ transformOrigin: 'left' }}
          className="fixed inset-x-0 top-0 z-50 block h-[3px] bg-accent"
        />
      )}

      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0.16 } : { duration: 0.26, ease: EASE_DRAW }}
      >
        {children}
      </motion.div>
    </>
  )
}
