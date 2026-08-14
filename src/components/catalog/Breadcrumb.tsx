import Link from 'next/link'

/**
 * Where you are, and every way back up.
 *
 * On a catalogue four levels deep, with 268 families under twelve departments,
 * the trail is not decoration: it is the only thing on a listing page that says
 * what the page is a listing OF. A reader who arrives from a search result or a
 * shared link has no other context.
 *
 * The current page is the last step and is not a link. A trail whose last item
 * navigates to the page you are already on is a control that does nothing, and
 * `aria-current` is what turns it back into a statement of position.
 *
 * The separator is a slash rather than a chevron. Chevrons on this site mean a
 * thing that opens or moves; a trail does neither, and the slash is what a path
 * already looks like in the address bar above it.
 */
export function Breadcrumb({
  path,
  current,
}: {
  path: readonly { readonly name: string; readonly href: string }[]
  current: string
}) {
  return (
    <nav aria-label="Fil d’Ariane" className="shell pt-7 md:pt-9">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-micro text-ink-3">
        {path.map((step) => (
          <li key={step.href} className="flex items-center gap-2">
            {/* `py-1` takes the link from 18 to 26 pixels tall. WCAG 2.5.8 asks
                for 24, and a trail on a phone is a real control that gets aimed
                at with a thumb, not decorative text inside a sentence. */}
            <Link href={step.href} className="draw-under py-1 hover:text-accent">
              {step.name}
            </Link>
            <span aria-hidden className="text-rule-2">
              /
            </span>
          </li>
        ))}
        <li>
          {/* Truncated rather than wrapped: product names in this export run to
              ninety characters, and a trail that becomes three lines pushes the
              page's own title below the fold on a phone. */}
          <span aria-current="page" className="block max-w-[46ch] truncate text-ink-2">
            {current}
          </span>
        </li>
      </ol>
    </nav>
  )
}
