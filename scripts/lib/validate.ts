/**
 * The part that says no.
 *
 * WHY THIS FILE EXISTS AT ALL. `build-catalog.ts` is 726 lines with no `try`,
 * no `catch` and no `throw`, eight bare `Number()` calls, and a `writeFileSync`
 * at the end that runs unconditionally. That was defensible while its input was
 * a CSV a human had exported and could see: a mangled column showed up as a
 * mangled page before anyone deployed. The moment the input becomes a network
 * response on a timer, that same code becomes a machine for publishing a
 * degraded shop with no error anywhere. A truncated answer is not a crash, it
 * is a smaller catalogue, and a smaller catalogue deploys perfectly.
 *
 * So the rule here is the opposite of the rule in a renderer: never repair,
 * never default, never coerce. Refuse the record and count the refusal, and if
 * too many records are refused, refuse the whole run and leave yesterday's
 * catalogue serving. Yesterday's prices are correct. Half of today's are not.
 *
 * THE PRICE RULES ARE SEPARATE AND STRICTER, BECAUSE A WRONG PRICE IS THE WORST
 * THING THIS SHOP CAN DO. Three of them are worth naming:
 *
 * `currency_minor_unit` must be 0. It is 0 today for XAF, which has no
 * subdivision, so "80000" means eighty thousand francs. If a plugin ever
 * changes that to 2, the same string means eight hundred, and the shop
 * undercharges by a factor of a hundred while every page still renders.
 *
 * The product must be `simple`. There are zero variable products in this
 * catalogue today, verified, so this rule costs nothing now. It matters later:
 * on a variable product `prices.price` becomes the BOTTOM of a range, and our
 * own `Product.price` is documented as a firm price. That is how a shop ends up
 * advertising the cheapest variant at the price of the whole thing.
 *
 * `regular_price` must not be below `price`. A sale that costs more than the
 * list price is not a sale, it is a data fault, and the listing would draw a
 * discount badge over it.
 */

import type { WooCategory, WooProduct } from './woo.ts'

export interface Rejection {
  id: number | string
  name: string
  raison: string
}

export class SyncRefused extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SyncRefused'
  }
}

const DIGITS = /^\d+$/

/**
 * One product, checked. Returns the reason it is unusable, or null.
 *
 * Deliberately not a schema library: every clause below is a decision someone
 * has to be able to read and argue with, and a named reason is what ends up in
 * the report a human reads before a deployment.
 */
export function checkProduct(p: WooProduct): string | null {
  if (!Number.isSafeInteger(p?.id) || p.id <= 0) return "identifiant absent ou invalide"
  if (typeof p.name !== 'string' || p.name.trim() === '') return 'nom vide'
  if (typeof p.permalink !== 'string' || !p.permalink.startsWith('https://')) return 'permalien absent'

  if (!p.prices || typeof p.prices !== 'object') return 'bloc de prix absent'
  const { price, regular_price, currency_code, currency_minor_unit, price_range } = p.prices

  if (currency_code !== 'XAF') return `devise inattendue : ${currency_code}`
  if (currency_minor_unit !== 0) {
    // Not a rejection of one record: this is a shop-wide change of meaning.
    throw new SyncRefused(
      `currency_minor_unit vaut ${currency_minor_unit} au lieu de 0 sur le produit ${p.id}. ` +
        "Toute la lecture des prix change de sens : arrêt avant d'écrire quoi que ce soit.",
    )
  }
  if (typeof price !== 'string' || !DIGITS.test(price)) return `prix illisible : ${JSON.stringify(price)}`
  if (typeof regular_price !== 'string' || !DIGITS.test(regular_price)) {
    return `prix de référence illisible : ${JSON.stringify(regular_price)}`
  }
  if (Number(regular_price) < Number(price)) {
    return `prix de référence (${regular_price}) inférieur au prix courant (${price})`
  }
  if (price_range !== null && price_range !== undefined) return 'prix en fourchette : produit non simple'
  if (p.type !== 'simple') return `type ${p.type} : seul « simple » a un prix ferme`
  if (Array.isArray(p.variations) && p.variations.length > 0) return 'produit à variations'
  if (Number(price) === 0 && p.is_purchasable) return 'prix nul sur un produit achetable'

  // AN UNFILED PRODUCT IS NOT AN INVALID PRODUCT, AND REFUSING IT WAS WORSE
  // THAN KEEPING IT. This clause used to reject `categories: []`, and the first
  // full reconciliation showed what that costs: 19 products, verified against
  // the API one by one, genuinely carry no category upstream because nobody has
  // filed them, and rejecting them deleted them from the shop entirely. That is
  // the opposite of the intent. `build-catalog.ts` has had a hidden "Non classé"
  // bucket for exactly this case since long before any of this, so an unfiled
  // product lands there, stays searchable and stays purchasable, and shows up in
  // the build report where someone can go and file it.
  if (!Array.isArray(p.categories)) return 'liste de catégories absente'
  for (const c of p.categories) {
    if (!Number.isSafeInteger(c?.id) || c.id <= 0) return 'catégorie sans identifiant'
    if (typeof c.name !== 'string' || c.name.trim() === '') return 'catégorie sans nom'
  }

  if (!Array.isArray(p.images)) return 'liste d images absente'
  for (const img of p.images) {
    if (typeof img?.src !== 'string' || !img.src.startsWith('https://nowtechcenter.com/wp-content/uploads/')) {
      // next.config.ts pins that prefix. An image from anywhere else would not
      // render at all, and would do it silently in production.
      return `image hors du domaine autorisé : ${String(img?.src).slice(0, 60)}`
    }
  }
  return null
}

