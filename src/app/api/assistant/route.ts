import { NextResponse } from 'next/server'

import {
  getAllProducts,
  getBrandIndex,
  getCategories,
  getCategoryById,
  getFamilyCount,
  getMeta,
  getProductBySlug,
  getProductsInUniverse,
  getRecentProducts,
  getUniverses,
  searchCatalog,
  searchFamilies,
} from '@/lib/catalog'
import type { Product } from '@/types/catalog'
import { formatAmount, formatCount, formatPrice } from '@/lib/format'
import {
  BRAND_QUESTION_CUES,
  CART_CUES,
  CEILING_CUES,
  COMPARE_CUES,
  COUNTER_CITIES,
  CURRENCY_WORDS,
  FALLBACK,
  FLOOR_CUES,
  GREETING_CUES,
  HELP_CUES,
  OPENING,
  PRICE_CUES,
  PROMO_CUES,
  QUANTITY_CUES,
  REFERENCE_CUES,
  SHIPPED_CITIES,
  STOCK_CUES,
  TOPICS,
  type AssistantBand,
  type AssistantBasketLine,
  type AssistantColumn,
  type AssistantFigure,
  type AssistantFollow,
  type AssistantLink,
  type AssistantProduct,
  type AssistantReply,
  type AssistantScope,
  type AssistantTally,
} from '@/constants/assistant'
import { DELIVERY_CITIES, SHOWROOMS } from '@/constants/site'

/**
 * The one thing Bod cannot do in the browser.
 *
 * The catalogue is 3.3 MB and lives behind `server-only`, which is the whole
 * reason this route exists: shipping it to the client so a chat widget could
 * grep it would cost every visitor the entire dataset for a feature most never
 * open. The question comes here, the scan happens on the server, and an answer
 * of at most a dozen rows goes back.
 *
 * NO MODEL, NO KEY, NO THIRD PARTY, AND NO GUESSING. Every sentence returned
 * below is either counted out of the export in this file or written down in
 * `constants/assistant.ts`, and the reply says which by naming its own intent.
 * Anything that is neither comes back with `handoff`, and the panel turns that
 * into WhatsApp with the question already typed.
 *
 * THE QUESTION IS RESOLVED BEFORE IT IS SEARCHED. The amounts, the budget cues,
 * the stock cues, the price cues, the greetings, the discount words, the unit
 * counts and the city names are lifted out, and only what is left is treated as
 * the name of a thing. That single rule is what makes a budget filter, a price
 * answer, a stock answer, a discount answer and a brand answer possible, because
 * all five are the same query wearing different words.
 *
 * WHAT WAS ADDED IN THIS PASS, AND WHAT EACH ONE FIXES. Measured against real
 * questions before the change:
 *
 *   "il me faut 12 cameras"    -> nothing at all. `12` was a required search
 *                                 term, so the query matched only cameras with
 *                                 12 in the name. Now the count is read as a
 *                                 quantity when a quantity word is present, and
 *                                 a bare number that finds nothing is dropped on
 *                                 a second pass rather than sinking the query.
 *   "promo camera"             -> nothing at all, same cause with `promo`.
 *                                 Discount is now a filter over the 40 %-or-more
 *                                 set, which is the same set /catalogue?remise=1
 *                                 renders.
 *   "quelles marques de switch"-> nothing at all, same cause with `marques`.
 *                                 A brand question is now answered with a counted
 *                                 breakdown of the set rather than a product.
 *   "reference 12345"          -> the refusal message, for the one identifier a
 *                                 customer arrives holding. It is the id the
 *                                 product page prints as `Réf.`, so the lookup is
 *                                 exact.
 *   "quel budget pour une camera" -> a min and a max 150 and 1 620 000 apart,
 *                                 which tells a buyer nothing. The set is now
 *                                 cut into three counted price bands at its own
 *                                 tertiles, and each band is a question Bod can
 *                                 answer.
 *   "hikvison"                 -> one unrelated reference whose name carries the
 *                                 same typo. A near miss against the brand and
 *                                 family vocabulary is now offered by name.
 *
 * EVERY COUNT IS THE COUNT OF THE PAGE IT LINKS TO. A family answer counts
 * `getProductsInCategory`, which is the set the family facet filters to and the
 * set `/categorie/` renders. A department answer counts `getProductsInUniverse`,
 * which is the set the `rayon` facet filters to. A brand answer counts products
 * whose `brand` is that brand, which is the set the `marque` facet filters to.
 * A band of the price ladder counts what its own follow-up will count, because
 * the follow-up carries the bounds the band was counted with rather than a
 * sentence that has to be parsed again.
 */

/* -------------------------------------------------------------------------- */
/* Reading the question                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Folded to bare ASCII words.
 *
 * A substring match on a two-letter cue once routed "vous ouvrez à quelle
 * heure" to the counter-addresses answer, because "ou" is inside "vous". The
 * shop's opening hours are not in the data at all, so that question must reach a
 * human, and it now does. Everything here matches whole words.
 */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Digit groups joined before anything else looks at them.
 *
 * A Cameroonian buyer writes two hundred thousand francs as `200 000`, and
 * every one of `200.000`, `200'000` and `200000` turns up in the same field.
 * Left alone, the first three arrive as the two tokens `200` and `000`, and a
 * budget of two hundred thousand is read as a budget of two hundred. The lookahead
 * requires exactly a group of three, so `1500 VA` is never touched.
 */
