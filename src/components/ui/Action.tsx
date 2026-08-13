import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

/**
 * The one button in the system.
 *
 * Renders a link or a button depending on whether it navigates or acts, which
 * is an accessibility decision rather than a styling one. Variants are a closed
 * set: adding a fifth means the design lost an argument, not that the component
 * needs another boolean.
 */
type Variant = 'primary' | 'secondary' | 'quiet'
type Size = 'md' | 'sm'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-paper hover:bg-accent-ink',
  secondary: 'border border-rule-2 text-ink hover:border-ink',
  quiet: 'text-ink-2 hover:text-ink',
}

const SIZES: Record<Size, string> = {
  md: 'px-[22px] py-3 text-[0.90625rem]',
  sm: 'px-4 py-2 text-[0.8125rem]',
}

interface Base {
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-control font-semibold ' +
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

export function ActionButton({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: Base & Omit<ComponentProps<'button'>, 'className' | 'children'>) {
  return (
    <button
      type="button"
      className={`${base} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
