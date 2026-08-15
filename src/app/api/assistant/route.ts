import { NextResponse } from 'next/server'

import {
  getAllProducts,
  getBrandIndex,
  getCategories,
  getCategoryById,
  getProductBySlug,
  getUniverses,
  searchCatalog,
  searchFamilies,
} from '@/lib/catalog'
import type { Product } from '@/types/catalog'
import { formatAmount, formatCount, formatPrice } from '@/lib/format'
import {
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
  SHIPPED_CITIES,
  STOCK_CUES,
  TOPICS,
  type AssistantColumn,
  type AssistantFigure,
  type AssistantLink,
  type AssistantProduct,
  type AssistantReply,
  type AssistantScope,
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
 * WHAT CHANGED, AND WHY IT HAD TO. The previous version did two things: match a
 * written topic, or run a free-text search and return four rows. Measured
 * against real questions, that failed most of them.
 *
 *   "combien coûte un switch"      -> nothing at all, because `coute` is a word
 *                                     no product name contains and every term
 *                                     has to match.
 *   "onduleur moins de 200000"     -> nothing at all, for the same reason,
 *                                     twice: `moins` and `200000` were both
 *                                     required terms.
 *   "vous avez du hp"              -> a mouse, an EliteBook and an HPE server,
 *                                     while /marque/hp counts 544. Two numbers
 *                                     a customer can see, disagreeing.
 *   "bonjour"                      -> the refusal message.
 *
 * So the question is now RESOLVED before it is searched: the amounts, the
 * budget cues, the stock cues, the price cues, the greetings and the city names
 * are lifted out, and only what is left is treated as the name of a thing. That
 * single change is what makes a budget filter, a price answer, a stock answer
 * and a brand answer possible, because all four are the same query wearing
 * different words.
 *
 * EVERY COUNT IS THE COUNT OF THE PAGE IT LINKS TO. A family answer counts
 * `getProductsInCategory`, which is the set the family facet filters to and the
 * set `/categorie/` renders. A department answer counts `getProductsInUniverse`,
 * which is the set the `rayon` facet filters to. A brand answer counts products
 * whose `brand` is that brand, which is the set the `marque` facet filters to.
 * None of the three is recomputed with its own rule, because a figure in this
 * panel that disagrees with the figure on the page it opens is worse than no
 * figure.
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
    out = out.replace(/(\d)[\s. '](\d{3})(?!\d)/g, '$1$2')
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
  'je', 'j', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'me', 'moi', 'mon', 'ma', 'mes',
  'votre', 'vos', 'notre', 'nos', 'ce', 'cet', 'cette', 'ces', 'ca', 'cela', 'c',
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'd', 'l', 'au', 'aux', 'a',
  'et', 'ou', 'en', 'y', 'est', 'sont', 'ai', 'as', 'avez', 'avoir', 'avais',
  'entre', 'contre', 'versus',
  'etre', 'suis', 'sur', 'sous', 'dans', 'pour', 'par', 'avec', 'chez', 'que',
  'qui', 'quoi', 'quel', 'quelle', 'quels', 'quelles', 'ya', 'faire', 'fait',
  'cherche', 'chercher', 'veux', 'voudrais', 'besoin', 'trouve', 'trouver',
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
  const terms = words
    .filter((word, index) => !used.has(index) && !NOISE.has(word) && word.length > 1)
    .join(' ')

  return {
    words,
    terms,
    min,
    max,
    wantsStock: has(words, STOCK_CUES),
    wantsPrice: has(words, PRICE_CUES),
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
/* Turning products into an answer                                            */
/* -------------------------------------------------------------------------- */

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
): string {
  const parts: string[] = []
  if (min !== null || max !== null) parts.push('tri=prix-croissant')
  parts.push(`${group}=${slug}`)
  if (min !== null || max !== null) parts.push(`prix=${min ?? ''}-${max ?? ''}`)
  if (stock) parts.push('stock=1')
  return `/catalogue?${parts.join('&')}`
}

function band(products: readonly Product[]): AssistantFigure | null {
  const prices = products.map((product) => product.price).filter((price) => price > 0)
  if (prices.length === 0) return null
  const low = Math.min(...prices)
  const high = Math.max(...prices)
  return low === high
    ? { label: 'Prix', value: formatPrice(low) }
    : { label: 'De', value: `${formatAmount(low)} à ${formatAmount(high)} FCFA` }
}

/**
 * One answer shape for every catalogue question.
 *
 * A budget question, a stock question, a price question and a plain search are
 * the same query wearing different words: a set of products, filtered, counted,
 * priced and linked. Writing them as one path is what keeps the four consistent
 * with each other, and it is why a follow-up can refine any of them.
 */
function answerFrom(
  found: readonly Product[],
  scope: AssistantScope,
  reading: Pick<Reading, 'min' | 'max' | 'wantsStock' | 'wantsPrice' | 'wantsCheapest'>,
  opening: string,
  links: readonly AssistantLink[],
  intent: 'marque' | 'prix' | 'recherche' | 'stock',
): AssistantReply {
  const { min, max, wantsStock, wantsPrice, wantsCheapest } = reading

  let kept = found
  if (min !== null) kept = kept.filter((product) => product.price >= min)
  if (max !== null) kept = kept.filter((product) => product.price > 0 && product.price <= max)

  /* Counted BEFORE the stock filter, so the stock figure can say what it is
     comparing against. Filtering first made every stock answer read
     "426 sur 426", which is true, useless, and reads as a rounding error. */
  const inBudget = kept.length
  const onShelf = kept.filter((product) => product.inStock).length
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
  const ranked = wantsCheapest || wantsPrice
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

  const next: string[] = []
  if (!wantsStock && onShelf > 0 && onShelf < kept.length) next.push('Seulement ce qui est en stock')
  if (!wantsCheapest && !wantsPrice && kept.length > 3) next.push('Les moins chers')

  return {
    intent,
    text: opening,
    figures,
    products: ranked.slice(0, 3).map(toRow),
    links,
    next: next.length > 0 ? next : undefined,
    scope,
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

    const distance = Math.abs(a.price - b.price)
    const gap =
      distance === 0
        ? 'Les deux sont au même prix.'
        : `${a.price > b.price ? 'La première' : 'La seconde'} coûte ${formatPrice(distance)} de plus.`

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
/* The route                                                                  */
/* -------------------------------------------------------------------------- */

function number(value: string | null): number | null {
  if (value === null || !/^\d{1,9}$/.test(value)) return null
  return Number(value)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const query = url.searchParams.get('q')?.slice(0, 200).trim() ?? ''

  /* The previous answer's scope, posted back by the panel. It is the whole of
     Bod's memory: it lets "et en stock" and "les moins chers" mean something
     without a transcript, a session or a store. */
  const carried: AssistantScope = {
    q: url.searchParams.get('t')?.slice(0, 80) ?? undefined,
    min: number(url.searchParams.get('mn')) ?? undefined,
    max: number(url.searchParams.get('mx')) ?? undefined,
    stock: url.searchParams.get('st') === '1' ? true : undefined,
  }

  if (query.length < 2) {
    return NextResponse.json<AssistantReply>({ intent: 'main', text: FALLBACK, handoff: true })
  }

  const reading = read(query)
  const { words } = reading

  /* 1. A greeting is a greeting, not a failed search. It used to return the
        refusal message, which is a poor first impression from something whose
        entire value is that it says what it can do. */
  if (words.every((word) => GREETING_CUES.includes(word) || NOISE.has(word)) && has(words, GREETING_CUES)) {
    return NextResponse.json<AssistantReply>({ intent: 'accueil', text: OPENING })
  }

  /* 2. What can you do. Answered by the panel, which holds the list. */
  if (reading.terms === '' && has(words, HELP_CUES)) {
    return NextResponse.json<AssistantReply>({
      intent: 'capacites',
      text: OPENING,
    })
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

  /* 4. A comparison names two things, so it is tried before either of them is
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

  /* 5. A place name. Before the written retrait answer, which recites all three
        counters; naming the reader's own city is a better answer than a list. */
  const place = counter(words)
  if (place) return NextResponse.json<AssistantReply>(place)

  /* 6. The written answers. A named topic still wins over a product search:
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

  /* 7. Everything else is a question about merchandise. The terms may be empty,
        which is what a follow-up looks like: "et en stock" carries no noun, so
        the previous answer's own terms are used. */
  const terms = reading.terms !== '' ? reading.terms : carried.q ?? ''
  const min = reading.min ?? (reading.terms === '' ? carried.min ?? null : null)
  const max = reading.max ?? (reading.terms === '' ? carried.max ?? null : null)
  const wantsStock = reading.wantsStock || (reading.terms === '' && carried.stock === true)

  if (terms === '') {
    return NextResponse.json<AssistantReply>({ intent: 'main', text: FALLBACK, handoff: true })
  }

  const refined = { ...reading, min, max, wantsStock }
  const scope: AssistantScope = {
    q: terms,
    ...(min !== null ? { min } : {}),
    ...(max !== null ? { max } : {}),
    ...(wantsStock ? { stock: true } : {}),
  }

  const bound =
    max !== null && min !== null
      ? ` entre ${formatAmount(min)} et ${formatAmount(max)} FCFA`
      : max !== null
        ? ` sous ${formatAmount(max)} FCFA`
        : min !== null
          ? ` au-dessus de ${formatAmount(min)} FCFA`
          : ''

  /* 8. A bare brand name is a brand question. See `exactBrand`. */
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
          bound || wantsStock
            ? {
                href: catalogueHref('marque', brand.slug, min, max, wantsStock),
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

  /* 9. Everything else is the catalogue's own search, term for term, so the
        count Bod prints is the count /recherche prints for the same words. The
        shelves those words name are offered beside it, counted, because a family
        of 440 cameras is often a better destination than any one camera. */
  const shortcuts = shelves(terms)
  /* THE LIMIT HAS TO BE ABOVE THE CATALOGUE, NOT ABOVE WHAT IS DISPLAYED. It was
     400, and "camera" printed "touche 400 références" when the true figure is
     421: the cap had become the answer. `searchCatalog` scores the whole array
     before it slices, so asking for more than exists costs one slice. */
  const hits = searchCatalog(terms, 5000)
  const found = hits
    .map((hit) => getProductBySlug(hit.slug))
    .filter((product): product is Product => product !== null)

  if (found.length > 0) {
    const search = `/recherche?q=${encodeURIComponent(terms)}${
      reading.wantsCheapest || reading.wantsPrice ? '&tri=prix-croissant' : ''
    }`

    const shelf = shortcuts[0]
    /* WITH A BOUND, THE SENTENCE STOPS QUOTING THE UNBOUNDED TOTAL. It read
       "« camera » touche 421 références sous 50 000 FCFA" while the figure strip
       under it read 248, because 421 is the whole search and the bound belongs
       to the figure. The sentence now states the query and the figures state the
       count, which is the only arrangement where the two cannot contradict. */
    const opening =
      bound !== ''
        ? `Ce qui porte « ${terms} » et rentre${bound}${wantsStock ? ', au comptoir aujourd’hui' : ''} :`
        : found.length === 1
          ? `Une seule référence porte « ${terms} ».`
          : shelf && found.length > 24
            ? `« ${terms} » touche ${formatCount(found.length, 'référence')}. ` +
              `Pour la vue d’ensemble, ${shelf.name} en range ${formatAmount(shelf.count)}.`
            : `Les références dont le nom, la marque ou la famille portent « ${terms} ».`

    /* A shortcut that drops the reader's own budget is a shortcut to a
       different question, so the bound travels with it through the catalogue's
       facet URL rather than through the bare shelf page. */
    const links: AssistantLink[] = [
      ...shortcuts.map((entry) =>
        bound || wantsStock
          ? { href: catalogueHref(entry.group, entry.slug, min, max, wantsStock), label: `${entry.name} sur ce filtre` }
          : { href: entry.href, label: `Ouvrir ${entry.name}`, count: entry.count },
      ),
      { href: search, label: 'Voir la recherche complète' },
    ]

    return NextResponse.json<AssistantReply>(
      answerFrom(
        found,
        scope,
        refined,
        opening,
        links,
        max !== null || min !== null || reading.wantsPrice
          ? 'prix'
          : wantsStock
            ? 'stock'
            : 'recherche',
      ),
    )
  }

  /* 9. Nothing is named this, but the words may name a shelf partially. Sending
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

  return NextResponse.json<AssistantReply>({ intent: 'main', text: FALLBACK, handoff: true })
}