function joinAmounts(value: string): string {
  let out = value
  for (let pass = 0; pass < 3; pass += 1) {
    out = out.replace(/(\d)[\s. '](\d{3})(?!\d)/g, '$1$2')
  }
  // `200k` and `1,5M` are how a number is abbreviated in a hurry.
  return out.replace(/(\d+)\s*k\b/gi, (_, n: string) => `${Number(n) * 1000}`)
}

function tokens(value: string): string[] {
  return fold(joinAmounts(value)).split(' ').filter(Boolean)
}

const has = (list: readonly string[], words: readonly string[]) =>
  list.some((word) => words.includes(word))

/**
 * Words that are never the name of a thing.
 *
 * THIS SET IS THE WHOLE FIX. `searchCatalog` requires every term to match
 * something, which is right for a search field and fatal for a question: one
 * "combien" in front of "switch" and the query matches nothing at all. These are
 * lifted out before the search runs, and what they meant is carried in the
 * intent and the filters instead of being thrown away.
 */
const NOISE = new Set<string>([
  ...PRICE_CUES, ...STOCK_CUES, ...CEILING_CUES, ...FLOOR_CUES,
  ...CURRENCY_WORDS, ...GREETING_CUES, ...HELP_CUES, ...COMPARE_CUES,
  ...PROMO_CUES, ...BRAND_QUESTION_CUES, ...QUANTITY_CUES, ...REFERENCE_CUES,
  'je', 'j', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'me', 'moi', 'mon', 'ma', 'mes',
  'votre', 'vos', 'notre', 'nos', 'ce', 'cet', 'cette', 'ces', 'ca', 'cela', 'c',
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'd', 'l', 'au', 'aux', 'a',
  'et', 'ou', 'en', 'y', 'est', 'sont', 'ai', 'as', 'avez', 'avoir', 'avais',
  'entre', 'contre', 'versus',
  /* THE NAME OF A TOWN IS NEVER THE NAME OF A THING. Measured: "caméra à
     Douala" was answered with the two Douala counters and the word "caméra" was
     thrown away, because the place answer ran first and only ever looked for a
     city. Left in the search instead, it is just as bad: `searchCatalog`
     requires every term to match, and no product is called Douala, so the query
     returned nothing. Lifted out here, the sentence keeps its merchandise and
     the counter answer still sees the city, because `counter` reads the raw
     words rather than the terms. */
  ...COUNTER_CITIES.flatMap((entry) => entry.cues), ...SHIPPED_CITIES,
  'etre', 'suis', 'sur', 'sous', 'dans', 'pour', 'par', 'avec', 'chez', 'que',
  'qui', 'quoi', 'quel', 'quelle', 'quels', 'quelles', 'ya', 'faire', 'fait',
  'cherche', 'chercher', 'veux', 'voudrais', 'trouve', 'trouver',
  'svp', 'merci', 'stp', 'please', 'bien', 'tres', 'assez', 'vraiment',
])

interface Reading {
  readonly words: readonly string[]
  /** What is left once every cue, amount and courtesy has been lifted out. */
  readonly terms: string
  readonly min: number | null
  readonly max: number | null
  readonly wantsStock: boolean
  readonly wantsPrice: boolean
  readonly wantsCheapest: boolean
  readonly wantsPromo: boolean
  readonly wantsBrands: boolean
  /**
   * The word "budget" was used, which changes what the docket calls the answer
   * and nothing else.
   *
   * "Quel budget pour un laptop" was filed under `Recherche`, and the label on
   * an entry is the one place a reader can check that the question was read the
   * way they meant it. It does NOT join `wantsPrice`, because that reorders the
   * merchandise cheapest first, and the answer to "quel budget" is the price
   * ladder rather than the three cheapest boxes in the shop.
   */
  readonly wantsBudget: boolean
  /** A count of units, or null. See {@link QUANTITY_CUES}. */
  readonly quantity: number | null
}

/**
 * A budget, and only when the reader said it was one.
 *
 * "Onduleur 1500 VA" carries a number that is a specification. Read as a
 * ceiling it would return every onduleur under 1 500 FCFA, which is none of
 * them, and the panel would report zero results for a query that has eleven. So
 * an amount becomes a bound only when a bound word stands within three tokens in
 * front of it, and the answer always repeats the bound it used so the reading
 * can be checked at a glance.
 *
 * A bare `entre A et B` is read as a range without needing either cue list.
 */
function readBounds(words: readonly string[]): {
  min: number | null
  max: number | null
  used: ReadonlySet<number>
} {
  const used = new Set<number>()
  let min: number | null = null
  let max: number | null = null

  const amountAt = (index: number): number | null => {
    const word = words[index]
    if (word === undefined || !/^\d+$/.test(word)) return null
    const value = Number(word)
    // Under a thousand francs the catalogue holds 22 references out of 4 254, so
    // a small number is almost always a port count, a rating or a screen size.
    // It is a price only when the reader wrote the currency after it.
    const priced = value >= 1000 || CURRENCY_WORDS.includes(words[index + 1] ?? '')
    return priced ? value : null
  }

  for (let i = 0; i < words.length; i += 1) {
    if (words[i] !== 'entre') continue
    const first = words.findIndex((word, at) => at > i && /^\d+$/.test(word))
    if (first === -1) break
    const second = words.findIndex((word, at) => at > first && /^\d+$/.test(word))
    if (second === -1) break
    const low = amountAt(first)
    const high = amountAt(second)
    if (low === null || high === null) break
    min = Math.min(low, high)
    max = Math.max(low, high)
    used.add(i).add(first).add(second)
    if (words[first + 1] === 'et') used.add(first + 1)
    break
  }

  if (min === null && max === null) {
    for (let i = 0; i < words.length; i += 1) {
      const value = amountAt(i)
      if (value === null) continue
      const before = words.slice(Math.max(0, i - 3), i)
      if (has(before, CEILING_CUES)) {
        max = max === null ? value : Math.min(max, value)
      } else if (has(before, FLOOR_CUES)) {
        min = min === null ? value : Math.max(min, value)
      } else {
        continue
      }
      used.add(i)
      for (let back = Math.max(0, i - 3); back < i; back += 1) {
        if (CEILING_CUES.includes(words[back]) || FLOOR_CUES.includes(words[back])) used.add(back)
      }
    }
  }

  // The currency word belongs to the amount, never to the search.
  for (const index of [...used]) {
    if (CURRENCY_WORDS.includes(words[index + 1] ?? '')) used.add(index + 1)
  }

  return { min, max, used }
}

function read(query: string): Reading {
  const words = tokens(query)
  const { min, max, used } = readBounds(words)
  const taken = new Set(used)

  /* A COUNT OF UNITS IS ONLY A COUNT WHEN THE READER SAID SO. "il me faut 12
     caméras" is a quantity; "switch 24 ports" is a specification and reading it
     as a quantity would be exactly as wrong as reading it as a price. The cue
     list is the whole guard, and the answer repeats the number it used. */
  let quantity: number | null = null
  if (has(words, QUANTITY_CUES)) {
    for (let i = 0; i < words.length; i += 1) {
      if (taken.has(i) || !/^\d+$/.test(words[i])) continue
      const value = Number(words[i])
      if (value < 2 || value > 999) continue
      quantity = value
      taken.add(i)
      break
    }
  }

  const terms = words
    .filter((word, index) => !taken.has(index) && !NOISE.has(word) && word.length > 1)
    .join(' ')

  return {
    words,
    terms,
    min,
    max,
    wantsStock: has(words, STOCK_CUES),
    wantsPrice: has(words, PRICE_CUES),
    wantsPromo: has(words, PROMO_CUES),
    wantsBrands: has(words, BRAND_QUESTION_CUES),
    wantsBudget: words.includes('budget'),
    quantity,
    wantsCheapest:
      has(words, ['moins', 'petit', 'bas']) && has(words, ['cher', 'chers', 'chere', 'cheres', 'prix']),
  }
}

/* -------------------------------------------------------------------------- */
/* Which shelf the question names                                             */
/* -------------------------------------------------------------------------- */

/**
 * The shelves the words name, offered beside the answer rather than as it.
 *
 * THE ANSWER SET IS ALWAYS THE CATALOGUE'S OWN SEARCH, AND THAT IS A MEASUREMENT
 * RATHER THAN A PREFERENCE. Answering with the best-matching family instead was
 * tried first and it broke on the merchant's real taxonomy: onduleurs are filed
 * by manufacturer, so the largest family carrying the word "onduleur" is
 * `onduleurs APC` at 44, and a reader asking for an onduleur under 200 000 was
 * answered with the whole Énergie department, whose three cheapest entries are a
 * CR2016 battery, an adapter and a CR2025 battery, all at 500 FCFA. Counted over
 * the words a buyer actually types:
 *
 *              search   best family
 *   onduleur      164   onduleurs APC                     44
 *   camera        421   Caméras de Surveillance          440
 *   switch        167   Switchs                          145
 *   imprimante    306   Imprimantes/Copieurs             246
 *   laptop        456   Ordinateurs portables / Laptop   307
 *   disque        214   Disques Dur Externe               41
 *
 * The search column is a sane answer everywhere; the family column is not. So
 * the family becomes what it is genuinely good at, a counted shortcut to the
 * whole shelf, which is also exactly what the masthead's own `suggest()` offers
 * and therefore the behaviour a reader has already met on this site.
 *
 * A DEPARTMENT ONLY COUNTS WHEN THE WORD LEADS ITS NAME. `Réseaux, Switchs &
 * Routeurs` contains "switch", so matching on any word would offer all 704
 * networking references as the shortcut for a 145-reference shelf. `Onduleurs,
 * Régulateurs & Énergie` leads with "onduleur", and there the department is the
 * right shortcut, because the families under it are brand shards.
 */
interface Shelf {
  readonly group: 'famille' | 'rayon'
  readonly slug: string
  readonly name: string
  readonly count: number
  readonly href: string
}

function shelves(terms: string): Shelf[] {
  const words = terms.split(' ')
  const out: Shelf[] = []

  const family = searchFamilies(terms, 1)[0]
  if (family) {
    out.push({
      group: 'famille',
      slug: family.slug,
      name: family.name,
      count: family.totalCount,
      href: `/categorie/${family.slug}`,
    })
  }

  for (const universe of getUniverses()) {
    if (universe.totalCount === 0) continue
    const labels = [fold(universe.name), fold(universe.shortName)]
    if (!labels.some((label) => words.every((word) => label.startsWith(word)))) continue
    out.push({
      group: 'rayon',
      slug: universe.slug,
      name: universe.name,
      count: universe.totalCount,
      href: `/rayon/${universe.slug}`,
    })
    break
  }

  // ONE SHORTCUT, NOT TWO. "onduleur" names both the Énergie department (338)
  // and the `onduleurs APC` family (44), and offering both puts three links
  // under an answer that already carries three products. The widest shelf is
  // the one a broad question wanted.
  return out.sort((a, b) => b.count - a.count).slice(0, 1)
}

/**
 * A brand, but only when the reader typed its whole name and nothing else.
 *
 * "hp" is 544 references and no single product page is the right answer to it.
 * The free-text search returns 597 for the same two letters, because the prefix
 * rule also catches the 43 HPE; both figures are right, they are answers to two
 * different questions, and `/marque/hp` is the page that owns the first one. So
 * a bare brand name is answered as a brand, and anything else keeps the search.
 */
function exactBrand(terms: string) {
  const brand = getBrandIndex().find((entry) => fold(entry.name) === terms)
  if (!brand) return null
  return {
    ...brand,
    products: getAllProducts().filter((product) => product.brand === brand.name),
  }
}

/* -------------------------------------------------------------------------- */
/* The word the reader nearly typed                                           */
/* -------------------------------------------------------------------------- */

/**
 * The brand and family vocabulary, folded once.
 *
 * A NEAR MISS IS THE COMMONEST FAILURE ON A PHONE IN THIS MARKET, and it used to
 * be indistinguishable from "we do not stock it". `hikvison` returned a single
 * unrelated reference whose own name carries the same typo, which reads as an
 * answer and is not one. Only brand names and family words go in: they are the
 * words a buyer half-remembers, they are spelled consistently in the export, and
 * they are few enough that a two-edit search over them costs nothing.
 */
let vocabulary: string[] | null = null

function vocab(): string[] {
  if (vocabulary) return vocabulary
  const set = new Set<string>()
  for (const brand of getBrandIndex()) {
    const name = fold(brand.name)
    if (name.length >= 4 && !name.includes(' ')) set.add(name)
  }
  for (const category of getCategories()) {
    for (const word of fold(category.name).split(' ')) {
      if (word.length >= 5) set.add(word)
    }
  }
  vocabulary = [...set]
  return vocabulary
}

/** Levenshtein, abandoned as soon as it passes the ceiling. */
function distance(a: string, b: string, ceiling: number): number {
  if (Math.abs(a.length - b.length) > ceiling) return ceiling + 1
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i]
    let best = i
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      const value = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + cost)
      row.push(value)
      if (value < best) best = value
    }
    if (best > ceiling) return ceiling + 1
    previous = row
  }
  return previous[b.length]
}

