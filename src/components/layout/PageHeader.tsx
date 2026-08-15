import type { ReactNode } from 'react'

/**
 * The head of an inner page.
 *
 * One shape for every page that is not the homepage, so the transition between
 * a department, a family and an editorial page never feels like a jump to a
 * different site. Left-aligned rather than centred: the homepage opening is a
 * single declarative moment and earns the centre axis, while these pages are
 * the start of a read and want an edge to run down.
 *
 * THE PHONE GETS ITS OWN TOP AND BOTTOM, AND ONLY BECAUSE OF WHAT SITS ABOVE
 * IT. The clamp bottoms out at 48 and 40 pixels, which are desktop numbers that
 * never shrink: under a masthead already 168 pixels tall on a 640 screen, the
 * title of an inner page started at y=216 and the rest of the page below that,
 * so a third of the screen was spent before the page said anything. 32 and 24
 * below `sm` give 32 of those pixels back. The clamp is untouched from `sm` up,
 * where it was already returning its own minimum, so nothing from 640 to 1920
 * moves by a pixel.
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
    <header className="shell pt-8 pb-6 sm:pt-[clamp(3rem,6vw,5.5rem)] sm:pb-[clamp(2.5rem,4vw,4rem)]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-10 gap-y-3">
        <h1 className="max-w-[20ch] text-title font-extrabold leading-[1.04] tracking-[-0.035em] text-balance">
          {title}
        </h1>
        {aside ? <span className="t-num text-small text-ink-3">{aside}</span> : null}
      </div>
      {lead ? (
        <p className="mt-4 max-w-[62ch] text-lead leading-[1.55] text-ink-2 sm:mt-6">{lead}</p>
      ) : null}
    </header>
  )
}
