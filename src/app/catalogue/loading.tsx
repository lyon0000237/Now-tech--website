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
    <div className="shell pt-band" aria-busy="true">
      <span className="route-bar block h-[3px] w-full rounded-pill" />
      <span className="sr-only" role="status">
        Chargement de la page
      </span>
    </div>
  )
}
