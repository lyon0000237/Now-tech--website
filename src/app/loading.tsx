/**
 * What is on screen while the next page is being fetched.
 *
 * WHY THIS EXISTS AT ALL. `template.tsx` animates a page that has ARRIVED, which
 * is the wrong half of the problem: between the tap and the arrival there was
 * nothing, and on a Cameroonian mobile connection that gap is seconds, not
 * frames. Next replaces this segment with this file for exactly that interval,
 * and it is the only global hook the App Router gives for it. `useLinkStatus`
 * reads the pending state of one Link and would have to be threaded through
 * every link on the site.
 *
 * WHY IT IS A BAR AND NOT A SKELETON. A skeleton of the page about to load has
 * to guess that page's shape, and this site has seven shapes. A bar says the one
 * thing that is true of all of them: something is coming. It travels rather than
 * fills, because a filling bar claims to know a proportion nobody measured.
 *
 * It keeps the masthead and the footer, which live in the layout, so the reader
 * never loses the chrome they were using.
 */
export default function Loading() {
  return (
    <div className="shell pt-band" aria-busy="true">
      <span className="route-bar block h-[3px] w-full rounded-pill" />
      <span className="sr-only" role="status">
        Chargement de la page
      </span>
    </div>
  )
}
