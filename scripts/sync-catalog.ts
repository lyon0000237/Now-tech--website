/**
 * Replaces the human export, and nothing else.
 *
 * THE DECISION THAT MAKES THIS SAFE. The obvious way to make a catalogue
 * dynamic is to teach the renderer to fetch. That is refused here, on a
 * measurement: this origin answers in 2.9 seconds at best and 17.6 at worst, and
 * the search and the facets on this site are an in-memory scan of all 4 254
 * products that costs 1.0 ms precisely because the whole set is already in the
 * process. Put the network on a reader's path and you trade a 100 ms page for a
 * four second one AND lose the search, on a market where the connection is
 * metered.
 *
 * So this script writes the SAME `data/source/catalog.csv` and
 * `data/source/categories.csv` that a person used to export by hand, in the same
 * 19 and 7 columns, and `build-catalog.ts` is left untouched. Every rule it
 * already applies keeps applying: the SEO tail is still stripped, the shouting
 * names are still calmed, the 101 known brands are still matched against the
 * product name, the specs are still pulled out of the title. Nothing about how
 * this shop reads changed; only who fills the file.
 *
 * That choice buys three things that a cleverer design would have thrown away.
 * The artefact is committed, so a bad synchronisation is one `git revert` away,
 * which is not true of `src/data/generated/catalog.json` (it is in .gitignore
 * and has never been committed, so it has no history at all). The artefact is a
 * text file, so a human can read the diff before it deploys. And the build stays
 * offline, so the client's slow site can never fail our deployment.
 *
 * TWO MODES, AND THE CHEAP ONE IS THE POINT.
 *
 * `--full` takes all 43 pages: four to five minutes, tens of megabytes. It is
 * for the first run and for a deliberate reconciliation.
 *
 * The default is incremental, and it rests on the split documented in
 * `lib/woo.ts`: `wp/v2` honours `modified_after` and tells us WHICH products
 * moved for a few hundred bytes, then the Store API is asked for exactly those
 * by id. Measured against this shop's own rate of change, 5.8 products touched a
 * day, that is two requests to stay current instead of forty-three pages.
 *
 * WHAT IT REFUSES TO DECIDE ON ITS OWN.
 *
 * The primary category is not in the API. WooCommerce lets a product sit in
 * several terms and does not mark one as principal, and on this site that single
 * field decides which of the twelve departments a product belongs to and which
 * label its card carries. Recomputing it from a rule would silently reshuffle
 * products that have been filed the same way for months. So an existing
 * product KEEPS the primary category already recorded in the CSV, and the rule
 * (deepest term, then lowest id) is applied only to products we have never seen.
 * The 4 254 products already there do not move.
 *
 * Slugs are frozen for the same reason, in `data/source/slug-map.json`. Our URLs
 * come from `slugify(name)`, and 95.8 per cent of them already differ from
 * WooCommerce's own slug, so the first time the client fixes a typo upstream the
 * name changes, the slug changes, and an indexed URL becomes a 404. Once an id
 * has a slug it keeps it, whatever happens to the name.
 *
 * Deletions cannot be detected incrementally: `modified_after` only ever returns
 * things that still exist. So a routine run compares the shop's announced total
 * with ours and, when they disagree, says so and asks for a full run rather than
 * pretending.
 */

import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { UNIVERSE_DEFINITIONS, DEPARTMENT_HERO_PRODUCT } from '../src/constants/universes.ts'
import {
  allCategories,
  allProducts,
  changedSince,
  countProducts,
  newBudget,
  productsByIds,
  WooRefused,
  type WooCategory,
  type WooProduct,
} from './lib/woo.ts'
import {
  checkCategory,
  checkProduct,
  gateRun,
  median,
  SyncRefused,
  type Rejection,
} from './lib/validate.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = join(ROOT, 'data', 'source')
const CATALOG_CSV = join(SOURCE, 'catalog.csv')
const CATEGORIES_CSV = join(SOURCE, 'categories.csv')
const STATE = join(SOURCE, 'sync-state.json')
const SLUGS = join(SOURCE, 'slug-map.json')
const REPORT = join(SOURCE, 'sync-report.txt')

