/**
 * The only place in this repository that talks to the client's WordPress.
 *
 * IT IS A GUEST ON A SITE THAT IS ALSO THE CLIENT'S SHOP WINDOW, AND IT WAS
 * TAUGHT THAT THE HARD WAY. Probing the origin with a handful of ordinary
 * sequential requests earned a 503 in 0.65 seconds: nowtechcenter.com sits
 * behind Cloudflare in DYNAMIC mode with `cache-control: max-age=0`, so
 * everything we ask for goes to the origin, and the origin is slow. Measured
 * against it: a floor of about 2.9 seconds even for a 2-byte answer, 6.5
 * seconds for a warm page of 100 products, 17.6 seconds for a cold one, 15.4
 * seconds for three products fetched by id. Those are not our numbers to
 * improve; they are the numbers we must fit inside.
 *
 * So every rule below exists because of a measurement, not a convention:
 * one request in flight at a time, a pause between them, a timeout well above
 * the 17.6 second cold call, retries only for the codes that mean "busy"
 * (502, 503, 504) and an immediate stop for the ones that mean "go away" (403,
 * 429), and a hard cap on requests per run so a bug cannot turn this into a
 * denial of service against the people paying for the site.
 *
 * TWO ENDPOINTS, AND THEY ARE NOT INTERCHANGEABLE.
 *
 * `wc/store/v1/products` is the WooCommerce Store API: public, no key, and it
 * carries what a shop needs (prices in XAF, stock, the category tree per
 * product, the image list). It is the data source. It also SILENTLY IGNORES
 * `modified_after`: a date in 2030 still returns all 4 273 products, measured.
 * Anything built on that filter here would have quietly resynchronised the
 * whole catalogue every time while reporting that it had done nothing.
 *
 * `wp/v2/product` is the core WordPress endpoint. It carries almost nothing we
 * want, and it HONOURS `modified_after`: 5 products since this morning, 14
 * since the 14th, an empty set for a date in 2030. So it is the clock. Asking
 * it for `_fields=id` costs a few hundred bytes and tells us exactly which
 * products to then ask the Store API for by id.
 *
 * That split is the whole reason a catalogue of 4 273 products can be kept
 * current with two requests a day instead of forty-three pages.
 *
 * `wc/v3/products` is the real WooCommerce REST API and would be better than
 * both. It answers 401: this installation is hardened and nobody has given us
 * a consumer key. If one ever arrives, it belongs here and nowhere else.
 */

const BASE = 'https://nowtechcenter.com/wp-json'

/** Identifiable, with somewhere to complain to. */
const AGENT =
  'NowTechCenterSync/1.0 (+https://now-tech-website.vercel.app; catalogue synchronisation)'

/** Comfortably past the 17.6 second cold call measured on this origin. */
const TIMEOUT_MS = 60_000
/** Between requests, so a run reads as a visitor rather than as a crawler. */
const PAUSE_MS = 1_500
/** Busy answers are worth waiting out; this is the first wait, then doubled. */
const BACKOFF_MS = 5_000
const RETRIES = 3
/**
 * A run that wants more than this has a bug. Forty-three pages plus categories
 * plus a margin: nothing legitimate here needs sixty.
 */
const MAX_REQUESTS = 60

const BUSY = new Set([502, 503, 504, 408, 425])
const REFUSED = new Set([401, 403, 429])

/**
 * Raised when the origin turns us away, so a caller stops rather than hammers.
 *
 * The status is assigned in the body rather than declared as a constructor
 * parameter property: these scripts run under `node scripts/…ts`, which strips
 * types without compiling them, and a parameter property is the one piece of
 * TypeScript that needs real code generated for it.
 */
export class WooRefused extends Error {
  status: number

  constructor(status: number, url: string) {
    super(`nowtechcenter.com a refusé la requête (${status}) : ${url}`)
    this.name = 'WooRefused'
    this.status = status
  }
}

