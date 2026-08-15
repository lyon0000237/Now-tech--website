/**
 * The workshop's trades, and the rule that files its own records under them.
 *
 * WHY THIS FILE EXISTS. `/services` used to print one flat price list read
 * straight off a WooCommerce term, and a reader who arrived asking "what do you
 * know how to do" was handed nineteen rows sorted by price. Nineteen rows is a
 * catalogue. Five trades is an answer. Nothing here adds a prestation, a rate
 * or a lead time: a trade is a HEADING OVER RECORDS THAT ALREADY EXIST, and if
 * no record matches, the heading is not drawn.
 *
 * THE ORDER OF THE FIRST FOUR IS NOT A PREFERENCE. `constants/assistant.ts`
 * already answers the installation question with one sentence, "vidéosurveillance,
 * réseau, contrôle d'accès, onduleurs et solaire", and that sentence is the only
 * public claim this shop makes about its own workshop. The four headings below
 * are that sentence, split. The fifth exists because the supplier filed
 * accounting, customs, joinery, graphic design and car mechanics under the same
 * term, and hiding them would be editing the shop rather than describing it.
 *
 * MATCHED ON A FOLDED NAME, NEVER ON A HAND-PICKED LIST OF IDS. The export
 * spells the same word three ways inside nineteen rows: `Controle d'accès` with
 * no circumflex, `Energie solaire` and `d'energie solaire` with no acute,
 * `INSTALLATION ELECTRIQUE` in capitals beside `installation du kit`. An id list
 * would be right today and silently wrong at the next rebuild; a fold to
 * lowercase unaccented text is right in both.
 */

export interface Trade {
  readonly id: string
  /** The heading a reader sees. Describes the records under it, never more. */
  readonly label: string
  /**
   * Tested against {@link fold}ed names, so every pattern here is lowercase and
   * unaccented on purpose. FIRST MATCH WINS, so the order below is the rule.
   */
  readonly match: RegExp
}

export const TRADES: readonly Trade[] = [
  {
    id: 'surveillance',
    label: 'Vidéosurveillance et contrôle d’accès',
    // `incendie` and `interphone` sit here rather than in their own headings:
    // one record each, and a heading over a single line is a bullet with a
    // title. They are the same trade to the same technician on the same wall.
    match: /camera|surveillance|pointeuse|biometrique|controle d.acces|incendie|interphone/,
  },
  {
    id: 'reseau',
    label: 'Réseau, téléphonie IP et internet',
    // `securite informatique` is a network job in these records, not a camera
    // job: the line reads "solutions de sécurité informatique". Tested before
    // the bare `informatique` of the next entry for that reason.
    match: /reseau|telephonie|internet|antenne|vsat|nanostation|powerbeam|securite informatique/,
  },
  {
    id: 'energie',
    label: 'Énergie solaire, backup et électricité',
    // `electr` and not `electri`: the shoutiest line in the term is
    // "INSTALLATION ELECTRIQUE ET ÉLECTROTECHNIQUE", and the second word folds
    // to `electrotechnique`.
    match: /energie|solaire|onduleur|electr/,
  },
  {
    id: 'informatique',
    label: 'Parc informatique et maintenance',
    match: /maintenance|infogerance|telemaintenance|laptop|desktop/,
  },
  {
    id: 'autres',
    label: 'Au-delà de l’informatique',
    // The catch-all, and it must stay last. Accounting, customs and joinery
    // have no keyword in common; what they have in common is that the shop
    // sells them and this site never said so.
    match: /./,
  },
]

/**
 * Lowercase, unaccented, single-spaced. The one shape every pattern above is
 * written against.
 */
export function fold(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * A record is a prestation when ITS OWN NAME OPENS BY NAMING ONE.
 *
 * Anchored at the start, and that anchor is the whole test. `kit GPS +
 * installation` and `Kit GPS Vehicule + Installation` both carry the word
 * installation and are both a box with a cable in it; a loose test sells a
 * carton as a technician's morning. Read against a folded name, so `Énergie`,
 * `energie` and `ENERGIE` are one word.
 */
const PRESTATION = /^(services?|installations?|maintenance|menuiserie|douane|energie)\b/

export function isPrestation(name: string): boolean {
  return PRESTATION.test(fold(name))
}

export function tradeOf(name: string): Trade {
  const folded = fold(name)
  return TRADES.find((trade) => trade.match.test(folded)) ?? TRADES[TRADES.length - 1]
}

/**
 * The record's name, with the supplier's en dashes turned into hyphens.
 *
 * One line in this term reads `Installation Antenne – Vsat Nanostation`. The
 * house rule on this storefront is that no em or en dash reaches a reader, and
 * a rule that holds for text we write and breaks for text we print is not a
 * rule. The hyphen says the same thing and is the mark the rest of that same
 * name already uses.
 */
export function readable(name: string): string {
  return name.replace(/[–—]/g, '-').trim()
}