const full = process.argv.includes('--full')
const dryRun = process.argv.includes('--dry-run')

const log: string[] = []
function say(line: string) {
  log.push(line)
  console.log(line)
}

// -- reading what we already have ---------------------------------------------

/** The 19 columns, in the order the existing file uses. */
const COLUMNS = [
  'primary_category',
  'all_categories',
  'product_id',
  'product_name',
  'sku',
  'en_promo',
  'prix_normal',
  'prix_promo',
  'prix_actuel',
  'reduction_montant',
  'reduction_pct',
  'currency',
  'stock',
  'brand',
  'product_url',
  'image_index',
  'image_total',
  'image_url',
  'image_alt',
] as const
type Column = (typeof COLUMNS)[number]
type Row = Record<Column, string>

/**
 * A CSV reader that keeps quoted commas and newlines intact.
 *
 * Deliberately duplicated from `build-catalog.ts` rather than shared: that file
 * is the one thing in this pipeline that has been correct for months, and
 * reaching into it to export a helper is a change to working code for the
 * convenience of new code.
 */
function parseCsv(text: string): Record<string, string>[] {
  const clean = text.replace(/^﻿/, '').replace(/\r\n/g, '\n')
  const rows: string[][] = []
  let cell = ''
  let row: string[] = []
  let quoted = false
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]
    if (quoted) {
      if (char === '"') {
        if (clean[i + 1] === '"') {
          cell += '"'
          i++
        } else quoted = false
      } else cell += char
      continue
    }
    if (char === '"') quoted = true
    else if (char === ',') {
      row.push(cell)
      cell = ''
    } else if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += char
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }
  const header = rows.shift()
  if (!header) return []
  return rows
    .filter((r) => r.some((c) => c !== ''))
    .map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])))
}

function writeCsv(path: string, header: readonly string[], rows: string[][]): void {
  const escape = (value: string) =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
  const text =
    header.join(',') + '\n' + rows.map((r) => r.map(escape).join(',')).join('\n') + '\n'
  // Atomic: a run killed mid-write must not leave a half file where the
  // previous good one was. Rename is the only step that is not interruptible.
  const temp = `${path}.tmp`
  writeFileSync(temp, text)
  renameSync(temp, path)
}

interface State {
  lastSyncedAt: string | null
  lastModifiedSeen: string | null
  productCount: number
  medianPrice: number
  onlineTotal: number
  mode: string
}

function readState(): State {
  if (!existsSync(STATE)) {
    return {
      lastSyncedAt: null,
      lastModifiedSeen: null,
      productCount: 0,
      medianPrice: 0,
      onlineTotal: 0,
      mode: 'jamais',
    }
  }
  return JSON.parse(readFileSync(STATE, 'utf8')) as State
}

function readSlugMap(): Record<string, string> {
  if (!existsSync(SLUGS)) return {}
  return JSON.parse(readFileSync(SLUGS, 'utf8')) as Record<string, string>
}

// -- turning the API's shape into the export's shape --------------------------

/**
 * The primary category for a product we have never seen.
 *
 * `categories` arrives without a marker and without a documented order, so the
 * only defensible rule is structural: the deepest term is the most specific
 * thing the merchant said about the product, and the lowest id breaks a tie
 * because it is stable. This runs for new products only, so it can never move
 * one that is already filed.
 */
function pickPrimary(
  categories: WooProduct['categories'],
  depth: Map<number, number>,
): string {
  let best = categories[0]
  let bestDepth = depth.get(best.id) ?? 0
  for (const c of categories.slice(1)) {
    const d = depth.get(c.id) ?? 0
    if (d > bestDepth || (d === bestDepth && c.id < best.id)) {
      best = c
      bestDepth = d
    }
  }
  return best.name
}

