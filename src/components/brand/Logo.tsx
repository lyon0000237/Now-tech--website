import Link from 'next/link'

/**
 * The wordmark.
 *
 * The existing shop mark is a green hexagon stamped into thousands of product
 * photographs, so the brand green is kept rather than replaced. The lozenge is
 * a squared-off echo of that hexagon at the one size where a logo has to work:
 * 11px in a header on a phone.
 */
export function Logo({ href = '/', className = '' }: { href?: string | null; className?: string }) {
  const content = (
    <>
      <span
        aria-hidden
        className="block size-[11px] rotate-45 rounded-[2px] bg-accent"
      />
      <span className="font-extrabold tracking-[-0.035em]">
        NOWTECH <span className="font-normal text-ink-3">CENTER</span>
      </span>
    </>
  )

  const classes = `flex shrink-0 items-baseline gap-2 text-[1.1875rem] leading-none ${className}`

  if (href === null) {
    return <span className={classes}>{content}</span>
  }
  return (
    <Link href={href} className={classes} aria-label="NowTech Center, accueil">
      {content}
    </Link>
  )
}