export function checkCategory(c: WooCategory): string | null {
  if (!Number.isSafeInteger(c?.id) || c.id <= 0) return 'identifiant absent'
  if (typeof c.name !== 'string' || c.name.trim() === '') return 'nom vide'
  if (typeof c.slug !== 'string' || c.slug.trim() === '') return 'slug vide'
  // `parent` is 0 for a root. NaN here is what silently built a broken tree.
  if (!Number.isSafeInteger(c?.parent) || c.parent < 0) return 'parent invalide'
  if (!Number.isSafeInteger(c?.count) || c.count < 0) return 'compte invalide'
  return null
}

export interface Thresholds {
  /** Share of the shop's own announced total we must actually have received. */
  minCoverage: number
  /** How far the product count may move against the previous good dataset. */
  maxDrift: number
  /** Share of records we may reject before the whole run is untrustworthy. */
  maxRejectRate: number
  /** How far the median price may move, as a share. */
  maxMedianShift: number
}

export const THRESHOLDS: Thresholds = {
  // 4 059 of the 4 273 announced today. Below that, something was truncated.
  minCoverage: 0.95,
  maxDrift: 0.1,
  maxRejectRate: 0.02,
  // The median sits at 80 000 XAF over 4 248 values. A shop does not move its
  // median by a fifth in a day; a bad parse does.
  maxMedianShift: 0.2,
}

export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

/**
 * The six refusals, applied to a whole run rather than to a record.
 *
 * These are the ones that catch the failure nobody sees: not a wrong value, but
 * a plausible dataset that is quietly missing a fifth of the shop. Each is a
 * number rather than a judgement so that it fires at three in the morning
 * without anyone present to have an opinion.
 */
export function gateRun(input: {
  received: number
  announced: number
  previous: number
  rejected: number
  medianNow: number
  medianBefore: number
  pinnedCategories: number[]
  presentCategories: Set<number>
  pinnedProducts: number[]
  presentProducts: Set<number>
  thresholds?: Thresholds
}): void {
  const t = input.thresholds ?? THRESHOLDS
  const problems: string[] = []

  if (input.announced > 0) {
    const coverage = input.received / input.announced
    if (coverage < t.minCoverage) {
      problems.push(
        `couverture ${(coverage * 100).toFixed(1)} pour cent : ${input.received} produits reçus sur ` +
          `${input.announced} annoncés par la boutique (plancher ${(t.minCoverage * 100).toFixed(0)} pour cent)`,
      )
    }
  }

  if (input.previous > 0) {
    const drift = Math.abs(input.received - input.previous) / input.previous
    if (drift > t.maxDrift) {
      problems.push(
        `écart de ${(drift * 100).toFixed(1)} pour cent avec le jeu précédent : ${input.received} contre ` +
          `${input.previous} (plafond ${(t.maxDrift * 100).toFixed(0)} pour cent)`,
      )
    }
  }

  const total = input.received + input.rejected
  if (total > 0) {
    const rate = input.rejected / total
    if (rate > t.maxRejectRate) {
      problems.push(
        `${input.rejected} enregistrements refusés sur ${total}, soit ${(rate * 100).toFixed(1)} pour cent ` +
          `(plafond ${(t.maxRejectRate * 100).toFixed(0)} pour cent)`,
      )
    }
  }

  if (input.medianBefore > 0) {
    const shift = Math.abs(input.medianNow - input.medianBefore) / input.medianBefore
    if (shift > t.maxMedianShift) {
      problems.push(
        `prix médian passé de ${input.medianBefore} à ${input.medianNow} XAF, soit ` +
          `${(shift * 100).toFixed(1)} pour cent (plafond ${(t.maxMedianShift * 100).toFixed(0)} pour cent)`,
      )
    }
  }

  // The editorial pins are the ones no threshold would notice: a category that
  // disappears upstream takes a department page down with it, and a hero
  // product that disappears empties a section of the homepage.
  const lostCategories = input.pinnedCategories.filter((id) => !input.presentCategories.has(id))
  if (lostCategories.length) {
    problems.push(
      `catégories épinglées absentes de la source : ${lostCategories.join(', ')} ` +
        '(voir src/constants/universes.ts)',
    )
  }
  const lostProducts = input.pinnedProducts.filter((id) => !input.presentProducts.has(id))
  if (lostProducts.length) {
    problems.push(
      `produits épinglés absents de la source : ${lostProducts.join(', ')} ` +
        '(voir DEPARTMENT_HERO_PRODUCT)',
    )
  }

  if (problems.length) {
    throw new SyncRefused(
      'Synchronisation refusée, le jeu de données précédent reste en place.\n  - ' + problems.join('\n  - '),
    )
  }
}