/** One product becomes one row per photograph, which is the export's shape. */
function toRows(
  p: WooProduct,
  primaryName: string,
  brandFromBefore: string,
): string[][] {
  const price = Number(p.prices.price)
  const regular = Number(p.prices.regular_price)
  const onSale = regular > price
  const all = p.categories.map((c) => c.name).join('|')
  const images = p.images.length ? p.images : [{ src: '', alt: '' } as WooProduct['images'][0]]

  return images.map((img, index) => {
    const row: Record<Column, string> = {
      primary_category: primaryName,
      all_categories: all,
      product_id: String(p.id),
      product_name: p.name,
      sku: p.sku ?? '',
      en_promo: onSale ? 'oui' : 'non',
      prix_normal: String(regular),
      prix_promo: onSale ? String(price) : '',
      prix_actuel: String(price),
      reduction_montant: onSale ? String(regular - price) : '',
      reduction_pct: onSale ? `${Math.round(((regular - price) / regular) * 100)}%` : '',
      currency: p.prices.currency_code,
      // The export only ever carried two words, and `build-catalog.ts` tests for
      // exactly one of them (`row.stock !== 'rupture'`). The API knows more, but
      // widening this column would change the meaning of a file another script
      // already reads correctly.
      stock: p.is_in_stock ? 'en stock' : 'rupture',
      brand: brandFromBefore,
      product_url: p.permalink,
      image_index: String(index + 1),
      image_total: String(images.length),
      image_url: img.src ?? '',
      image_alt: img.alt || p.name,
    }
    return COLUMNS.map((c) => row[c])
  })
}

/** level and full_path are not in the API; they are walks up the parent chain. */
function categoryRows(cats: WooCategory[]): { rows: string[][]; depth: Map<number, number> } {
  const byId = new Map(cats.map((c) => [c.id, c]))
  const depth = new Map<number, number>()
  const path = new Map<number, string>()

  const walk = (id: number, seen = new Set<number>()): { level: number; full: string } => {
    const cached = depth.get(id)
    if (cached !== undefined) return { level: cached, full: path.get(id)! }
    const c = byId.get(id)
    if (!c) return { level: 0, full: '' }
    // A cycle upstream would otherwise hang the run rather than fail it.
    if (seen.has(id)) throw new SyncRefused(`cycle dans l'arbre des catégories autour de ${id}`)
    seen.add(id)
    const parent = c.parent && byId.has(c.parent) ? walk(c.parent, seen) : null
    const level = parent ? parent.level + 1 : 0
    const full = parent ? `${parent.full} > ${c.name}` : c.name
    depth.set(id, level)
    path.set(id, full)
    return { level, full }
  }

  const rows = cats
    .slice()
    .sort((a, b) => a.id - b.id)
    .map((c) => {
      const { level, full } = walk(c.id)
      return [String(c.id), c.name, c.slug, String(c.parent), String(level), full, String(c.count)]
    })
  return { rows, depth }
}

// -- the run ------------------------------------------------------------------