export interface WooBudget {
  spent: number
  readonly cap: number
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function newBudget(cap = MAX_REQUESTS): WooBudget {
  return { spent: 0, cap }
}

/**
 * One request, politely, with the headers the caller may need to read.
 *
 * The total count lives in a header rather than in the body (`x-wp-total`), and
 * for the clock endpoint that header IS the answer, so it is returned rather
 * than thrown away.
 */
async function get(
  path: string,
  params: Record<string, string | number>,
  budget: WooBudget,
): Promise<{ body: unknown; total: number | null; ms: number }> {
  if (budget.spent >= budget.cap) {
    throw new Error(
      `plafond de ${budget.cap} requêtes atteint : la synchronisation s'arrête plutôt que de continuer à solliciter le site du client`,
    )
  }

  const url = new URL(`${BASE}/${path}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value))

  let wait = BACKOFF_MS
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    budget.spent++
    const started = Date.now()
    let response: Response
    try {
      response = await fetch(url, {
        headers: { 'user-agent': AGENT, accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        // Nothing here is ever served from a cache, and asking for one would
        // only hide a stale answer behind a fresh-looking success.
        cache: 'no-store',
      })
    } catch (cause) {
      if (attempt === RETRIES) throw new Error(`réseau injoignable après ${RETRIES} tentatives : ${url}`, { cause })
      await sleep(wait)
      wait *= 2
      continue
    }
    const ms = Date.now() - started

    // A refusal is a decision, not a hiccup. Retrying it is what gets an IP
    // blocked, and this IP belongs to the client's own deployment.
    if (REFUSED.has(response.status)) throw new WooRefused(response.status, url.toString())

    if (BUSY.has(response.status)) {
      if (attempt === RETRIES) throw new Error(`origine occupée (${response.status}) après ${RETRIES} tentatives : ${url}`)
      await sleep(wait)
      wait *= 2
      continue
    }

    if (!response.ok) throw new Error(`réponse inattendue ${response.status} : ${url}`)

    const totalHeader = response.headers.get('x-wp-total')
    const body = await response.json()
    await sleep(PAUSE_MS)
    return { body, total: totalHeader === null ? null : Number(totalHeader), ms }
  }
  throw new Error('inatteignable')
}

/** A product as the Store API hands it over, narrowed to what we consume. */
export interface WooProduct {
  id: number
  name: string
  slug: string
  permalink: string
  sku: string
  type: string
  variations: unknown[]
  is_in_stock: boolean
  is_purchasable: boolean
  on_sale: boolean
  prices: {
    price: string
    regular_price: string
    sale_price: string
    price_range: unknown | null
    currency_code: string
    currency_minor_unit: number
  }
  categories: { id: number; name: string; slug: string; link: string }[]
  images: { id: number; src: string; name: string; alt: string }[]
}

export interface WooCategory {
  id: number
  name: string
  slug: string
  parent: number
  count: number
}

/**
 * THE CLOCK. Which products have been touched since the given instant.
 *
 * `wp/v2` is asked for ids alone, which is a few hundred bytes, and the count
 * comes back in `x-wp-total`. An empty result set omits that header entirely,
 * which is how "nothing has changed" arrives.
 */
export async function changedSince(
  since: string,
  budget: WooBudget,
): Promise<{ ids: number[]; total: number }> {
  const ids: number[] = []
  let page = 1
  let total = 0
  for (;;) {
    const { body, total: reported } = await get(
      'wp/v2/product',
      { per_page: 100, page, _fields: 'id', modified_after: since, orderby: 'id', order: 'asc' },
      budget,
    )
    if (reported !== null) total = reported
    if (!Array.isArray(body) || body.length === 0) break
    for (const row of body as { id: number }[]) ids.push(row.id)
    if (body.length < 100) break
    page++
  }
  return { ids, total: total || ids.length }
}

/** How many products the shop has in total, from one header. */
export async function countProducts(budget: WooBudget): Promise<number> {
  const { total } = await get('wc/store/v1/products', { per_page: 1, _fields: 'id' }, budget)
  if (total === null) throw new Error("l'API n'a pas renvoyé x-wp-total : impossible de connaître le total")
  return total
}

/**
 * Exactly these products, by id.
 *
 * `include` is honoured and is the cheap half of the whole design: 5.8 products
 * change a day, so staying current costs one clock request plus one of these.
 * Batched at 100 because that is the endpoint's own page size.
 */
export async function productsByIds(ids: number[], budget: WooBudget): Promise<WooProduct[]> {
  const out: WooProduct[] = []
  for (let i = 0; i < ids.length; i += 100) {
    const slice = ids.slice(i, i + 100)
    const { body } = await get(
      'wc/store/v1/products',
      { include: slice.join(','), per_page: 100 },
      budget,
    )
    if (!Array.isArray(body)) throw new Error('réponse inattendue sur products?include')
    out.push(...(body as WooProduct[]))
  }
  return out
}

/**
 * Every product, page by page.
 *
 * This is the expensive path: 43 pages, measured at 6.5 seconds warm and 17.6
 * cold, so four to five minutes and tens of megabytes. It belongs to the first
 * synchronisation and to a deliberate full reconciliation, never to a routine
 * one. `onPage` exists so a caller can report progress rather than appear hung.
 */
export async function allProducts(
  budget: WooBudget,
  onPage?: (page: number, pages: number, ms: number) => void,
): Promise<WooProduct[]> {
  const out: WooProduct[] = []
  let page = 1
  let pages = 1
  for (;;) {
    const { body, total, ms } = await get('wc/store/v1/products', { per_page: 100, page }, budget)
    if (total !== null) pages = Math.ceil(total / 100)
    if (!Array.isArray(body) || body.length === 0) break
    out.push(...(body as WooProduct[]))
    onPage?.(page, pages, ms)
    if (body.length < 100) break
    page++
  }
  return out
}

/** The category tree, which is small enough to always take whole. */
export async function allCategories(budget: WooBudget): Promise<WooCategory[]> {
  const out: WooCategory[] = []
  let page = 1
  for (;;) {
    const { body } = await get(
      'wc/store/v1/products/categories',
      { per_page: 100, page },
      budget,
    )
    if (!Array.isArray(body) || body.length === 0) break
    for (const row of body as WooCategory[]) {
      out.push({ id: row.id, name: row.name, slug: row.slug, parent: row.parent, count: row.count })
    }
    if (body.length < 100) break
    page++
  }
  return out
}
