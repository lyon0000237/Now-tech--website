/**
 * Catalog build step.
 *
 * Reads the raw WooCommerce export in `data/source/` and writes a normalised,
 * strongly-typed dataset to `src/data/generated/`. Runs before `dev` and
 * `build` (see the `predev` / `prebuild` scripts), so the app never parses CSV
 * at request time and never ships raw export columns into the UI.
 *
 * Run directly with `node scripts/build-catalog.ts` — Node strips the types.
 *
 * Everything this script derives (brand, recency, specs, cleaned names) is
 * derived from real export data. Nothing is invented; missing data stays null.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { SUPPRESSED_PRODUCTS } from '../src/constants/suppressed.ts'
import { UNIVERSE_DEFINITIONS, FALLBACK_UNIVERSE_ID } from '../src/constants/universes.ts'
import type {
  Brand,
  Catalog,
  Category,
  Product,
  ProductImage,
  Universe,
  UniverseId,
} from '../src/types/catalog.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_DIR = join(ROOT, 'data', 'source')
const OUT_DIR = join(ROOT, 'src', 'data', 'generated')

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/** Minimal RFC-4180 reader. The export contains quoted commas and quoted quotes. */
function parseCsv(text: string): Record<string, string>[] {
  const clean = text.replace(/^﻿/, '').replace(/\r\n/g, '\n')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]
    if (quoted) {
      if (char === '"') {
        if (clean[i + 1] === '"') {
          field += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        field += char
      }
      continue
    }
    if (char === '"') quoted = true
    else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += char
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  const [header, ...body] = rows
  return body
    .filter((r) => r.length > 1)
    .map((r) => Object.fromEntries(header.map((key, i) => [key, r[i] ?? ''])))
}

// ---------------------------------------------------------------------------
// Text normalisation
// ---------------------------------------------------------------------------

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  eacute: 'é',
  egrave: 'è',
  agrave: 'à',
  ccedil: 'ç',
  ocirc: 'ô',
  hellip: '…',
  ndash: '–',
  mdash: '—',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  times: '×',
}

/**
 * The export is double-encoded in places (`&amp;#8217;`), so decoding repeats
 * until the string stops changing.
 */
function decodeEntities(input: string): string {
  let out = input
  for (let pass = 0; pass < 4; pass++) {
    const next = out.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, body: string) => {
      if (body.startsWith('#x') || body.startsWith('#X')) {
        return String.fromCodePoint(parseInt(body.slice(2), 16))
      }
      if (body.startsWith('#')) return String.fromCodePoint(parseInt(body.slice(1), 10))
      return NAMED_ENTITIES[body.toLowerCase()] ?? match
    })
    if (next === out) break
    out = next
  }
  return out
}