/**
 * The closest real word to what was typed, or null when nothing is close enough.
 *
 * A WORD THAT IS SPELLED CORRECTLY IS SKIPPED, NOT TAKEN AS PROOF THE WHOLE
 * QUERY IS. This returned nothing at all for "camera hikvison" because `camera`
 * is in the vocabulary and the first exact match abandoned the search, leaving
 * the misspelled half of the question unexamined.
 */
function nearest(terms: string): string | null {
  const words = terms.split(' ')
  const known = new Set(vocab())
  for (const word of words) {
    if (word.length < 5 || known.has(word)) continue
    const ceiling = word.length >= 8 ? 2 : 1
    let best: { word: string; at: number } | null = null
    for (const candidate of known) {
      const at = distance(word, candidate, ceiling)
      if (at <= ceiling && (best === null || at < best.at)) best = { word: candidate, at }
    }
    if (best) {
      const found = best.word
      return words.map((part) => (part === word ? found : part)).join(' ')
    }
  }
  return null
}

/* -------------------------------------------------------------------------- */
/* Turning products into an answer                                            */
/* -------------------------------------------------------------------------- */

/** The same floor `/catalogue?remise=1` and the homepage's "Affaires" shelf use. */
const DEAL_FLOOR = 40

function toRow(product: Product): AssistantProduct {
  return {
    slug: product.slug,
    name: product.name,
    price: product.price,
    inStock: product.inStock,
    image: product.images[0]?.url ?? null,
    brand: product.brand,
    categoryName: getCategoryById(product.primaryCategoryId)?.name ?? 'Catalogue',
    specs: product.specs.slice(0, 3),
  }
}

/** The catalogue URL that reproduces exactly what was counted. */
function catalogueHref(
  group: string,
  slug: string,
  min: number | null,
  max: number | null,
  stock: boolean,
  promo: boolean,
): string {
  const parts: string[] = []
  if (min !== null || max !== null) parts.push('tri=prix-croissant')
  parts.push(`${group}=${slug}`)
  if (min !== null || max !== null) parts.push(`prix=${min ?? ''}-${max ?? ''}`)
  if (stock) parts.push('stock=1')
  if (promo) parts.push('remise=1')
  return `/catalogue?${parts.join('&')}`
}

function band(products: readonly Product[]): AssistantFigure | null {
  const prices = products.map((product) => product.price).filter((price) => price > 0)
  if (prices.length === 0) return null
  const low = Math.min(...prices)
  const high = Math.max(...prices)
  return low === high
    ? { label: 'Prix, en FCFA', value: formatAmount(low) }
    : { label: 'Prix, en FCFA', value: `${formatAmount(low)} à ${formatAmount(high)}` }
}

/**
 * An amount rounded to a figure a buyer would say out loud.
 *
 * The tertiles of a real price set land on 47 350 and 118 500, and a band
 * labelled "sous 47 350" reads as a machine talking. The rounding is coarse
 * enough to be sayable and the counts are recomputed against the ROUNDED bound,
 * never against the raw one, so the figure on the band is the figure its own
 * follow-up returns.
 */
function sayable(value: number): number {
  const step = value < 20_000 ? 1_000 : value < 100_000 ? 5_000 : value < 500_000 ? 25_000 : 100_000
  return Math.max(step, Math.round(value / step) * step)
}

/**
 * The price ladder: where the stock of an answer actually sits.
 *
 * A MIN AND A MAX ARE NOT A BUDGET ANSWER. "camera" spans 150 to 1 620 000 FCFA,
 * which is arithmetically true and tells a buyer nothing at all: it is one
 * doorbell button and one thermal PTZ, and the 421 references between them are
 * the question. Three counted bands cut at the set's own tertiles say where the
 * shop actually is, and each band is a query Bod can run, so the ladder is a way
 * through rather than a decoration.
 *
 * Offered only on a set wide enough to have a shape, and never when the reader
 * already stated a budget: they have answered this question themselves.
 */
function ladder(kept: readonly Product[], scope: AssistantScope): AssistantBand[] | undefined {
  const prices = kept
    .map((product) => product.price)
    .filter((price) => price > 0)
    .sort((a, b) => a - b)
  if (prices.length < 12) return undefined

  const low = sayable(prices[Math.floor(prices.length / 3)])
  const high = sayable(prices[Math.floor((prices.length * 2) / 3)])
  if (low >= high) return undefined

  const rungs: { label: string; min: number | null; max: number | null }[] = [
    { label: `Jusqu’à ${formatAmount(low)}`, min: null, max: low },
    { label: `${formatAmount(low)} à ${formatAmount(high)}`, min: low + 1, max: high },
    { label: `Au-dessus de ${formatAmount(high)}`, min: high + 1, max: null },
  ]

  const total = prices.length
  const out: AssistantBand[] = []
  for (const rung of rungs) {
    const count = prices.filter(
      (price) => (rung.min === null || price >= rung.min) && (rung.max === null || price <= rung.max),
    ).length
    if (count === 0) continue
    out.push({
      label: rung.label,
      count,
      share: count / total,
      follow: {
        label: rung.label,
        ask: `${scope.q} ${rung.label.toLowerCase()}`,
        scope: {
          ...scope,
          ...(rung.min !== null ? { min: rung.min } : {}),
          ...(rung.max !== null ? { max: rung.max } : {}),
        },
      },
    })
  }
  return out.length > 1 ? out : undefined
}

/**
 * Which manufacturers the counted set is made of.
 *
 * "Vous avez ça en quelle marque" is a question a technical buyer asks at every
 * counter in this trade, and the honest answer is a count per manufacturer over
 * the set already on the table. THE FOLLOW-UP CARRIES THE BRAND AS A FILTER
 * RATHER THAN AS A WORD, so pressing "HIKVISION 99" returns those 99 and not the
 * 117 that searching the two words together would give. Both numbers are true;
 * only one of them is the answer to what was pressed.
 */
function tallies(kept: readonly Product[], scope: AssistantScope): AssistantTally[] | undefined {
  if (scope.marque || kept.length < 6) return undefined
  const counts = new Map<string, number>()
  for (const product of kept) {
    if (!product.brand) continue
    counts.set(product.brand, (counts.get(product.brand) ?? 0) + 1)
  }
  if (counts.size < 2) return undefined

  const out = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({
      label: name,
      count,
      follow: { label: name, ask: `${scope.q} en ${name}`, scope: { ...scope, marque: name } },
    }))

  // One manufacturer holding the whole set is not a breakdown, it is the answer
  // the sentence already gave.
  return out[0].count === kept.length ? undefined : out
}

/**
 * One answer shape for every catalogue question.
 *
 * A budget question, a stock question, a price question, a discount question and
 * a plain search are the same query wearing different words: a set of products,
 * filtered, counted, priced and linked. Writing them as one path is what keeps
 * the five consistent with each other, and it is why a follow-up can refine any
 * of them.
 */
