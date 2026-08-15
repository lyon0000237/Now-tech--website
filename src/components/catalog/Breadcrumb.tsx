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
 *
 * ON A PHONE THE TRAIL IS THE PARENT AND NOTHING ELSE, AND THAT IS A MEASURED
 * DECISION. At 360 the four steps of /categorie/ordinateurs-portables-laptop —
 * "Catalogue / Ordinateurs & Accessoires / Ordinateurs / Ordinateurs portables
 * / Laptop" — needed 518 pixels in a 306-pixel shell, so they wrapped onto two
 * lines and the ol came out 56 pixels tall with every link 26 pixels tall
 * inside it: four undersized targets stacked in two rows, above a title they
 * were pushing down. Only the LAST parent survives under `sm`, which is the one
 * step that answers "a listing of what"; the ones above it are one tap away on
 * the page it leads to, and none of them is lost to a pointer — `sm:flex` draws
 * the whole trail again, measured unchanged at 1440: ol 1224 x 26, first link
 * 63.7 x 26, current 185.4 x 18 at x 465.6.
 *
 * THE LINK IS 44 PIXELS TALL ON A PHONE AND 26 FROM `sm` UP. WCAG 2.5.8 is
 * satisfied by 24, and 24 is not what a thumb needs in a moving taxi; a
 * pointer, which is what the 26 was drawn for, needs neither.
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
        {path.map((step, index) => (
          <li
            key={step.href}
            /* Every step but the last is a pointer's affordance: drawn from
               `sm` up, absent below it. See the head of this file. */
            className={`items-center gap-2 ${
              index === path.length - 1 ? 'flex' : 'hidden sm:flex'
            }`}
          >
            <Link
              href={step.href}
              className="draw-under flex min-h-11 items-center py-1 hover:text-accent sm:block sm:min-h-0"
            >
              {step.name}
            </Link>
            <span aria-hidden className="text-rule-2">
              /
            </span>
          </li>
        ))}
        {/* `flex-1` with `min-w-0` is what lets the truncation actually fire on
            a phone: without it the item is sized by its own content and a
            ninety-character product name pushes the trail off the shell instead
            of ellipsing inside it. `sm:flex-none` hands the sizing back to the
            content, which is what the 46ch cap is measured against. */}
        <li className="min-w-0 flex-1 sm:flex-none">
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
