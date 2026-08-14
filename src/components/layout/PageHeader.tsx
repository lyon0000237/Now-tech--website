import type { ReactNode } from 'react'

/**
 * The head of an inner page.
 *
 * One shape for every page that is not the homepage, so the transition between
 * a department, a family and an editorial page never feels like a jump to a
 * different site. Left-aligned rather than centred: the homepage opening is a
 * single declarative moment and earns the centre axis, while these pages are
 * the start of a read and want an edge to run down.
 */
export function PageHeader({
  title,
  lead,
  aside,
}: {
  title: ReactNode
  lead?: ReactNode
  /** A count, a date, anything short that belongs on the title's baseline. */
  aside?: ReactNode
}) {
  return (
    <header className="shell pt-[clamp(3rem,6vw,5.5rem)] pb-[clamp(2.5rem,4vw,4rem)]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-10 gap-y-3">
        <h1 className="max-w-[20ch] text-title font-extrabold leading-[1.04] tracking-[-0.035em] text-balance">
          {title}
        </h1>
        {aside ? <span className="t-num text-small text-ink-3">{aside}</span> : null}
      </div>
      {lead ? <p className="mt-6 max-w-[62ch] text-lead leading-[1.55] text-ink-2">{lead}</p> : null}
    </header>
  )
}