function answerFrom(
  found: readonly Product[],
  scope: AssistantScope,
  reading: Pick<
    Reading,
    'min' | 'max' | 'wantsStock' | 'wantsPrice' | 'wantsCheapest' | 'wantsPromo' | 'wantsBrands' | 'quantity'
  >,
  opening: string,
  links: readonly AssistantLink[],
  intent: 'marque' | 'prix' | 'recherche' | 'remise' | 'stock',
): AssistantReply {
  const { min, max, wantsStock, wantsPrice, wantsCheapest, wantsPromo, wantsBrands, quantity } = reading

  let kept = found
  if (scope.marque) kept = kept.filter((product) => product.brand === scope.marque)
  if (min !== null) kept = kept.filter((product) => product.price >= min)
  if (max !== null) kept = kept.filter((product) => product.price > 0 && product.price <= max)
  /* A DISCOUNT IS A SET, NOT A QUESTION ABOUT THE SET, so it narrows here beside
     the budget rather than after the counting. Filtered last, it left the stock
     figure reading "396 sur 75": a numerator counted over the whole search and a
     denominator counted over the démarquées, printed side by side. */
  if (wantsPromo) kept = kept.filter((product) => (product.discountPct ?? 0) >= DEAL_FLOOR)

  /* Counted BEFORE the stock filter, so the stock figure can say what it is
     comparing against. Filtering first made every stock answer read
     "426 sur 426", which is true, useless, and reads as a rounding error. */
  const inBudget = kept.length
  const onShelf = kept.filter((product) => product.inStock).length
  const marked = wantsPromo
    ? 0
    : kept.filter((product) => (product.discountPct ?? 0) >= DEAL_FLOOR).length
  if (wantsStock) kept = kept.filter((product) => product.inStock)

  if (kept.length === 0) {
    const bound =
      max !== null && min !== null
        ? `entre ${formatAmount(min)} et ${formatAmount(max)} FCFA`
        : max !== null
          ? `sous ${formatAmount(max)} FCFA`
          : min !== null
            ? `au-dessus de ${formatAmount(min)} FCFA`
            : ''
    const cheapest = [...found].filter((p) => p.price > 0).sort((a, b) => a.price - b.price)[0]
    return {
      intent: 'recherche',
      text:
        found.length === 0
          ? 'Rien ne porte ces mots dans le catalogue.'
          : wantsPromo && inBudget > 0
            ? `Aucune des ${formatCount(inBudget, 'référence')} n’est démarquée en ce moment. ` +
              'Les prix affichés restent dégressifs à la quantité sur devis.'
            : wantsStock && inBudget > 0
              ? `Les ${formatCount(inBudget, 'référence')} qui correspondent sont toutes sur commande aujourd’hui. ` +
                'Le comptoir dit sur WhatsApp sous combien de jours elles rentrent.'
              : `Aucune des ${formatCount(found.length, 'référence')} ne rentre ${bound}` +
                (cheapest ? `. La moins chère est à ${formatPrice(cheapest.price)}.` : '.'),
      figures: cheapest ? [{ label: 'La moins chère', value: formatPrice(cheapest.price) }] : undefined,
      products: cheapest ? [toRow(cheapest)] : undefined,
      links,
      handoff: found.length === 0 || wantsStock,
      scope,
    }
  }

  /* A price question is answered cheapest first, because "combien coûte" means
     "à partir de combien". Everything else keeps the catalogue's own relevance
     order and only lifts what is on the shelf to the top of it: `sort` is stable
     here, so the ranking inside each group is untouched. */
  const ranked = wantsCheapest || wantsPrice || quantity !== null
    ? [...kept].sort((a, b) => (a.price || Infinity) - (b.price || Infinity))
    : [...kept].sort((a, b) => Number(b.inStock) - Number(a.inStock))

  const figures: AssistantFigure[] = [
    { label: kept.length === 1 ? 'Référence' : 'Références', value: formatAmount(kept.length) },
  ]
  const range = band(kept)
  if (range) figures.push(range)
  figures.push({
    label: 'Au comptoir',
    value: wantsStock
      ? `${formatAmount(kept.length)} sur ${formatAmount(inBudget)}`
      : `${formatAmount(onShelf)} sur ${formatAmount(kept.length)}`,
  })

  /* A QUANTITY IS ANSWERED ON ONE PRICE, NEVER ON THE SET. Multiplying a
     421-reference span by twelve produces a bracket from 1 800 to 19 440 000,
     which is arithmetic performed on nothing. The figure shows the whole sum,
     `12 × 5 000`, so what was multiplied is on the same line as the total and the
     reference it came from is the first row underneath: nothing to take on
     trust. The sentence says the rest, because a total at catalogue price is not
     what the counter will actually invoice for twelve of anything. */
  const cheapest = ranked.find((product) => product.price > 0)
  const sum =
    quantity !== null && cheapest
      ? {
          figure: {
            label: `${formatAmount(quantity)} × ${formatAmount(cheapest.price)}`,
            value: formatAmount(cheapest.price * quantity),
          },
          note:
            ` Le total est calculé sur la moins chère de la liste, au prix affiché : ` +
            'les prix sont dégressifs à la quantité, et le comptoir chiffre en proforma.',
        }
      : null
  if (sum) figures.push(sum.figure)

  const next: AssistantFollow[] = []
  const term = scope.q ?? ''
  if (!wantsStock && onShelf > 0 && onShelf < kept.length) {
    next.push({
      label: 'Seulement ce qui est au comptoir',
      ask: `${term} en stock`,
      scope: { ...scope, stock: true },
    })
  }
  if (!wantsPromo && marked > 0) {
    next.push({
      label: `Les ${formatAmount(marked)} démarquées`,
      ask: `${term} en promo`,
      scope: { ...scope, remise: true },
    })
  }
  if (scope.marque) {
    next.push({ label: 'Toutes marques', ask: term, scope: { ...scope, marque: undefined } })
  }
  if (!wantsCheapest && !wantsPrice && kept.length > 3) {
    next.push({ label: 'Les moins chères', ask: `${term} les moins chers`, scope })
  }

  /* The ladder answers "dans quels prix", so it is silent once the reader has
     stated a budget of their own: they have already answered it. */
  const rungs = min === null && max === null ? ladder(kept, scope) : undefined
  const brands = tallies(kept, scope)

  return {
    intent,
    text: sum ? `${opening}${sum.note}` : opening,
    figures,
    /* A BRAND QUESTION IS ANSWERED WITH BRANDS. Three product rows under a
       counted breakdown are three arbitrary answers to a question about the
       whole shelf, and they push the breakdown off a phone screen. */
    products: wantsBrands && brands ? undefined : ranked.slice(0, 3).map(toRow),
    bands: rungs,
    tallies: brands,
    /* Someone who said "il me faut douze" is building a list, and the proforma
       is the page that turns a list into a price. */
    links: sum ? [...links, { href: '/devis', label: 'Ouvrir un devis' }] : links,
    next: next.length > 0 ? next.slice(0, 3) : undefined,
    scope,
  }
}

/* -------------------------------------------------------------------------- */
/* A budget with nothing named                                                */
/* -------------------------------------------------------------------------- */

/**
 * What an amount buys, department by department.
 *
 * "J'ai 500 000 francs" IS A REAL QUESTION AND IT USED TO REACH THE REFUSAL
 * MESSAGE. The sentence names no merchandise, so the search terms come out
 * empty and the whole merchandise path had nothing to run on. It is also the
 * question a Cameroonian buyer asks most often out loud at a counter, because
 * the budget is the fixed thing and the equipment is what has to fit inside it.
 *
 * The answer is the only honest one available from an export with no
 * recommendation data in it: the catalogue cut by the reader's own bound and
 * counted per department, so a reader with 500 000 francs sees that it buys
 * 1 700 references in Sécurité and 40 in Serveurs, and can go straight to the
 * shelf that is actually in range. Every count is the count of the filtered
 * catalogue page its row links to.
 *
 * A PRODUCT IS FILED IN EXACTLY ONE DEPARTMENT, by its primary category, which
 * is the same rule the build step counted by, so these rows never double-count.
 * The list is capped at six of twelve, so it is explicitly a top rather than a
 * partition, and the total is stated separately.
 */
