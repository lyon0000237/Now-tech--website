import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

/**
 * The one button in the system.
 *
 * Renders a link or a button depending on whether it navigates or acts, which
 * is an accessibility decision rather than a styling one. Variants are a closed
 * set: adding a fifth means the design lost an argument, not that the component
 * needs another boolean.
 *
 * SIZE. `md` is 44 pixels tall, which is a hand's target on a phone and the
 * smallest control this site draws. It is wide rather than tall: horizontal
 * padding is what makes a fine button read as deliberate instead of cramped,
 * where extra height only makes it read as a slab. `sm` exists for controls that
 * repeat, such as filter pills, where a row of full-size buttons would become
 * the composition.
 */
type Variant = 'primary' | 'secondary' | 'quiet' | 'on-rail'
type Size = 'md' | 'sm'

/**
 * Each variant names the ground it starts on and the ground the hover draws
 * over it, in `--fill-to`. See `.fill` in globals.css for why it is drawn and
 * not switched.
 */
const VARIANTS: Record<Variant, string> = {
  primary: 'fill bg-accent text-paper [--fill-to:var(--accent-ink)]',
  /* The outline fills with the wash rather than with a colour: a bordered
     button that turns solid on hover has changed weight, not state. */
  secondary: 'fill border border-rule-2 text-ink hover:border-ink [--fill-to:var(--accent-wash)]',
  quiet: 'text-ink-2 hover:text-ink',
  /* On the dark rail the accent is unreadable, so the roles invert: the rail's
     own ink becomes the button and the rail becomes the label. Not --paper and
     --ink, which both flip with the theme: in the dark one the button took the
     page's near-black and sat at 1.34:1 against the green band carrying it. */
  'on-rail': 'fill bg-rail-ink text-rail [--fill-to:var(--rail-ink-2)]',
}

/**
 * The label is bold at 14px, and that is a contrast decision before it is a
 * typographic one.
 *
 * THIS COMMENT USED TO CLAIM THAT 14px BOLD COUNTS AS LARGE TEXT AND THAT THE
 * BUTTON COULD THEREFORE BE FILLED WITH THE MARK'S OWN #009d17 AT 3.60:1. It
 * does not. WCAG sets large-scale at 18pt, which is 24px, or 14pt bold, which is
 * 18.66px bold. 14px bold is neither, so the label is normal text and owes
 * 4.5:1. Every primary button on the site was failing AA on that reading.
 *
 * The fill is --accent, #008013, which carries white at 5.13:1. Same hue, one
 * step of lightness, and the mark keeps #009d17 everywhere it is a shape rather
 * than a ground under a word.
 */
const SIZES: Record<Size, string> = {
  md: 'px-7 py-3 text-[0.875rem] font-bold',
  sm: 'px-5 py-2 text-[0.875rem] font-bold',
}

interface Base {
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
}

const base =
  'press group/action inline-flex items-center justify-center gap-2.5 rounded-control ' +
  'transition-colors duration-[var(--t-fast)] ease-brand'

export function Action({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: Base & Omit<ComponentProps<typeof Link>, 'className' | 'children'>) {
  return (
    <Link className={`${base} ${VARIANTS[variant]} ${SIZES[size]} ${className}`} {...rest}>
      {children}
    </Link>
  )
}
