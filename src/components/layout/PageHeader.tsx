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
 *
 * AND THE PHONE NUMBERS CAME DOWN AGAIN, TO 24 AND 20, BECAUSE THIS HEADER IS
 * NOT THE PAGE. Measured at 390 on /categorie/ordinateurs-portables-laptop,
 * this block ran 188 to 394 — 206 pixels — for a title, a count and two lines
 * of lead, and the first product photograph on that page was at y=900. On a 844
 * screen with 116 pixels of masthead, every pixel this block spends is a pixel
 * the reader pays before seeing anything the shop sells. The four that were cut
 * are all air and none of them is a word: 32 to 24 above, 24 to 20 below, the
 * gap between the title and the count 12 to 6, the gap above the lead 16 to 12.
 * 206 becomes 184.
 *
 * THE COUNT WAS NOT MOVED AND NOT HIDDEN, THOUGH IT IS THE OBVIOUS 31 PIXELS.
 * Below `sm` the title takes the whole measure and the aside wraps under it,
 * and on a listing page the same figure is printed again by the sort bar a few
 * hundred pixels down. It stays because this header also serves /a-propos,
 * /contact, /devis and /recherche, and on the empty-result state of the last
 * one the aside is the only place the figure appears at all. A component that
 * drops information on a phone because four of its six callers happen to repeat
 * it elsewhere is a trap laid for the fifth.
 *
 * THE LEAD KEEPS ITS 17 PIXELS ON A PHONE. It is the one line of type on the
 * page that argues rather than labels, and on /devis and /a-propos it IS the
 * page; setting it at body size below `sm` would have bought about 7 pixels on
 * a listing and cost those two their voice.
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
    <header className="shell pt-6 pb-5 sm:pt-[clamp(3rem,6vw,5.5rem)] sm:pb-[clamp(2.5rem,4vw,4rem)]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-10 gap-y-1.5 sm:gap-y-3">
        <h1 className="max-w-[20ch] text-title font-extrabold leading-[1.04] tracking-[-0.035em] text-balance">
          {title}
        </h1>
        {aside ? <span className="t-num text-small text-ink-3">{aside}</span> : null}
      </div>
      {lead ? (
        <p className="mt-3 max-w-[62ch] text-lead leading-[1.55] text-ink-2 sm:mt-6">{lead}</p>
      ) : null}
    </header>
  )
}