function budget(min: number | null, max: number | null): AssistantReply {
  const within = (product: Product) =>
    product.price > 0 &&
    (min === null || product.price >= min) &&
    (max === null || product.price <= max)

  const kept = getAllProducts().filter(within)
  if (kept.length === 0) {
    return {
      intent: 'budget',
      text:
        'Aucune référence du catalogue ne tient dans cette fourchette. ' +
        'Donnez-moi un montant plus large, ou dites-moi ce que vous cherchez.',
      handoff: true,
    }
  }

  const rows = getUniverses()
    .map((universe) => ({
      universe,
      count: getProductsInUniverse(universe.id).filter(within).length,
    }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  const bound =
    min !== null && max !== null
      ? `entre ${formatAmount(min)} et ${formatAmount(max)} FCFA`
      : max !== null
        ? `sous ${formatAmount(max)} FCFA`
        : `au-dessus de ${formatAmount(min ?? 0)} FCFA`

  const onShelf = kept.filter((product) => product.inStock).length
  const dearest = [...kept].sort((a, b) => b.price - a.price)[0]

  return {
    intent: 'budget',
    text:
      `Ce que le magasin tient ${bound}, rayon par rayon. ` +
      'Nommez un type de matériel et je réduis la liste à ce que vous cherchez.',
    figures: [
      { label: 'Références', value: formatAmount(kept.length) },
      { label: 'Au comptoir', value: `${formatAmount(onShelf)} sur ${formatAmount(kept.length)}` },
      ...(dearest ? [{ label: 'La plus chère qui rentre', value: formatPrice(dearest.price) }] : []),
    ],
    families: rows.map((row) => ({
      href: catalogueHref('rayon', row.universe.slug, min, max, false, false),
      label: row.universe.name,
      count: row.count,
    })),
    /* No scope is carried out of here. The bound belongs to a question that
       named no merchandise, and letting it ride into the next one would answer
       "et des switchs" with a filter the reader had stopped thinking about. */
  }
}

/* -------------------------------------------------------------------------- */
/* Comparing two references                                                   */
/* -------------------------------------------------------------------------- */

function toColumn(product: Product): AssistantColumn {
  return {
    slug: product.slug,
    name: product.name,
    price: product.price,
    inStock: product.inStock,
    brand: product.brand,
    categoryName: getCategoryById(product.primaryCategoryId)?.name ?? 'Catalogue',
    specs: product.specs.slice(0, 3),
  }
}

/**
 * Two references, side by side, on the facts the export actually holds.
 *
 * The specifications were parsed at ingestion and 1 498 products carry at least
 * one, so the comparison states what it has and never fills the gap: a column
 * with no parsed specification says so rather than borrowing its neighbour's.
 * The one line that is arithmetic rather than opinion is the price gap, and it
 * is the only sentence Bod writes here.
 */
function compare(query: string): AssistantReply | null {
  const flat = tokens(query)

  /* Every place the sentence could break in two, tried left to right. A model
     reference can itself contain "et", and the first break that yields two
     sides the catalogue recognises is the one the reader meant. */
  for (let at = 1; at < flat.length - 1; at += 1) {
    if (!['et', 'ou', 'vs', 'versus', 'contre'].includes(flat[at])) continue

    const clean = (part: readonly string[]) =>
      part.filter((word) => !NOISE.has(word) && word !== 'entre' && word.length > 1).join(' ')

    const left = clean(flat.slice(0, at))
    const right = clean(flat.slice(at + 1))
    if (left.length < 2 || right.length < 2) continue

    const first = searchCatalog(left, 1)[0]
    const second = searchCatalog(right, 1)[0]
    if (!first || !second || first.slug === second.slug) continue

    const a = getProductBySlug(first.slug)
    const b = getProductBySlug(second.slug)
    if (!a || !b) continue

    const gapValue = Math.abs(a.price - b.price)
    const gap =
      gapValue === 0
        ? 'Les deux sont au même prix.'
        : `${a.price > b.price ? 'La première' : 'La seconde'} coûte ${formatPrice(gapValue)} de plus.`

    return {
      intent: 'comparaison',
      text:
        'Voici ce que le catalogue tient sur les deux. Les caractéristiques sont ' +
        'celles extraites des fiches, rien de plus : pour un arbitrage technique, ' +
        'l’atelier répond au téléphone.',
      compare: { left: toColumn(a), right: toColumn(b), gap },
      links: [
        { href: `/produit/${a.slug}`, label: 'Fiche de la première' },
        { href: `/produit/${b.slug}`, label: 'Fiche de la seconde' },
      ],
    }
  }

  return null
}

/* -------------------------------------------------------------------------- */
/* A reference, by the number on the proforma                                 */
/* -------------------------------------------------------------------------- */

/**
 * The one identifier a customer arrives holding.
 *
 * The product page prints it as `Réf.` and the counter reads it back over the
 * telephone, so a buyer with a quote in hand has a number and no words at all.
 * It is the WooCommerce post id: unique, exact, and nothing here is ranked or
 * approximated. A number that is not in the catalogue is said to be missing
 * rather than turned into a search that would answer a different question.
 */
function reference(words: readonly string[]): AssistantReply | null {
  if (!has(words, REFERENCE_CUES)) return null

  const digits = words.filter((word) => /^\d{3,9}$/.test(word)).map(Number)
  if (digits.length === 0) return null

  for (const id of digits) {
    const product = getAllProducts().find((candidate) => candidate.id === id)
    if (!product) continue
    const category = getCategoryById(product.primaryCategoryId)
    return {
      intent: 'reference',
      text: `La référence ${id}, telle qu’elle est au catalogue aujourd’hui.`,
      figures: [
        { label: 'Prix', value: formatPrice(product.price) },
        { label: 'Au comptoir', value: product.inStock ? 'Oui' : 'Sur commande' },
        ...(product.brand ? [{ label: 'Marque', value: product.brand }] : []),
      ],
      products: [toRow(product)],
      links: [
        { href: `/produit/${product.slug}`, label: 'Ouvrir la fiche' },
        ...(category
          ? [{ href: `/categorie/${category.slug}`, label: category.name, count: category.totalCount }]
          : []),
      ],
    }
  }

  return {
    intent: 'reference',
    text:
      `Aucune référence ne porte le numéro ${digits[0]} dans ce catalogue. ` +
      'Vérifiez le numéro sur la facture, ou envoyez-en la photo au comptoir.',
    handoff: true,
  }
}

/* -------------------------------------------------------------------------- */
/* The counter nearest the reader                                             */
/* -------------------------------------------------------------------------- */

function counter(words: readonly string[]): AssistantReply | null {
  const match = COUNTER_CITIES.find((entry) =>
    entry.cues.some((cue) => words.some((word) => word.startsWith(cue))),
  )

  if (match) {
    const shops = SHOWROOMS.filter((shop) => shop.city === match.city)
    return {
      intent: 'comptoir',
      text:
        shops.length === 1
          ? `Un comptoir à ${match.city} : ${shops[0].district}, ${shops[0].directions}. ` +
            'Retrait le jour même, livraison en 24 à 48 h.'
          : `Deux comptoirs à ${match.city}. Retrait le jour même dans les deux, ` +
            'livraison en 24 à 48 h.',
      figures: shops.map((shop) => ({ label: shop.district, value: shop.directions, wide: true })),
      links: [{ href: '/contact', label: 'Itinéraires et horaires au téléphone' }],
    }
  }

  const shipped = SHIPPED_CITIES.find((city) => words.some((word) => word.startsWith(city)))
  if (!shipped) return null

  const name = shipped.charAt(0).toUpperCase() + shipped.slice(1)
  return {
    intent: 'comptoir',
    text:
      `Pas de comptoir à ${name} : les trois sont à ${DELIVERY_CITIES.join(' et ')}. ` +
      'Nous expédions par agence de voyage, et le délai dépend de la ligne. ' +
      'Le comptoir confirme la ligne et le prix du transport sur WhatsApp.',
    links: [{ href: '/contact', label: 'Nous joindre' }],
    handoff: true,
  }
}

/* -------------------------------------------------------------------------- */
/* The opening panel, built from the live export                              */
/* -------------------------------------------------------------------------- */

/**
 * What Bod offers before the first question.
 *
 * BUILT HERE RATHER THAN WRITTEN DOWN, so that every example is a question that
 * works today. The reference number is a reference that exists, the brand named
 * is one the shop holds deepest, and the three figures are the export's own. A
 * pressable example that returns "aucune référence ne porte ce numéro" is worse
 * than no example: it is the first thing a reader tries and it fails in front of
 * them. `constants/assistant.ts` keeps a written fallback for a first open with
 * no network, and that copy names nothing that can go out of stock.
 */
function ouverture(): AssistantReply {
  const meta = getMeta()
  const brands = getBrandIndex()
  const newest = getRecentProducts(1)[0]

  /* SIX, NOT NINE. Measured at 390, every extra row pushes the conditions and
     the field itself below the fold on the first open, and a list nobody reaches
     the bottom of teaches less than a list that fits. Counting a brand is left
     out because typing the brand does it, and searching is left out because the
     placeholder in the field already says it. */
  const next: AssistantFollow[] = [
    { label: 'Filtrer par budget', ask: 'caméra à moins de 50 000' },
    { label: 'Voir la répartition des prix', ask: 'quel budget pour un laptop' },
    { label: 'Lister les marques d’un rayon', ask: 'quelles marques de switch' },
    ...(newest ? [{ label: 'Retrouver une référence', ask: `référence ${newest.id}` }] : []),
    { label: 'Sortir ce qui est démarqué', ask: 'des promos sur les caméras' },
    { label: 'Trouver le comptoir le plus proche', ask: 'je suis à Bonapriso' },
  ]

  return {
    intent: 'accueil',
    text: OPENING,
    figures: [
      { label: 'Références', value: formatAmount(meta.productCount) },
      { label: 'Familles', value: formatAmount(getFamilyCount()) },
      { label: 'Marques', value: formatAmount(brands.length) },
    ],
    next,
  }
}

/* -------------------------------------------------------------------------- */
/* The basket, re-read against today's catalogue                              */
/* -------------------------------------------------------------------------- */

/**
 * The one question where the browser holds the query and the server holds the
 * truth, which is why it is the only one that arrives by POST.
 *
 * `lib/cart.tsx` stores a slug, a name, a price and a quantity in
 * `localStorage` and joins them against the catalogue only at render time. That
 * is the right trade for a shop that reprices at the counter, and it means a
 * basket assembled last week carries last week's prices. Someone who is about
 * to ask for a proforma needs three things nobody was telling them: what the
 * shelf says today, which lines have moved since they were added, and which
 * lines are not at the counter. All three are arithmetic over the export.
 *
 * NOTHING IS STORED AND NOTHING IS RECOMMENDED. The lines come in, the answer
 * goes back, and no line is ever described as a good buy, a bad buy or a
 * substitute for another. There is no such datum in this catalogue.
 *
 * It is a POST because the payload is a list of slugs that routinely runs past
 * a thousand characters, and a query string that long is a truncation waiting
 * to happen in a webview.
 */
interface IncomingLine {
  slug?: unknown
  qty?: unknown
  price?: unknown
  /** The name the browser stored, so a dropped reference can still be named. */
  name?: unknown
}

function auditBasket(incoming: readonly IncomingLine[]): AssistantReply {
  const lines: AssistantBasketLine[] = []
  let total = 0
  let count = 0
  let moved = 0
  let gone = 0
  let ordered = 0

  for (const line of incoming.slice(0, 40)) {
    if (typeof line?.slug !== 'string') continue
    const qty = typeof line.qty === 'number' && line.qty > 0 ? Math.min(Math.floor(line.qty), 999) : 1
    const was = typeof line.price === 'number' && line.price >= 0 ? line.price : 0
    const product = getProductBySlug(line.slug)

    if (!product) {
      /* NAMED BY THE BROWSER, since the catalogue can no longer name it. A row
         reading `switch-tp-link-tl-sg2424p-24-ports` is a slug shown to a
         customer, which is the shop's own plumbing on display. */
      gone += 1
      count += qty
      lines.push({
        slug: line.slug,
        name: typeof line.name === 'string' && line.name.trim() !== '' ? line.name : line.slug,
        qty,
        price: null,
        was,
        inStock: false,
      })
      continue
    }

    count += qty
    total += product.price * qty
    if (product.price !== was && was > 0) moved += 1
    if (!product.inStock) ordered += 1
    lines.push({
      slug: product.slug,
      name: product.name,
      qty,
      price: product.price,
      was,
      inStock: product.inStock,
    })
  }

  if (lines.length === 0) {
    return {
      intent: 'panier',
      text:
        'Votre panier est vide. Ajoutez des références depuis une fiche produit, ' +
        'puis revenez : je relis chaque ligne au prix du jour et j’ouvre le devis.',
      links: [{ href: '/catalogue', label: 'Parcourir le catalogue' }],
    }
  }

  /* Every clause below is a count, and a clause only appears when its count is
     not zero. A basket that is entirely in order says so in one sentence. */
  const notes: string[] = []
  if (moved > 0) {
    notes.push(
      moved === 1
        ? 'Une ligne a changé de prix depuis son ajout'
        : `${formatAmount(moved)} lignes ont changé de prix depuis leur ajout`,
    )
  }
  if (ordered > 0) {
    notes.push(
      ordered === 1 ? 'une ligne est sur commande' : `${formatAmount(ordered)} lignes sont sur commande`,
    )
  }
  if (gone > 0) {
    notes.push(
      gone === 1
        ? 'une ligne n’est plus au catalogue'
        : `${formatAmount(gone)} lignes ne sont plus au catalogue`,
    )
  }

  const tail =
    notes.length === 0
      ? 'Rien n’a bougé depuis que vous l’avez constitué.'
      : `${notes.join(', ')}.`

  return {
    intent: 'panier',
    text:
      `Votre panier, relu ligne par ligne sur le catalogue d’aujourd’hui. ${tail} ` +
      'Le comptoir le reprend en facture proforma, et les prix sont dégressifs à la quantité.',
    figures: [
      { label: 'Articles', value: formatAmount(count) },
      { label: 'Total du jour, en FCFA', value: formatAmount(total) },
      {
        label: 'Au comptoir',
        value: `${formatAmount(lines.length - ordered - gone)} sur ${formatAmount(lines.length)}`,
      },
    ],
    basket: { lines, total, count, moved, gone, ordered },
    links: [{ href: '/devis', label: 'Transformer en devis' }],
    /* A line the catalogue no longer carries is the one case the counter has to
       settle, so the question goes to a human with the basket already open. */
    handoff: gone > 0,
  }
}

export async function POST(request: Request) {
  let body: unknown = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<AssistantReply>({ intent: 'main', text: FALLBACK, handoff: true })
  }
  const lines = (body as { lines?: unknown })?.lines
  return NextResponse.json<AssistantReply>(auditBasket(Array.isArray(lines) ? lines : []))
}

/* -------------------------------------------------------------------------- */
/* The route                                                                  */
/* -------------------------------------------------------------------------- */

function number(value: string | null): number | null {
  if (value === null || !/^\d{1,9}$/.test(value)) return null
  return Number(value)
}

export async function GET(request: Request) {
  const url = new URL(request.url)

  /* The opening panel asks for itself once, when it is first opened. One request
     buys a list of examples that cannot go stale and three figures that are the
     export's own rather than a number typed into a constant last month. */
  if (url.searchParams.get('mode') === 'ouverture') {
    return NextResponse.json<AssistantReply>(ouverture())
  }

  const query = url.searchParams.get('q')?.slice(0, 200).trim() ?? ''

  /* The previous answer's scope, posted back by the panel. It is the whole of
     Bod's memory: it lets "et en stock" and "les moins chers" mean something
     without a transcript, a session or a store. A follow-up button posts a
     COMPLETE scope rather than a partial one, because a band of the price ladder
     has to be able to lift a ceiling the previous answer set and a merge can add
     a bound but never remove one. */
  const carried: AssistantScope = {
    q: url.searchParams.get('t')?.slice(0, 80) ?? undefined,
    marque: url.searchParams.get('br')?.slice(0, 60) ?? undefined,
    min: number(url.searchParams.get('mn')) ?? undefined,
    max: number(url.searchParams.get('mx')) ?? undefined,
    stock: url.searchParams.get('st') === '1' ? true : undefined,
    remise: url.searchParams.get('rm') === '1' ? true : undefined,
  }

  if (query.length < 2) {
    return NextResponse.json<AssistantReply>({ intent: 'main', text: FALLBACK, handoff: true })
  }

  const reading = read(query)
  const { words } = reading

  /* A FOLLOW-UP IS A QUERY, NOT A SENTENCE, and `sc=1` says so. The button that
     reads "HIKVISION 99" posts the scope those 99 were counted with, and the
     text beside it is only what the docket records as the question. Re-parsing
     that text would produce a different query and therefore a different number:
     "caméra en HIKVISION" searched as words is 117 references, because the
     search also catches every product whose family name carries the brand. Both
     figures are true. Only one of them is the answer to what was pressed. */
  const pinned = url.searchParams.get('sc') === '1' && (carried.q ?? '') !== ''

  /* Everything from here to the merchandise answer reads the words. A pinned
     follow-up has already been read once and skips all of it. */
  if (!pinned) {
    /* 1. A greeting is a greeting, not a failed search. It used to return the
          refusal message, which is a poor first impression from something whose
          entire value is that it says what it can do. */
    if (words.every((word) => GREETING_CUES.includes(word) || NOISE.has(word)) && has(words, GREETING_CUES)) {
      return NextResponse.json<AssistantReply>(ouverture())
    }

    /* 2. What can you do. The same panel the first open shows. */
    if (reading.terms === '' && has(words, HELP_CUES)) {
      return NextResponse.json<AssistantReply>({ ...ouverture(), intent: 'capacites' })
    }

    /* 3. The basket is the browser's, not the server's. The panel intercepts this
          before it ever gets here; if a stale client asks anyway, point at the
          quote rather than pretending to read a basket this process cannot see. */
    if (reading.terms === '' && has(words, CART_CUES)) {
      return NextResponse.json<AssistantReply>({
        intent: 'panier',
        text: 'Votre panier est dans ce navigateur. Ouvrez-le pour le chiffrer et le transformer en devis.',
        links: [{ href: '/devis', label: 'Ouvrir un devis' }],
      })
    }

    /* 4. A number on a proforma. Before everything else that reads numbers, since
          a reference is an identity and not a quantity or a price. */
    const numbered = reference(words)
    if (numbered) return NextResponse.json<AssistantReply>(numbered)

    /* 5. A comparison names two things, so it is tried before either of them is
          read as a single search. IT TAKES AN EXPLICIT CUE, and a bare "et" is not
          one: "câble et connecteur RJ45" is a shopping list, not a comparison, and
          reading it as one would answer a question nobody asked. */
    if (has(words, COMPARE_CUES)) {
      const answer = compare(query)
      if (answer) return NextResponse.json<AssistantReply>(answer)
      /* The reader clearly asked for a comparison and one of the two sides is not
         in the catalogue. Saying that is worth more than quietly answering a
         different question with the half that did match. */
      return NextResponse.json<AssistantReply>({
        intent: 'comparaison',
        text:
          'Pour comparer, il me faut deux références que je retrouve dans le catalogue, ' +
          'séparées par « et ». Je n’ai pas reconnu les deux ici. Le comptoir compare ' +
          'volontiers sur WhatsApp, photo de l’étiquette à l’appui.',
        handoff: true,
      })
    }

    /* 6. A place name, AND NOTHING ELSE NAMED. Before the written retrait answer,
          which recites all three counters; naming the reader's own city is a
          better answer than a list. The guard is the empty term list: town names
          are lifted out as noise, so anything left over is merchandise, and
          "caméra à Douala" is a question about cameras. */
    if (reading.terms === '') {
      const place = counter(words)
      if (place) return NextResponse.json<AssistantReply>(place)
    }

    /* 7. The written answers. A named topic still wins over a product search:
          someone typing "livraison Douala" wants the delivery answer, and the
          catalogue would happily return four products whose names carry the word. */
    const named = new Set(words)
    const topic = TOPICS.find((candidate) => candidate.cues.some((cue) => named.has(cue)))
    if (topic) {
      return NextResponse.json<AssistantReply>({
        intent: 'infos',
        text: topic.answer,
        links: topic.link ? [topic.link] : undefined,
      })
    }
  }

  /* 8. Everything else is a question about merchandise. The terms may be empty,
        which is what a typed follow-up looks like: "et en stock" carries no
        noun, so the previous answer's own terms are used. */
  const fresh = !pinned && reading.terms !== ''
  const terms = pinned ? carried.q ?? '' : fresh ? reading.terms : carried.q ?? ''
  const min = pinned ? carried.min ?? null : reading.min ?? (fresh ? null : carried.min ?? null)
  const max = pinned ? carried.max ?? null : reading.max ?? (fresh ? null : carried.max ?? null)
  const wantsStock = pinned
    ? carried.stock === true
    : reading.wantsStock || (!fresh && carried.stock === true)
  const wantsPromo = pinned
    ? carried.remise === true
    : reading.wantsPromo || (!fresh && carried.remise === true)
  /* A brand only ever arrives as a name the catalogue gave us, on a pinned
     follow-up. It is never lifted out of typed words: "camera hikvision" is a
     search over two words and the search is what counts it. */
  const marque = pinned ? carried.marque : undefined

  /* A QUESTION MADE OF NOTHING BUT A NUMBER NAMES NO MERCHANDISE. "J'ai 500 000
     francs" leaves `500000` standing as the only search term once the courtesy
     is lifted out, and searching the catalogue for it returns nothing, because
     no product is called that. It is a budget, and it is read as one below. */
  const bare = terms !== '' && terms.split(' ').every((word) => /^\d{4,9}$/.test(word))

  if (terms === '' || bare) {
    /* AN AMOUNT WITH NOTHING NAMED IS A QUESTION, NOT A FAILED SEARCH. It is the
       one a buyer asks out loud most often, and it reached the refusal message.
       See `budget`. */
    if (min !== null || max !== null) {
      return NextResponse.json<AssistantReply>(budget(min, max))
    }

    /* AND HERE, AND ONLY HERE, A BARE AMOUNT IS A BUDGET WITHOUT A BOUND WORD.
       "J'ai 500 000 francs" carries no "moins de" and no "jusqu'à", so
       `readBounds` correctly refuses to read it as a ceiling; refusing it twice
       leaves a plain question unanswered. The rule is safe because it is the
       last thing tried on a sentence that named NO merchandise at all: "switch
       24 ports" never reaches this line, and a lone number is read as the
       ceiling the sentence obviously meant. The answer repeats the figure it
       used, so a misreading is visible in one glance. */
    const lone = terms.split(' ').filter((word) => /^\d{4,9}$/.test(word)).map(Number)
    if (lone.length === 1 && lone[0] >= 1000) {
      return NextResponse.json<AssistantReply>(budget(null, lone[0]))
    }
    /* A bare discount question with nothing to filter is still a real question,
       and the catalogue has a page that answers it exactly. */
    if (reading.wantsPromo) {
      const marked = getAllProducts().filter((product) => (product.discountPct ?? 0) >= DEAL_FLOOR)
      return NextResponse.json<AssistantReply>(
        answerFrom(
          marked,
          { q: '', remise: true },
          /* The set arrives already filtered, and `wantsPromo` stays true so the
             answer knows it. Filtering it a second time is a no-op; telling it
             the filter is off is not, and it offered "les 513 démarquées" as a
             way to narrow a list of exactly those 513. */
          { ...reading, min: null, max: null, wantsPromo: true },
          `${formatCount(marked.length, 'référence')} sont démarquées d’au moins ${DEAL_FLOOR} % ` +
            'par rapport au prix fournisseur. Dites-moi sur quoi et je réduis la liste.',
          [{ href: '/catalogue?remise=1&tri=remise', label: 'Tout ce qui est démarqué', count: marked.length }],
          'remise',
        ),
      )
    }
    if (reading.wantsBrands) {
      const brands = getBrandIndex()
      return NextResponse.json<AssistantReply>({
        intent: 'marque',
        text:
          `Le magasin tient ${formatCount(brands.length, 'marque')}. Nommez un type de ` +
          'matériel et je vous donne les marques de ce rayon, comptées.',
        links: [{ href: '/marques', label: 'Toutes les marques', count: brands.length }],
      })
    }
    return NextResponse.json<AssistantReply>({ intent: 'main', text: FALLBACK, handoff: true })
  }

  const refined = { ...reading, min, max, wantsStock, wantsPromo }
  const scope: AssistantScope = {
    q: terms,
    ...(marque ? { marque } : {}),
    ...(min !== null ? { min } : {}),
    ...(max !== null ? { max } : {}),
    ...(wantsStock ? { stock: true } : {}),
    ...(wantsPromo ? { remise: true } : {}),
  }

  const bound =
    max !== null && min !== null
      ? ` entre ${formatAmount(min)} et ${formatAmount(max)} FCFA`
      : max !== null
        ? ` sous ${formatAmount(max)} FCFA`
        : min !== null
          ? ` au-dessus de ${formatAmount(min)} FCFA`
          : ''

  /* 9. A bare brand name is a brand question. See `exactBrand`. */
  const brand = exactBrand(terms)
  if (brand) {
    return NextResponse.json<AssistantReply>(
      answerFrom(
        brand.products,
        scope,
        refined,
        `${brand.name} tient ${formatCount(brand.productCount, 'référence')} dans ce magasin, ` +
          `${brand.departments.length > 1 ? 'réparties sur' : 'dans'} ` +
          `${brand.departments.slice(0, 3).join(', ')}` +
          `${brand.departments.length > 3 ? ` et ${brand.departments.length - 3} autres rayons` : ''}.`,
        /* THE COUNT IS PRINTED ONLY WHEN THE LINK LEADS TO THE THING COUNTED.
           A filtered catalogue URL is a different query from the brand page, so
           labelling it with the brand's 50 beside a figure strip reading 47 puts
           two numbers for two questions four pixels apart. */
        [
          bound || wantsStock || wantsPromo
            ? {
                href: catalogueHref('marque', brand.slug, min, max, wantsStock, wantsPromo),
                label: `Tout ${brand.name} sur ce filtre`,
              }
            : {
                href: `/marque/${brand.slug}`,
                label: `Tout ${brand.name}`,
                count: brand.productCount,
              },
        ],
        'marque',
      ),
    )
  }

  /* 10. Everything else is the catalogue's own search, term for term, so the
         count Bod prints is the count /recherche prints for the same words. */
  /* THE LIMIT HAS TO BE ABOVE THE CATALOGUE, NOT ABOVE WHAT IS DISPLAYED. It was
     400, and "camera" printed "touche 400 références" when the true figure is
     421: the cap had become the answer. `searchCatalog` scores the whole array
     before it slices, so asking for more than exists costs one slice. */
  const resolve = (value: string): Product[] =>
    searchCatalog(value, 5000)
      .map((hit) => getProductBySlug(hit.slug))
      .filter((product): product is Product => product !== null)

  let searched = terms
  let found = resolve(terms)

  /* A BARE NUMBER THAT FINDS NOTHING IS DROPPED RATHER THAN LEFT TO SINK THE
     QUERY. `searchCatalog` requires every term to match, so "il me faut 12
     caméras" returned nothing at all: 12 is a real word in a handful of product
     names and none of them is a camera. The retry only ever runs on a query that
     already failed, so no working search can change behaviour, and the sentence
     says which words were actually used. */
  if (found.length === 0) {
    const withoutDigits = terms.split(' ').filter((word) => !/^\d+$/.test(word)).join(' ')
    if (withoutDigits !== '' && withoutDigits !== terms) {
      const retry = resolve(withoutDigits)
      if (retry.length > 0) {
        searched = withoutDigits
        found = retry
      }
    }
  }

  /* A SPELLING THE CATALOGUE KNOWS IS RUN, NOT OFFERED AS A BUTTON. Measured:
     "des promos sur les laptops" returned nothing and a chip reading « laptop »,
     so the commonest failure on a phone keyboard in this market cost a second
     round trip to answer a question the shop can answer immediately. The
     correction is applied and NAMED in the first sentence, which is the whole
     difference between correcting someone and pretending they typed something
     else. It only ever runs on a query that already returned nothing, so no
     working search can change behaviour. */
  let corrected: string | null = null
  if (found.length === 0) {
    const guess = nearest(searched)
    if (guess) {
      const retry = resolve(guess)
      if (retry.length > 0) {
        corrected = guess
        found = retry
        searched = guess
      }
    }
  }

  if (found.length > 0) {
    const search = `/recherche?q=${encodeURIComponent(searched)}${
      reading.wantsCheapest || reading.wantsPrice ? '&tri=prix-croissant' : ''
    }`

    /* Read off the words that were ACTUALLY searched. Computed from the typed
       ones, the shelf shortcut under a corrected query was a shortcut to the
       shelf the misspelling nearly named, which is no shelf at all. */
    const shortcuts = shelves(searched)
    const shelf = shortcuts[0]
    /* WITH A BOUND, THE SENTENCE STOPS QUOTING THE UNBOUNDED TOTAL. It read
       "« camera » touche 421 références sous 50 000 FCFA" while the figure strip
       under it read 248, because 421 is the whole search and the bound belongs
       to the figure. The sentence now states the query and the figures state the
       count, which is the only arrangement where the two cannot contradict. */
    /* The correction is stated before anything else, in the reader's own
       spelling and then in the catalogue's, so the count that follows is
       never mistaken for a count of what was actually typed. */
    const fixed = corrected ? `Rien ne porte « ${terms} ». Je lis « ${corrected} ». ` : ''
    const opening =
      fixed +
      (wantsPromo
        ? `Ce qui porte « ${searched} » et se trouve démarqué d’au moins ${DEAL_FLOOR} % :`
        : reading.wantsBrands
          ? `Les marques qui portent « ${searched} », comptées sur ce que le magasin tient.`
          : bound !== ''
            ? `Ce qui porte « ${searched} » et rentre${bound}${wantsStock ? ', au comptoir aujourd’hui' : ''} :`
            : marque
              ? `Ce qui porte « ${searched} » chez ${marque}.`
              : found.length === 1
                ? `Une seule référence porte « ${searched} ».`
                : shelf && found.length > 24
                  ? `« ${searched} » touche ${formatCount(found.length, 'référence')}. ` +
                    `Pour la vue d’ensemble, ${shelf.name} en range ${formatAmount(shelf.count)}.`
                  : `Les références dont le nom, la marque ou la famille portent « ${searched} ».`)

    /* A shortcut that drops the reader's own budget is a shortcut to a
       different question, so the bound travels with it through the catalogue's
       facet URL rather than through the bare shelf page. */
    const filtered = bound !== '' || wantsStock || wantsPromo
    const links: AssistantLink[] = [
      ...shortcuts.map((entry) =>
        filtered
          ? {
              href: catalogueHref(entry.group, entry.slug, min, max, wantsStock, wantsPromo),
              label: `${entry.name} sur ce filtre`,
            }
          : { href: entry.href, label: `Ouvrir ${entry.name}`, count: entry.count },
      ),
      { href: search, label: 'Voir la recherche complète' },
    ]

    const reply = answerFrom(
      found,
      { ...scope, q: searched },
      refined,
      opening,
      links,
      wantsPromo
        ? 'remise'
        : reading.wantsBrands
          ? 'marque'
          : max !== null || min !== null || reading.wantsPrice || reading.wantsBudget
            ? 'prix'
            : wantsStock
              ? 'stock'
              : 'recherche',
    )

    /* A MATCH IS NOT ALWAYS THE ANSWER. `hikvison` returns exactly one
       reference, because one product name carries the same typo, and a reader
       who mistyped a brand of 544 references gets a single unrelated box that
       looks like a considered reply. When the catalogue answers a long query
       with almost nothing, the correctly spelled word is offered beside it. */
    const meant = found.length <= 2 ? nearest(searched) : null
    return NextResponse.json<AssistantReply>(
      meant
        ? {
            ...reply,
            next: [{ label: `Chercher « ${meant} »`, ask: meant }, ...(reply.next ?? [])].slice(0, 3),
          }
        : reply,
    )
  }

  /* 11. Nothing is named this, but the words may name a shelf partially. Sending
         someone to a family of 440 cameras beats telling them the shop has none. */
  const families = getCategories()
    .filter((category) => {
      if (category.level === 0 || category.totalCount === 0) return false
      const label = ` ${fold(category.name)}`
      return terms.split(' ').some((word) => label.includes(` ${word}`))
    })
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 3)

  if (families.length > 0) {
    return NextResponse.json<AssistantReply>({
      intent: 'famille',
      text: 'Aucune référence ne porte ces mots exactement, mais ces familles s’en approchent :',
      families: families.map((category) => ({
        href: `/categorie/${category.slug}`,
        label: category.name,
        count: category.totalCount,
      })),
      scope,
    })
  }

  /* 12. A near miss on a brand or a family word, offered by name rather than
         guessed at silently. See `vocab`. */
  const meant = nearest(terms)
  if (meant) {
    return NextResponse.json<AssistantReply>({
      intent: 'recherche',
      text: `Rien ne porte « ${terms} ». La graphie la plus proche que le catalogue connaisse est « ${meant} ».`,
      next: [{ label: `Chercher « ${meant} »`, ask: meant }],
      handoff: true,
    })
  }

  return NextResponse.json<AssistantReply>({ intent: 'main', text: FALLBACK, handoff: true })
}