async function main(): Promise<void> {
  const startedAt = new Date().toISOString()
  const state = readState()
  const budget = newBudget(full ? 60 : 12)

  say(`Synchronisation ${full ? 'complète' : 'incrémentale'} — ${startedAt}`)
  say(`  dernière synchronisation : ${state.lastSyncedAt ?? 'jamais'}`)

  const before = existsSync(CATALOG_CSV) ? (parseCsv(readFileSync(CATALOG_CSV, 'utf8')) as unknown as Row[]) : []
  const beforeByProduct = new Map<number, Row[]>()
  for (const row of before) {
    const id = Number(row.product_id)
    if (!Number.isSafeInteger(id)) continue
    const list = beforeByProduct.get(id) ?? []
    list.push(row)
    beforeByProduct.set(id, list)
  }
  say(`  produits déjà dans l'export : ${beforeByProduct.size}`)

  if (!full && state.lastModifiedSeen === null) {
    throw new SyncRefused(
      "Aucun état de synchronisation : la première exécution doit être complète (npm run sync:full).",
    )
  }

  // The category tree is small and its ids anchor everything else, so it is
  // always taken whole, in both modes.
  const cats = await allCategories(budget)
  const badCats: Rejection[] = []
  const goodCats = cats.filter((c) => {
    const why = checkCategory(c)
    if (why) badCats.push({ id: c?.id ?? '?', name: c?.name ?? '', raison: why })
    return !why
  })
  say(`  catégories : ${goodCats.length} retenues, ${badCats.length} refusées`)

  const { rows: catRows, depth } = categoryRows(goodCats)

  const announced = await countProducts(budget)
  say(`  produits annoncés en ligne : ${announced}`)

  let fetched: WooProduct[]
  let touchedIds: number[] = []

  if (full) {
    say('  aspiration complète, 43 pages environ, compter quatre à cinq minutes')
    fetched = await allProducts(budget, (page, pages, ms) =>
      console.log(`    page ${page}/${pages} en ${(ms / 1000).toFixed(1)}s`),
    )
    say(`  produits reçus : ${fetched.length}`)
  } else {
    const { ids, total } = await changedSince(state.lastModifiedSeen!, budget)
    touchedIds = ids
    say(`  produits touchés depuis ${state.lastModifiedSeen} : ${total}`)
    if (ids.length === 0) {
      say('  rien à faire.')
      if (!dryRun) {
        writeFileSync(
          STATE,
          JSON.stringify({ ...state, lastSyncedAt: startedAt, onlineTotal: announced }, null, 2) + '\n',
        )
        writeFileSync(REPORT, log.join('\n') + '\n')
      }
      return
    }
    fetched = await productsByIds(ids, budget)
    say(`  produits récupérés : ${fetched.length}`)
    if (fetched.length < ids.length) {
      // A touched id the Store API will not return is a product that left the
      // shop's public view: unpublished, made private, or trashed.
      const missing = ids.filter((id) => !fetched.some((p) => p.id === id))
      say(`  ${missing.length} identifiants touchés mais absents du catalogue public : ${missing.join(', ')}`)
    }
  }

  // -- validate ---------------------------------------------------------------

  const rejected: Rejection[] = []
  const kept = fetched.filter((p) => {
    const why = checkProduct(p)
    if (why) rejected.push({ id: p?.id ?? '?', name: (p?.name ?? '').slice(0, 60), raison: why })
    return !why
  })
  if (rejected.length) {
    say(`  refusés : ${rejected.length}`)
    for (const r of rejected.slice(0, 20)) say(`    ${r.id} — ${r.raison} — ${r.name}`)
  }

  // -- build the new file ---------------------------------------------------

  const slugMap = readSlugMap()
  const rowsByProduct = new Map<number, string[][]>(
    full ? [] : [...beforeByProduct].map(([id, rows]) => [id, rows.map((r) => COLUMNS.map((c) => r[c] ?? ''))]),
  )

  let added = 0
  const priceMoves: { id: number; name: string; from: number; to: number }[] = []

  for (const p of kept) {
    const known = beforeByProduct.get(p.id)
    const primaryName = known?.[0]?.primary_category?.trim()
      ? known[0].primary_category
      : pickPrimary(p.categories, depth)
    if (!known) added++
    const brandBefore = known?.[0]?.brand ?? ''

    if (known) {
      const wasPrice = Number(known[0].prix_actuel)
      const isPrice = Number(p.prices.price)
      if (Number.isFinite(wasPrice) && wasPrice !== isPrice) {
        priceMoves.push({ id: p.id, name: p.name.slice(0, 52), from: wasPrice, to: isPrice })
      }
    }
    rowsByProduct.set(p.id, toRows(p, primaryName, brandBefore))
    if (!slugMap[String(p.id)]) slugMap[String(p.id)] = ''
  }

  const received = rowsByProduct.size
  const prices = [...rowsByProduct.values()].map((rows) => Number(rows[0][COLUMNS.indexOf('prix_actuel')]))
  const medianNow = median(prices.filter(Number.isFinite))

  // -- the six refusals -----------------------------------------------------

  const presentCategories = new Set(goodCats.map((c) => c.id))
  const pinnedCategories = [...new Set(UNIVERSE_DEFINITIONS.flatMap((u) => [...u.categoryIds]))]
  gateRun({
    received,
    // In incremental mode the announced total is the shop's whole catalogue and
    // `received` is our whole file, so the comparison is meaningful in both.
    announced,
    previous: beforeByProduct.size,
    rejected: rejected.length,
    medianNow,
    medianBefore: state.medianPrice,
    pinnedCategories,
    presentCategories,
    pinnedProducts: Object.values(DEPARTMENT_HERO_PRODUCT),
    presentProducts: new Set(rowsByProduct.keys()),
  })

  // -- deletions, which no incremental run can see --------------------------

  if (!full && announced !== received) {
    say(
      `  ATTENTION : la boutique annonce ${announced} produits, notre export en contient ${received}. ` +
        `Un écart de ${announced - received} ne peut pas venir d'une synchronisation incrémentale ` +
        '(modified_after ne renvoie jamais ce qui a été supprimé). Lancer npm run sync:full pour réconcilier.',
    )
  }

  // -- report ---------------------------------------------------------------

  say('')
  say('CE QUI CHANGE')
  say(`  produits ajoutés : ${added}`)
  say(`  prix modifiés : ${priceMoves.length}`)
  for (const m of priceMoves.slice(0, 40)) {
    const pct = m.from ? Math.round(((m.to - m.from) / m.from) * 100) : 0
    const flag = Math.abs(pct) >= 50 ? '  <-- écart de plus de 50 pour cent' : ''
    say(`    ${m.id} ${m.from} -> ${m.to} XAF (${pct > 0 ? '+' : ''}${pct} pour cent) ${m.name}${flag}`)
  }
  say(`  prix médian : ${state.medianPrice || '?'} -> ${medianNow} XAF`)
  say(`  requêtes émises : ${budget.spent} sur ${budget.cap} autorisées`)

  if (dryRun) {
    say('')
    say('--dry-run : rien écrit.')
    writeFileSync(REPORT, log.join('\n') + '\n')
    return
  }

  // -- write ----------------------------------------------------------------

  const productRows = [...rowsByProduct.entries()]
    .sort((a, b) => a[0] - b[0])
    .flatMap(([, rows]) => rows)

  mkdirSync(SOURCE, { recursive: true })
  writeCsv(CATALOG_CSV, COLUMNS, productRows)
  writeCsv(
    CATEGORIES_CSV,
    ['category_id', 'name', 'slug', 'parent_id', 'level', 'full_path', 'product_count'],
    catRows,
  )

  const newestModified =
    !full && touchedIds.length
      ? // Advance the clock to now rather than to the newest record we saw: a
        // product edited during this run would otherwise be skipped for ever.
        startedAt
      : startedAt

  writeFileSync(
    STATE,
    JSON.stringify(
      {
        lastSyncedAt: startedAt,
        lastModifiedSeen: newestModified,
        productCount: received,
        medianPrice: medianNow,
        onlineTotal: announced,
        mode: full ? 'complète' : 'incrémentale',
      } as State,
      null,
      2,
    ) + '\n',
  )
  writeFileSync(SLUGS, JSON.stringify(slugMap, null, 0) + '\n')
  writeFileSync(REPORT, log.join('\n') + '\n')
  say('')
  say(`Écrit : ${received} produits, ${catRows.length} catégories.`)
}

main().catch((error: unknown) => {
  if (error instanceof SyncRefused) {
    console.error(`\nREFUSÉ\n${error.message}`)
    process.exit(2)
  }
  if (error instanceof WooRefused) {
    console.error(
      `\nREFUS DE L'ORIGINE (${error.status})\n${error.message}\n` +
        "Rien n'a été écrit. Si cela persiste, le point d'entrée public a peut-être été fermé.",
    )
    process.exit(3)
  }
  console.error('\nÉCHEC')
  console.error(error)
  process.exit(1)
})
