'use client'

import { useEffect } from 'react'

/**
 * Turns on the CSS entrance for anything carrying `.reveal` inside the page.
 *
 * One observer for the whole document rather than one per card. A category page
 * can hold 300 cards, and shipping a motion runtime per card would spend the
 * customer's data and their phone's main thread on decoration.
 *
 * Elements already on screen at load are marked shown immediately and never
 * animate: animating the first viewport delays perceived load and makes the new
 * storefront feel slower than the one it replaces.
 */
export function Reveal() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const show = (element: Element) => element.setAttribute('data-shown', 'true')

    const nodes = document.querySelectorAll<HTMLElement>('.reveal:not([data-shown])')
    if (media.matches) {
      nodes.forEach(show)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          show(entry.target)
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )

    const viewportHeight = window.innerHeight
    nodes.forEach((node) => {
      if (node.getBoundingClientRect().top < viewportHeight) show(node)
      else observer.observe(node)
    })

    return () => observer.disconnect()
  })

  return null
}
