import { NextResponse } from 'next/server'

import {
  getBrandIndex,
  getSearchPage,
  getUniverseBySlug,
  searchFamilies,
  suggest,
  type SearchHit,
} from '@/lib/catalog'

/**
 * What the masthead field asks while it is being typed in.
 *
 * WHY A ROUTE AND NOT A SERVER ACTION OR AN IMPORT. `lib/catalog.ts` is marked
 * `server-only` and the dataset behind it is 3.3 MB. The search field is a
 * client component by necessity — it listens to keystrokes — so it cannot reach
 * the catalogue directly, and shipping any part of it to the browser to make a
 * suggestion list possible would cost every visitor the whole export. The
 * question crosses the wire, the scan happens on the server, ten rows come
 * back. This is the same arrangement `/api/assistant` already uses, on purpose:
 * two different shapes for the same problem would be two things to maintain.
 *
 * The reply echoes the query it answered. `AbortController` on the client
 * already cancels superseded requests, but an abort that lands a millisecond
 * too late still resolves, and a suggestion list showing the answer to three
 * letters ago is worse than an empty one. The echo lets the field assert that
 * what it received is what it last asked.
 *
 * THE DEPARTMENT IS PART OF THE QUESTION, AND THAT IS THE WHOLE POINT OF THIS
 * FILE'S SECOND HALF. The field carries a department selector, and the last row
 * of the panel it feeds reads "Tous les résultats dans Réseaux". This route used
 * to ignore the department entirely: it answered "caméra" with the five
 * best-ranked cameras in the catalogue, four of which were in Sécurité, and then
 * the panel promised a page scoped to Réseaux underneath them. Every one of
 * those rows was a reference the customer would not find on the page the row
 * above it pointed at. Suggestions and destination now answer the same question
 * or the panel does not draw them.
 *
 * WHY `getSearchPage` AND NOT `suggest` PLUS A FILTER. `suggest` ranks by
 * relevance and returns five rows; filtering five rows by department leaves one
 * or none for the frequent case, and there is no exported way to ask the ranker
 * for fifty. `getSearchPage` filters the whole match set by department and
 * paginates it, so its first five rows are five real rows — and they are
 * literally the first five products of the page the last row of the panel leads
 * to, which is a stronger promise than relevance ranking would have been. The
 * ordering is `recent`, the same default that page uses, for exactly that
 * reason.
 *
 * The families are re-asked rather than filtered for the same arithmetic
 * reason: `suggest` keeps the three biggest families in the whole catalogue, and
 * "caméra" scoped to Réseaux would lose all three to Sécurité. `searchFamilies`
 * takes a limit, so this asks for a deep list and keeps the three that belong to
 * the department.
 *
 * The brands are the one list that is filtered rather than re-asked, because
 * there is no brand search that takes a limit. Two rows survive at most, and the
 * rule is one-directional: a brand absent from the department never appears. A
 * brand that IS in the department keeps its catalogue-wide count, because that
 * is the count `/marque/<slug>` will show — the row and its destination agree,
 * which is the only promise a row has to keep.
 */
export interface Destination {
  readonly name: string
  readonly slug: string
  readonly count: number
}

export interface SuggestReply {
  /** The query this reply answers, folded back so the caller can check it. */
  readonly query: string
  /**
   * The department this reply is scoped to, resolved, or null for the whole
   * catalogue. Echoed for the same reason the query is: the reader can change
   * the department while a request is in flight, and an answer for "all
   * departments" applied to a panel that now promises Réseaux is the exact bug
   * this field is here to stop.
   */
  readonly scope: string | null
  readonly products: readonly SearchHit[]
  readonly families: readonly Destination[]
  readonly brands: readonly Destination[]
}

const EMPTY = { products: [], families: [], brands: [] } as const

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams

  /**
   * 100 characters. The longest product name in the export is 96, and
   * `terms()` in the catalogue keeps at most six words anyway, so anything
   * past this cannot change the answer — it can only make the scan longer for
   * whoever sent it.
   */
  const query = params.get('q')?.slice(0, 100).trim() ?? ''

  /* Resolved against the catalogue, never trusted. The field only ever sends a
     slug it was given, but this is a URL and URLs are things people type. An
     unknown department answers for the whole catalogue and says so in `scope`,
     which is what keeps the answer and the promise the same object. */
  const universe = getUniverseBySlug(params.get('rayon')?.slice(0, 60).trim() ?? '')
  const scope = universe?.slug ?? null

  /**
   * Two characters, because one is not a question. A single letter matches
   * hundreds of references on a 4 254-product catalogue and the list it would
   * return is noise the reader has to scroll past on their way to the second
   * keystroke.
   */
  if (query.length < 2) {
    return NextResponse.json<SuggestReply>({ query, scope, ...EMPTY })
  }

  const answer = universe
    ? scoped(query, universe.id, universe.slug, universe.shortName)
    : suggest(query)

  return NextResponse.json<SuggestReply>(
    { query, scope, ...answer },
    {
      /**
       * The catalogue is a build artefact: it changes when the shop
       * redeploys, never between two requests. A minute in the browser and a
       * day at the edge means a customer who deletes a letter and retypes it
       * pays for that round trip once, which on a Cameroonian mobile
       * connection is the whole difference between a field that keeps up with
       * the typing and one that trails it.
       *
       * `Vary` is not needed: the department rides in the query string, so two
       * departments are two URLs and two cache entries.
       */
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=86400' },
    },
  )
}

/**
 * The same three lists, held to one department.
 *
 * `departmentName` is the department's short label, which is what `getBrandIndex`
 * carries per brand. Those labels are unique across the twelve, so matching on
 * one is exact rather than approximate.
 */
function scoped(
  query: string,
  universeId: string,
  universeSlug: string,
  departmentName: string,
): { products: readonly SearchHit[]; families: readonly Destination[]; brands: readonly Destination[] } {
  const page = getSearchPage(query, universeSlug, 'recent', 1)

  const inDepartment = new Set(
    getBrandIndex()
      .filter((brand) => brand.departments.includes(departmentName))
      .map((brand) => brand.slug),
  )

  return {
    products: page.products.slice(0, 5).map((product) => ({
      slug: product.slug,
      name: product.name,
      price: product.price,
      inStock: product.inStock,
      image: product.image,
      categoryName: product.categoryName,
    })),
    /* Twenty-four deep, three kept. A family belongs to exactly one department,
       so this filter is total: what survives it is a page that cannot disagree
       with the department named at the foot of the panel. */
    families: searchFamilies(query, 24)
      .filter((family) => family.universeId === universeId)
      .slice(0, 3)
      .map((family) => ({ name: family.name, slug: family.slug, count: family.totalCount })),
    brands: page.brands.filter((brand) => inDepartment.has(brand.slug)),
  }
}