/** Typographic characters the export uses inconsistently, unified for display. */
function normaliseTypography(input: string): string {
  return input
    .replace(/[\u2033\u201D\u201C]/g, '"')
    .replace(/[\u2032\u2019\u2018]/g, "'")
    .replace(/[\u2011\u2010]/g, '-')
    .replace(/[\u00A0\u202F\u2009]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * SEO boilerplate appended to almost every product name by the current site:
 * 3,734 names end in "en vente", 3,250 in "bon prix", 2,672 in "au cameroun".
 * Stripping it is what lets the grid be set in editorial type instead of
 * three lines of keyword soup.
 */
const SEO_TAIL =
  /\s*[-–—,.:;|]*\s*\b(bon\s+prix|meilleur\s+prix|moins\s+cher|pas\s+cher|prix\s+promo|en\s+promotion|promotion|en\s+vente|disponible\s+en\s+stock|disponible|au\s+cameroun|a\s+douala|à\s+douala|a\s+yaound[ée]|à\s+yaound[ée])\b.*$/i

/** Acronyms and units that must survive the de-shouting pass. */
const KEEP_UPPERCASE = new Set([
  'HP', 'LG', 'TV', 'PC', 'IP', 'AP', 'VA', 'AC', 'DC', 'HD', 'UK', 'US', 'EU', 'AV', 'MP', 'GO',
  'SSD', 'HDD', 'RAM', 'ROM', 'USB', 'POE', 'NVR', 'DVR', 'GSM', 'LED', 'LCD', 'UPS', 'VGA', 'DVI',
  'SFP', 'SIM', 'NAS', 'SAS', 'PBX', 'UTP', 'FTP', 'BNC', 'OTG', 'KVA', 'GHZ', 'MHZ', 'RJ45', 'WIFI',
  'HDMI', 'IPBX', 'SATA', 'NVME', 'EMMC', 'PTZ', 'ONU', 'GPS', 'QOS', 'UTM', 'VPN', 'LAN', 'WAN',
  'CPU', 'GPU', 'PSU', 'ATX', 'DDR', 'ANC', 'OLED', 'QLED', 'UHD', 'CCTV', 'PVC', 'A3', 'A4', 'N/B',
])

/**
 * A large share of names are shouted in full caps, which is unreadable at
 * editorial sizes. Words carrying a digit (model numbers) and known acronyms
 * are preserved verbatim; everything else drops to sentence case.
 */
function deShout(input: string): string {
  const letters = input.replace(/[^A-Za-zÀ-ÿ]/g, '')
  if (letters.length < 8) return input
  const upperRatio = (input.match(/[A-ZÀ-Þ]/g)?.length ?? 0) / letters.length
  if (upperRatio < 0.8) return input

  return input
    .split(' ')
    .map((word) => {
      const bare = word.replace(/[^A-Za-z0-9À-ÿ/]/g, '')
      if (!bare) return word
      if (/\d/.test(bare)) return word
      if (KEEP_UPPERCASE.has(bare.toUpperCase())) return word
      if (bare.length <= 2) return word
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

function cleanProductName(raw: string): string {
  let name = normaliseTypography(decodeEntities(raw))
  // Some names carry the boilerplate twice, e.g. "... bon prix en vente au Cameroun.".
  for (let pass = 0; pass < 3; pass++) {
    const next = name.replace(SEO_TAIL, '')
    if (next === name) break
    name = next
  }
  name = name.replace(/[\s\-–—,.:;|]+$/, '').trim()
  return deShout(normaliseTypography(name))
}

/** Leading dots are a WooCommerce sort-order hack, not part of the name. */
function cleanCategoryName(raw: string): string {
  return normaliseTypography(decodeEntities(raw)).replace(/^[.\s]+/, '').trim()
}

function slugify(input: string, maxLength = 72): string {
  const base = decodeEntities(input)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (base.length <= maxLength) return base || 'item'
  const cut = base.slice(0, maxLength)
  const lastDash = cut.lastIndexOf('-')
  return (lastDash > maxLength * 0.6 ? cut.slice(0, lastDash) : cut).replace(/-+$/, '')
}

// ---------------------------------------------------------------------------
// Derivation
// ---------------------------------------------------------------------------

/**
 * Brand is not a usable taxonomy in the export — the `brand` column is filled
 * on 14 of 7,116 rows. It is however encoded in category names ("Laptop HP",
 * "Cameras HIKVISION") and in product names. Matching this list against both
 * recovers a brand for 64% of the catalog, which is enough to drive a real
 * brand filter. Longest names are tested first so "TRIPP LITE" wins over "LITE".
 */
const KNOWN_BRANDS: readonly string[] = [
  // computing
  'HP', 'DELL', 'LENOVO', 'ASUS', 'ACER', 'MSI', 'APPLE', 'MACBOOK', 'MAC', 'MICROSOFT', 'SURFACE',
  'TOSHIBA', 'FUJITSU', 'GIGABYTE', 'INTEL', 'AMD',
  // surveillance & access control
  'HIKVISION', 'HIKVION', 'DAHUA', 'UNIVIEW', 'UNV', 'TIANDY', 'EZVIZ', 'IMOU', 'CP PLUS',
  'MULTISTAR', 'PREMAX', 'ZKTECO', 'SUPREMA', 'IPBIO', 'PYRONIX', 'HILOOK',
  // network & telecom
  'CISCO', 'TP-LINK', 'TPLINK', 'D-LINK', 'DLINK', 'MIKROTIK', 'UBIQUITI', 'TENDA', 'NETGEAR',
  'HUAWEI', 'LINKSYS', 'COMMANDO', 'WAVLINK', 'GRANDSTREAM', 'FANVIL', 'YEALINK', 'YEAKLINK',
  'PANASONIC', 'FORTINET', 'FORTIGATE', 'DINSTAR', 'YEASTAR', 'RUIJIE', 'ARUBA', 'AICO',
  // power
  'APC', 'EATON', 'SALICRU', 'SUKAM', 'EURONET', 'LIGHTWAVE', 'MERCURY', 'NITRAM', 'TRIPP LITE',
  'TRIPPLITE', 'ECUS', 'ANDELI', 'DELTA', 'YAKI', 'SCHNEIDER', 'LEGRAND', 'VICTRON', 'ANC',
  'FELICITY', 'FELICITY SOLAR', 'MUST', 'GROWATT',
  // print
  'CANON', 'EPSON', 'RICOH', 'BROTHER', 'ZEBRA', 'EVOLIS', 'XEROX', 'KYOCERA', 'LEXMARK', 'OKI',
  // display, audio, appliance
  'SAMSUNG', 'LG', 'HISENSE', 'SONY', 'PHILIPS', 'SKILL TECH', 'SKILLTECH', 'TCL', 'JBL', 'BOSE',
  'EPSON', 'BENQ', 'NEC', 'VIEWSONIC', 'NIKON', 'GOPRO', 'DJI',
  // storage
  'SEAGATE', 'WESTERN DIGITAL', 'SANDISK', 'KINGSTON', 'QNAP', 'SYNOLOGY', 'TRANSCEND', 'ADATA',
  'CRUCIAL', 'VERBATIM',
  // mobile & accessories
  'TECNO', 'INFINIX', 'ITEL', 'XIAOMI', 'REDMI', 'REALME', 'ORAIMO', 'NOKIA', 'OPPO', 'SAMSUNG',
  'LOGITECH', 'ANKER', 'BASEUS', 'GARMIN', 'GENIUS', 'A4TECH', 'POLYCOM', 'BOSCH', 'BAOFENG',
  // long tail confirmed by scanning the names of otherwise unbranded products
  'HPE', 'LEXAR', 'DESAUTEL', 'KOCOM', 'NAPCO', 'KASPERSKY', 'BLUEFIELD', 'TOPLINK', 'REYEE',
  'WERSTERN', 'LG-HOME',
]

const BRAND_PATTERNS: readonly { name: string; pattern: RegExp }[] = Array.from(
  new Set(KNOWN_BRANDS),
)
  .sort((a, b) => b.length - a.length)
  .map((name) => ({
    name,
    // Word-boundary match on a punctuation-stripped, upper-cased haystack.
    pattern: new RegExp(`(^| )${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$)`),
  }))

function haystack(input: string): string {
  return ` ${decodeEntities(input).toUpperCase().replace(/[^A-Z0-9 -]/g, ' ').replace(/\s+/g, ' ').trim()} `
}

/**
 * Brand detection.
 *
 * Two rules, both learned from getting it wrong on real rows:
 *
 * 1. The product name wins over the category path. Category names are
 *    merchandising, not truth — a TP-LINK CPE605 antenna is filed under
 *    "Routeurs/AP/Antennes Mikrotik" because that is the shelf it sits on, and
 *    trusting the path labels it MIKROTIK.
 *
 * 2. Within the name, the *earliest* match wins, not the longest. Testing
 *    longest-first branded "Laptop Dell 15 … Intel Core i5" as INTEL, because
 *    INTEL is a longer string than DELL. Makers lead their own product names
 *    and components are quoted later in the spec tail, so position is the
 *    signal. Ties at the same position go to the longer name, which is what
 *    keeps TRIPP LITE from collapsing to TRIPP.
 */
function detectBrandIn(text: string): string | null {
  let best: { name: string; index: number } | null = null
  for (const { name, pattern } of BRAND_PATTERNS) {
    const match = text.match(pattern)
    if (match?.index === undefined) continue
    // +1 skips the leading space the pattern captures.
    const index = match.index + 1
    if (!best || index < best.index || (index === best.index && name.length > best.name.length)) {
      best = { name, index }
    }
  }
  return best ? canonicalBrand(best.name) : null
}

function detectBrand(categoryPath: string, productName: string): string | null {
  return detectBrandIn(haystack(productName)) ?? detectBrandIn(haystack(categoryPath))
}

/** Collapses the spelling variants the export uses for the same maker. */
const BRAND_ALIASES: Record<string, string> = {
  TPLINK: 'TP-LINK',
  DLINK: 'D-LINK',
  HIKVION: 'HIKVISION',
  UNV: 'UNIVIEW',
  YEAKLINK: 'YEALINK',
  TRIPPLITE: 'TRIPP LITE',
  SKILLTECH: 'SKILL TECH',
  MACBOOK: 'APPLE',
  MAC: 'APPLE',
  SURFACE: 'MICROSOFT',
  FORTIGATE: 'FORTINET',
  REDMI: 'XIAOMI',
  WERSTERN: 'WESTERN DIGITAL',
  'LG-HOME': 'LG',
  'FELICITY SOLAR': 'FELICITY',
}

function canonicalBrand(name: string): string {
  return BRAND_ALIASES[name] ?? name
}

/**
 * Short technical facts pulled out of the product name.
 *
 * The catalog has no attribute columns, but the names are dense with specs.
 * Surfacing two or three of them under the title is what makes a grid of
 * near-identical black boxes comparable at a glance.
 */
const SPEC_MATCHERS: readonly { pattern: RegExp; format: (m: RegExpMatchArray) => string }[] = [
  { pattern: /\b(\d{1,3})\s?(?:GO|GB)\s?(?:DE\s)?RAM\b/i, format: (m) => `${m[1]} Go RAM` },
  { pattern: /\bRAM\s?:?\s?(\d{1,3})\s?(?:GO|GB)\b/i, format: (m) => `${m[1]} Go RAM` },
  { pattern: /\b(\d{3,4})\s?(?:GO|GB)\s?SSD\b/i, format: (m) => `${m[1]} Go SSD` },
  { pattern: /\b(\d{1,2})\s?(?:TO|TB)\b/i, format: (m) => `${m[1]} To` },
  { pattern: /\b(\d{1,2}[.,]?\d?)\s?["'′″]\b/, format: (m) => `${m[1].replace(',', '.')}"` },
  { pattern: /\b(\d{1,3})\s?MP\b/i, format: (m) => `${m[1]} MP` },
  { pattern: /\b(\d{1,3})\s?ports?\b/i, format: (m) => `${m[1]} ports` },
  { pattern: /\b(\d{2,5})\s?VA\b/i, format: (m) => `${m[1]} VA` },
  { pattern: /\b(\d{1,2}(?:[.,]\d)?)\s?KVA\b/i, format: (m) => `${m[1].replace(',', '.')} kVA` },
  { pattern: /\b(AX\d{3,4}|AC\d{3,4})\b/i, format: (m) => m[1].toUpperCase() },
  { pattern: /\b(WI-?FI\s?6E?|WI-?FI\s?5)\b/i, format: (m) => m[1].toUpperCase().replace('WIFI', 'WI-FI') },
  { pattern: /\bCORE\s?(I[3579])\b/i, format: (m) => `Core ${m[1].toLowerCase()}` },
  { pattern: /\b(\d{1,4})\s?W\b/, format: (m) => `${m[1]} W` },
]

function extractSpecs(name: string, limit = 3): string[] {
  const found: string[] = []
  for (const { pattern, format } of SPEC_MATCHERS) {
    const match = name.match(pattern)
    if (!match) continue
    const value = format(match)
    if (!found.includes(value)) found.push(value)
    if (found.length >= limit) break
  }
  return found
}

/** `YYYY-MM` taken from the WordPress upload path — the export has no created_at. */
function uploadMonth(imageUrl: string): string | null {
  const match = imageUrl.match(/\/uploads\/(\d{4})\/(\d{2})\//)
  return match ? `${match[1]}-${match[2]}` : null
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

interface SourceCategoryRow {
  category_id: string
  name: string
  slug: string
  parent_id: string
  level: string
  full_path: string
  product_count: string
}

interface SourceProductRow {
  primary_category: string
  all_categories: string
  product_id: string
  product_name: string
  en_promo: string
  prix_normal: string
  prix_promo: string
  prix_actuel: string
  reduction_pct: string
  stock: string
  product_url: string
  image_index: string
  image_url: string
  image_alt: string
}

const report: string[] = []
function note(line: string) {
  report.push(line)
  console.log(line)
}

function build(): Catalog {
  const categoryRows = parseCsv(
    readFileSync(join(SOURCE_DIR, 'categories.csv'), 'utf8'),
  ) as unknown as SourceCategoryRow[]
  const productRows = parseCsv(
    readFileSync(join(SOURCE_DIR, 'catalog.csv'), 'utf8'),
  ) as unknown as SourceProductRow[]

  note(`source: ${categoryRows.length} category rows, ${productRows.length} product image rows`)

  // -- categories -----------------------------------------------------------

  // A universe may bind a term at any depth, so resolution walks self -> root
  // and takes the first binding it meets. That is what lets "Téléphonie" leave
  // its parent "Réseaux et Télecommunication" for the telecom department while
  // its siblings stay behind.
  const universeOfCategoryId = new Map<number, UniverseId>()
  for (const universe of UNIVERSE_DEFINITIONS) {
    for (const categoryId of universe.categoryIds) universeOfCategoryId.set(categoryId, universe.id)
  }

  const usedCategorySlugs = new Set<string>()
  interface Draft {
    id: number
    name: string
    slug: string
    parentId: number | null
    level: number
    directCount: number
    childIds: number[]
    ancestorIds: number[]
    universeId: UniverseId
    productIds: Set<number>
    hidden?: boolean
  }

  const drafts = new Map<number, Draft>()

  /**
   * WooCommerce leaves 20 products under "(Sans catégorie)" with no other term.
   * They are current, sellable stock — ThinkPads, solar kits — so they get a
   * real home rather than being dropped. The bucket is hidden from navigation
   * because guessing a category for them would be inventing taxonomy.
   */
  const UNCLASSIFIED_ID = 0
  drafts.set(UNCLASSIFIED_ID, {
    id: UNCLASSIFIED_ID,
    name: 'Non classé',
    slug: 'non-classe',
    parentId: null,
    level: 0,
    directCount: 0,
    childIds: [],
    ancestorIds: [],
    universeId: FALLBACK_UNIVERSE_ID,
    productIds: new Set(),
    hidden: true,
  })
  usedCategorySlugs.add('non-classe')

  for (const row of categoryRows) {
    const id = Number(row.category_id)
    const name = cleanCategoryName(row.name)
    let slug = slugify(name)
    if (usedCategorySlugs.has(slug)) slug = `${slug}-${id}`
    usedCategorySlugs.add(slug)
    drafts.set(id, {
      id,
      name,
      slug,
      parentId: Number(row.parent_id) === 0 ? null : Number(row.parent_id),
      level: Number(row.level),
      directCount: Number(row.product_count),
      childIds: [],
      ancestorIds: [],
      universeId: FALLBACK_UNIVERSE_ID,
      productIds: new Set(),
    })
  }

  for (const draft of drafts.values()) {
    if (draft.parentId !== null) drafts.get(draft.parentId)?.childIds.push(draft.id)
  }

  for (const draft of drafts.values()) {
    const chain: number[] = []
    let cursor = draft.parentId
    while (cursor !== null && drafts.has(cursor)) {
      chain.unshift(cursor)
      cursor = drafts.get(cursor)!.parentId
    }
    draft.ancestorIds = chain
    // Nearest binding wins: self first, then up the chain.
    draft.universeId =
      [draft.id, ...[...chain].reverse()]
        .map((id) => universeOfCategoryId.get(id))
        .find((id): id is UniverseId => Boolean(id)) ?? FALLBACK_UNIVERSE_ID
  }

  const unbound = [...drafts.values()].filter(
    (d) =>
      !d.hidden &&
      ![d.id, ...[...d.ancestorIds].reverse()].some((id) => universeOfCategoryId.has(id)),
  )
  if (unbound.length) {
    note(
      `WARNING ${unbound.length} categories have no universe binding: ` +
        unbound.map((d) => `${d.id}:${d.name}`).join(', '),
    )
  }

  // Name -> id index used to resolve the product rows, which reference
  // categories by display name rather than by id.
  const byName = new Map<string, Draft[]>()
  for (const draft of drafts.values()) {
    const key = draft.name.toLowerCase()
    const bucket = byName.get(key)
    if (bucket) bucket.push(draft)
    else byName.set(key, [draft])
  }

  function resolveCategory(rawName: string, siblings: string[]): Draft | null {
    const key = cleanCategoryName(rawName).toLowerCase()
    const matches = byName.get(key)
    if (!matches?.length) return null
    if (matches.length === 1) return matches[0]
    // Ambiguous name (the export has one case-only duplicate). Prefer the term
    // whose parent is also listed on the same product, then the deepest term.
    const siblingKeys = new Set(siblings.map((s) => cleanCategoryName(s).toLowerCase()))
    const withParent = matches.find((m) => {
      const parent = m.parentId !== null ? drafts.get(m.parentId) : null
      return parent ? siblingKeys.has(parent.name.toLowerCase()) : false
    })
    return withParent ?? matches.sort((a, b) => b.level - a.level)[0]
  }

  // -- products -------------------------------------------------------------

  interface ProductDraft {
    id: number
    rawName: string
    row: SourceProductRow
    images: ProductImage[]
  }

  const productDrafts = new Map<number, ProductDraft>()
  let suppressed = 0
  for (const row of productRows) {
    const id = Number(row.product_id)
    if (!Number.isFinite(id)) continue
    // Withheld here rather than at render time, so every category count and
    // every universe total below is computed without them and stays truthful.
    if (SUPPRESSED_PRODUCTS.has(id)) {
      if (!productDrafts.has(id)) suppressed++
      continue
    }
    let draft = productDrafts.get(id)
    if (!draft) {
      draft = { id, rawName: row.product_name, row, images: [] }
      productDrafts.set(id, draft)
    }
    if (row.image_url) {
      const alt = normaliseTypography(decodeEntities(row.image_alt || row.product_name))
      if (!draft.images.some((img) => img.url === row.image_url)) {
        draft.images.push({ url: row.image_url, alt })
      }
    }
  }

  note(`unique products: ${productDrafts.size} (${suppressed} withheld, see constants/suppressed.ts)`)

  const usedProductSlugs = new Map<string, number>()
  const products: Product[] = []
  let unresolvedPrimary = 0
  let noCategory = 0
  let noImage = 0

  for (const draft of [...productDrafts.values()].sort((a, b) => a.id - b.id)) {
    const row = draft.row
    const name = cleanProductName(draft.rawName) || normaliseTypography(decodeEntities(draft.rawName))

    let slug = slugify(name)
    const collision = usedProductSlugs.get(slug)
    if (collision !== undefined) slug = `${slug}-${draft.id}`
    usedProductSlugs.set(slug, draft.id)

    const allNames = row.all_categories
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)

    const primary = resolveCategory(row.primary_category, allNames)
    if (!primary) unresolvedPrimary++

    const resolved: Draft[] = []
    for (const rawName of allNames) {
      const category = resolveCategory(rawName, allNames)
      if (category && !resolved.includes(category)) resolved.push(category)
    }
    const effectivePrimary = primary ?? resolved[0] ?? drafts.get(UNCLASSIFIED_ID)!
    if (effectivePrimary.id === UNCLASSIFIED_ID) noCategory++
    if (!resolved.includes(effectivePrimary)) resolved.unshift(effectivePrimary)

    // Fold each product into its own term and every ancestor, so a root page
    // can count its whole subtree without walking products again.
    for (const category of resolved) {
      category.productIds.add(draft.id)
      for (const ancestorId of category.ancestorIds) drafts.get(ancestorId)?.productIds.add(draft.id)
    }

    const price = Number(row.prix_actuel) || 0
    const listPrice = row.en_promo === 'oui' ? Number(row.prix_normal) || null : null
    const discountPct = row.reduction_pct ? Number(row.reduction_pct.replace('%', '')) || null : null

    if (!draft.images.length) noImage++

    products.push({
      id: draft.id,
      slug,
      name,
      rawName: normaliseTypography(decodeEntities(draft.rawName)),
      price,
      listPrice: listPrice && listPrice > price ? listPrice : null,
      discountPct: listPrice && listPrice > price ? discountPct : null,
      inStock: row.stock !== 'rupture',
      brand: detectBrand(row.all_categories, draft.rawName),
      primaryCategoryId: effectivePrimary.id,
      categoryIds: resolved.map((c) => c.id),
      images: draft.images,
      addedAt: draft.images.length ? uploadMonth(draft.images[0].url) : null,
      sourceUrl: row.product_url,
      specs: extractSpecs(name),
    })
  }

  note(`products kept: ${products.length}`)
  note(`  primary category unresolvable (fell back to first listed): ${unresolvedPrimary}`)
  note(`  filed under the hidden "Non classé" bucket: ${noCategory}`)
  note(`  no photography: ${noImage}`)
  note(`  brand detected: ${products.filter((p) => p.brand).length} (${Math.round((products.filter((p) => p.brand).length / products.length) * 100)}%)`)
  note(`  specs extracted: ${products.filter((p) => p.specs.length).length}`)

  // -- assemble -------------------------------------------------------------

  const categories: Category[] = [...drafts.values()]
    .map((draft) => ({
      id: draft.id,
      name: draft.name,
      slug: draft.slug,
      parentId: draft.parentId,
      level: draft.level,
      ancestorIds: draft.ancestorIds,
      childIds: draft.childIds.sort(
        (a, b) => (drafts.get(b)?.productIds.size ?? 0) - (drafts.get(a)?.productIds.size ?? 0),
      ),
      directCount: draft.directCount,
      totalCount: draft.productIds.size,
      universeId: draft.universeId,
      ...(draft.hidden ? { hidden: true as const } : {}),
    }))
    .sort((a, b) => a.id - b.id)

  // Counted on the primary category only. Unioning every category in a
  // department double-counts: the "Réseaux et Télecommunication" root contains
  // Téléphonie's products, but Téléphonie is its own department. One product,
  // one department, so the twelve counts sum to the catalogue.
  const universeOfCategory = new Map(categories.map((c) => [c.id, c.universeId]))
  const universeTally = new Map<UniverseId, number>()
  for (const product of products) {
    const id = universeOfCategory.get(product.primaryCategoryId)
    if (id) universeTally.set(id, (universeTally.get(id) ?? 0) + 1)
  }
  const universes: Universe[] = UNIVERSE_DEFINITIONS.map((definition) => ({
    ...definition,
    totalCount: universeTally.get(definition.id) ?? 0,
  })).sort((a, b) => b.totalCount - a.totalCount)

  const brandTally = new Map<string, { count: number; universes: Map<UniverseId, number> }>()
  for (const product of products) {
    if (!product.brand) continue
    const entry = brandTally.get(product.brand) ?? { count: 0, universes: new Map() }
    entry.count++
    const universeId = universeOfCategory.get(product.primaryCategoryId)
    if (universeId) entry.universes.set(universeId, (entry.universes.get(universeId) ?? 0) + 1)
    brandTally.set(product.brand, entry)
  }

  const brands: Brand[] = [...brandTally.entries()]
    .map(([name, entry]) => ({
      name,
      slug: slugify(name),
      productCount: entry.count,
      universeIds: [...entry.universes.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id),
    }))
    .sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name))

  note(`categories: ${categories.length}, universes: ${universes.length}, brands: ${brands.length}`)
  for (const universe of universes) note(`  ${universe.name.padEnd(30)} ${universe.totalCount}`)

  return {
    products,
    categories,
    universes,
    brands,
    meta: {
      generatedAt: new Date().toISOString(),
      productCount: products.length,
      categoryCount: categories.length,
      currency: 'XAF',
      newestProductId: Math.max(...products.map((p) => p.id)),
    },
  }
}

const catalog = build()
mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(join(OUT_DIR, 'catalog.json'), JSON.stringify(catalog))
writeFileSync(join(OUT_DIR, 'build-report.txt'), report.join('\n') + '\n')
note(`written to ${OUT_DIR}/catalog.json`)
