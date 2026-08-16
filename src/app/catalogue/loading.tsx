/**
 * What is on screen while this section is being fetched.
 *
 * WHY THIS FILE IS HERE AND NOT AT THE ROOT. It was at the root first, and it
 * broke every 404 on the site. A `loading.tsx` wraps its segment in a Suspense
 * boundary; Next streams the fallback the moment the request arrives, which
 * commits the HTTP status as 200, so a page calling `notFound()` afterwards
 * renders the not-found screen under a 200. Measured: /marque/zzz,
 * /produit/nexistepas and /categorie/nexistepas all answered 200 with the file
 * in place and 404 with it removed. A shop that answers 200 for every wrong
 * address gets every wrong address indexed.
 *
 * So it lives only on the segments that cannot be not-found. The dynamic
 * segments keep their status and go without the bar, which is the right way
 * round: a wrong status is a defect, a missing bar is a missing nicety.
 *
 * WHY IT IS A BAR AND NOT A SKELETON. A skeleton has to guess the shape of the
 * page about to arrive, and this site has seven shapes. A bar says the one thing
 * true of all of them. It travels rather than fills, because a filling bar
 * claims to know a proportion nobody measured.
 */
export default function Loading() {
  return (
    <>
      {/* AT THE VERY TOP OF THE VIEWPORT, ABOVE THE MASTHEAD, NOT INSIDE THE
          PAGE. It was rendered where the page's first section would be, which on
          a phone is 116 pixels down and on a desktop 157: under the chrome, in
          the one place the reader is not looking when they have just tapped
          something. A progress indicator belongs on the edge of the window,
          because the window is what is being replaced.

          `z-50` clears the masthead's 40 and stays under the basket drawer's 70
          and the modal's 80: it must be visible over the header and must never
          cover a panel the reader opened on purpose. */}
      <span
        aria-hidden
        className="route-bar fixed inset-x-0 top-0 z-50 block h-[3px]"
      />
      <span className="sr-only" role="status">
        Chargement de la page
      </span>
    </>
  )
}
