import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * The head of a page section: a title, an optional line of context, and an
 * optional escape to the full listing.
 *
 * The escape link is not decoration. Baymard measured 31% of users struggling
 * to reach a product list on sites whose category pages are pure signposts, so
 * every section that shows a subset owes the customer a way past it.
 */
export function SectionHeader({
  title,
  context,
  action,
  as: Heading = 'h2',
}: {
  title: ReactNode
  context?: ReactNode
  action?: { href: string; label: string }
  as?: 'h1' | 'h2' | 'h3'
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-6">
      <div>
        <Heading className="text-[clamp(1.5rem,2.7vw,2rem)] font-bold leading-[1.1] tracking-[-0.028em] text-balance">
          {title}
        </Heading>
        {context ? (
          <p className="mt-1.5 max-w-[56ch] text-[0.9375rem] text-ink-2">{context}</p>
        ) : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="shrink-0 whitespace-nowrap pb-1 text-sm font-semibold text-accent hover:text-accent-ink"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  )
}
