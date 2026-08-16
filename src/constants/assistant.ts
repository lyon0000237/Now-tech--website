import {
  DELIVERY_CITIES,
  PAYMENT_METHODS,
  PHONES,
  PICKUP_LINE,
  SHOWROOMS,
  VAT_RATE,
} from './site'

/**
 * What Bod can actually answer, and the wire it answers on.
 *
 * IT IS NOT A LANGUAGE MODEL AND IT DOES NOT PRETEND TO BE ONE. There is no
 * model behind this, no key, no order system, no stock level beyond a boolean,
 * and no account. What there is: 4 254 references with prices, brands, families
 * and parsed specifications, and the shop's real operating facts. Everything Bod
 * says is either counted out of that export or written down here, and the panel
 * labels which of the two it was.
 *
 * That limit is the design, not a shortcoming to be hidden. A widget that
 * improvises a delivery time it cannot know is worse than no widget, because a
 * customer in Douala will plan their day around it.
 *
 * WHY THIS FILE HOLDS THE WIRE TYPES. The panel is a client component and the
 * catalogue is `server-only`; the reply shape is the one thing both sides must
 * agree on. Declaring it here rather than in the route means the client never
 * imports from a server module at all, not even for a type, so the 3.3 MB
 * dataset can never be pulled into the browser bundle by a refactor that turns
 * an `import type` into an `import`.
 *
 * EVERY WRITTEN ANSWER BELOW IS BUILT FROM `site.ts`. Not one is retyped, so a
 * telephone number or a payment method cannot drift between the footer, the
 * product page and this panel.
 */

/* -------------------------------------------------------------------------- */
/* The wire                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * What Bod decided the question was.
 *
 * The panel prints it beside the datum rule, which is the cheapest possible
 * form of honesty: a reader who asked for a price and sees `Recherche` knows
 * immediately that the question was not understood, and does not have to read
 * four product rows to find that out.
 */
export type AssistantIntent =
  | 'accueil'
  | 'budget'
  | 'capacites'
  | 'comptoir'
  | 'comparaison'
  | 'famille'
  | 'infos'
  | 'marque'
  | 'panier'
  | 'prix'
  | 'recherche'
  | 'reference'
  | 'remise'
  | 'stock'
  | 'main'

/** The subset of a product a row in the panel renders. Client-safe by construction. */
export interface AssistantProduct {
  readonly slug: string
  readonly name: string
  readonly price: number
  readonly inStock: boolean
  readonly image: string | null
  readonly brand: string | null
  readonly categoryName: string
  /** At most three facts parsed at ingestion, e.g. `["16 Go RAM", "512 Go SSD"]`. */
  readonly specs: readonly string[]
}

/**
 * One measured fact, set in tabular figures.
 *
 * Figures are the whole point of this assistant. A sentence saying "nous en
 * avons plusieurs" is worth nothing next to `23 références · 45 000 à 195 000`,
 * and the second one is free because the scan that found the products already
 * knew it.
 *
 * THE UNIT BELONGS IN THE LABEL, NOT IN THE VALUE. Measured at 390 the strip
 * printed `7 500 à 200 000 FCFA` in a 110-pixel column and broke it over three
 * lines while the column beside it held the two characters `87`. The currency
 * moved into the label, the strip went to two columns on a phone, and the same
 * fact now sits on one line.
 */
export interface AssistantFigure {
  readonly label: string
  readonly value: string
  /**
   * A fact that is a sentence rather than a number: a counter's directions, an
   * address. It takes the full width and is set in the page's own face, because
   * tabular figures on a street name is a costume rather than a measurement.
   */
  readonly wide?: boolean
}

/** Where the answer continues. `count` is printed when the destination is a list. */
export interface AssistantLink {
  readonly href: string
  readonly label: string
  readonly count?: number
}

/**
 * A question Bod offers to ask himself next, carrying the query that answers it.
 *
 * THIS REPLACED A LIST OF SENTENCES AND THE DIFFERENCE IS CORRECTNESS, NOT
 * CONVENIENCE. A follow-up used to be a string that got re-typed into the field
 * and re-parsed, so a chip reading "En HIKVISION" produced a search for the word
 * "hikvision" across the whole shop, which is 544 references, while the tally it
 * was printed beside said 99. Two numbers a customer can see, four pixels apart,
 * disagreeing. A follow-up now carries the exact scope it was counted with, so
 * the count on the chip and the count in the answer are the same arithmetic.
 *
 * `scope` REPLACES the carried scope rather than merging into it. A band of the
 * price ladder has to be able to lift the ceiling the previous answer set, and a
 * merge can add a bound but never remove one.
 */
export interface AssistantFollow {
  /** What the button says. */
  readonly label: string
  /** What the docket records as the question. */
  readonly ask: string
  readonly scope?: AssistantScope
}

/**
 * One rung of the price ladder.
 *
 * `share` is the band's part of the counted set, drawn as a hairline of that
 * width in the mark's own green. NEVER as a filled track with a bar on top:
 * that is dashboard furniture, and this panel has one green and hairlines.
 */
export interface AssistantBand {
  readonly label: string
  readonly count: number
  /** 0 to 1. */
  readonly share: number
  readonly follow: AssistantFollow
}

/** A counted facet of the answer: a brand inside the set, with the query that isolates it. */
export interface AssistantTally {
  readonly label: string
  readonly count: number
  readonly follow: AssistantFollow
}

/** One side of a comparison. */
export interface AssistantColumn {
  readonly slug: string
  readonly name: string
  readonly price: number
  readonly inStock: boolean
  readonly brand: string | null
  readonly categoryName: string
  readonly specs: readonly string[]
}

export interface AssistantCompare {
  readonly left: AssistantColumn
  readonly right: AssistantColumn
  /** The one difference that is arithmetic rather than opinion. */
  readonly gap: string
}

/**
 * One line of the reader's own basket, re-read against today's catalogue.
 *
 * THE BASKET IS THE ONE THING THE BROWSER KNOWS AND THE SERVER DOES NOT, and it
 * is also the one thing in this session that goes stale. `lib/cart.tsx` stores a
 * slug, a name, a price and a quantity in `localStorage` and joins them against
 * the catalogue only at render time, so a basket left open for a week carries
 * the price it was added at. That is the right trade for a shop that reprices at
 * the counter, and it is exactly why someone about to ask for a proforma needs
 * the two figures side by side: what they were quoted in their own browser, and
 * what the shelf says today.
 *
 * `was` IS ONLY EVER PRINTED WHEN IT DIFFERS. A second price beside every line
 * of an unchanged basket is noise that teaches the reader to stop looking.
 */
export interface AssistantBasketLine {
  readonly slug: string
  readonly name: string
  readonly qty: number
  /** The catalogue's price today. `null` when the reference has left the shop. */
  readonly price: number | null
  /** What this browser stored when the line was added. */
  readonly was: number
  readonly inStock: boolean
}

export interface AssistantBasket {
  readonly lines: readonly AssistantBasketLine[]
  /** Priced at TODAY's figures, and the sentence says so. */
  readonly total: number
  readonly count: number
  /** Lines whose price has moved since they were added here. */
  readonly moved: number
  /** Lines the catalogue no longer carries. */
  readonly gone: number
  /** Lines that are not at the counter today. */
  readonly ordered: number
}

/**
 * The resolved query, carried between turns.
 *
 * THIS IS THE WHOLE OF BOD'S MEMORY, AND IT IS DELIBERATELY THIN. It is not a
 * transcript and it is not sent to anything: the panel keeps the last answer's
 * scope and posts it back with the next question, so "et en stock" and "les
 * moins chers" mean something. Nothing is stored, nothing leaves the session,
 * and every field is a filter the catalogue already understands, which is what
 * lets the follow-up produce a URL the reader could have typed themselves.
 */
export interface AssistantScope {
  /** The words that were actually searched, cues and amounts removed. */
  readonly q?: string
  /** A brand name as the export spells it. Set by the brand tally, never guessed. */
  readonly marque?: string
  readonly min?: number
  readonly max?: number
  readonly stock?: boolean
  /** Only the references genuinely marked down 40 % or more. */
  readonly remise?: boolean
}

export interface AssistantReply {
  readonly intent: AssistantIntent
  readonly text: string
  readonly figures?: readonly AssistantFigure[]
  readonly products?: readonly AssistantProduct[]
  readonly families?: readonly AssistantLink[]
  readonly links?: readonly AssistantLink[]
  readonly compare?: AssistantCompare
  /** The reader's own basket, re-read against today's catalogue. */
  readonly basket?: AssistantBasket
  /** How the counted set spreads across price. Offered on a broad answer only. */
  readonly bands?: readonly AssistantBand[]
  /** Which manufacturers the counted set is made of. */
  readonly tallies?: readonly AssistantTally[]
  /** Follow-ups computed from THIS answer, and answerable with THEIR scope. */
  readonly next?: readonly AssistantFollow[]
  readonly scope?: AssistantScope
  /** The honest "I do not know". The panel answers it with WhatsApp. */
  readonly handoff?: boolean
}

/* -------------------------------------------------------------------------- */
/* The written answers                                                        */
/* -------------------------------------------------------------------------- */

export interface Topic {
  readonly id: string
  readonly label: string
  /**
   * Whole words that route a typed question here. Whole words, not fragments:
   * a two-letter cue matched inside longer words hijacked questions it had
   * nothing to do with.
   */
  readonly cues: readonly string[]
  readonly answer: string
  readonly link?: { readonly href: string; readonly label: string }
}

export const TOPICS: readonly Topic[] = [
  {
    id: 'livraison',
    label: 'Livraison',
    cues: ['livraison', 'livrer', 'livrez', 'livre', 'delai', 'delais', 'expedition', 'envoyer', 'transport'],
    answer:
      `Livraison en 24 à 48 h à ${DELIVERY_CITIES.join(' et ')}. Ailleurs au Cameroun, ` +
      'nous expédions par agence de voyage, et le délai dépend de la ligne. ' +
      'Le paiement à la livraison est possible.',
  },
  {
    id: 'retrait',
    label: 'Retrait et adresses',
    // THE CITY NAMES HAVE LEFT THIS LIST ON PURPOSE. They now route to the
    // counter answer below, which reads the reader's own city and names the two
    // shops in Douala or the one in Yaoundé rather than reciting all three. A
    // question that names a place deserves the place, not the directory.
    cues: ['retrait', 'retirer', 'magasin', 'boutique', 'adresse', 'comptoir', 'showroom'],
    answer:
      `Retrait le jour même à ${PICKUP_LINE}. ` +
      SHOWROOMS.map((shop) => `${shop.district} (${shop.city}) : ${shop.directions}`).join('. ') +
      '.',
    link: { href: '/contact', label: 'Voir les trois comptoirs' },
  },
  {
    id: 'paiement',
    label: 'Paiement',
    // Conjugated forms are listed, not stemmed. A stemmer for French is a
    // dependency and a class of surprises; the six ways a customer writes
    // "payer" are a list six long.
    cues: [
      'paiement', 'payer', 'paie', 'paye', 'payes', 'payez', 'regler', 'reglement',
      'mobile', 'money', 'momo', 'orange', 'mtn', 'virement', 'especes', 'cash',
    ],
    answer: `Nous acceptons : ${PAYMENT_METHODS.join(', ')}.`,
  },
  {
    id: 'garantie',
    label: 'Garantie',
    cues: ['garantie', 'garanti', 'garantis', 'panne', 'retour', 'sav', 'reparation', 'reparer', 'echange', 'defectueux'],
    answer:
      'Garantie constructeur de 1 à 24 mois selon le produit, indiquée sur la facture. ' +
      'En cas de panne, revenez au comptoir avec la facture : le diagnostic est fait sur place.',
  },
  {
    id: 'devis',
    label: 'Devis entreprise',
    cues: ['devis', 'proforma', 'facture', 'entreprise', 'appel', 'offre', 'marche', 'projet'],
    answer:
      'Pour un projet ou un appel d’offres, constituez votre liste de matériel et nous ' +
      'renvoyons une facture proforma. Les prix du catalogue sont dégressifs à la quantité.',
    link: { href: '/devis', label: 'Ouvrir un devis' },
  },
  {
    id: 'installation',
    label: 'Installation',
    cues: ['installation', 'installer', 'pose', 'configuration', 'technicien', 'maintenance'],
    answer:
      'L’atelier installe et configure ce qu’il vend : vidéosurveillance, réseau, ' +
      'contrôle d’accès, onduleurs et solaire. La prestation se chiffre après un ' +
      'relevé sur site.',
    link: { href: '/services', label: 'Ce que fait l’atelier' },
  },
  {
    id: 'tva',
    label: 'Prix et TVA',
    cues: ['tva', 'taxe', 'ht', 'ttc', 'negocier', 'normalisee'],
    answer:
      `Les prix affichés sont en FCFA, TVA de ${(VAT_RATE * 100).toLocaleString('fr-FR')} % ` +
      'comprise. Une facture normalisée est délivrée sur demande.',
  },
  {
    id: 'contact',
    label: 'Parler à quelqu’un',
    cues: ['telephone', 'appeler', 'numero', 'whatsapp', 'contact', 'joindre', 'humain', 'quelqu'],
    answer: `Appelez le comptoir : ${PHONES.join(' ou ')}. WhatsApp répond aux mêmes numéros.`,
    link: { href: '/contact', label: 'Nous joindre' },
  },
]

/* -------------------------------------------------------------------------- */
/* The counters, by the reader's own city                                     */
/* -------------------------------------------------------------------------- */

/**
 * Which counter answers a place name.
 *
 * The three showrooms are two cities, and the useful answer to "je suis à
 * Bonapriso" is the shop four streets away, not a list of three including one
 * in another city three hours up the road. Districts route to their own shop,
 * cities route to all of theirs, and any other Cameroonian town listed here
 * routes to the delivery answer, because that is the true one: there is no
 * counter there.
 *
 * The towns below are the country's largest and the ones the shop actually
 * ships to by agency. A place not on the list is not guessed at, it goes to the
 * counter on WhatsApp.
 */
export interface CounterMatch {
  readonly city: string
  readonly cues: readonly string[]
}

export const COUNTER_CITIES: readonly CounterMatch[] = [
  { city: 'Douala', cues: ['douala', 'akwa', 'bonapriso', 'bonaberi', 'deido', 'bepanda', 'makepe', 'ndokoti', 'bonamoussadi'] },
  { city: 'Yaoundé', cues: ['yaounde', 'yde', 'mvog', 'bastos', 'nlongkak', 'mvan', 'essos', 'nsimeyong'] },
]

/** Towns with no counter. Named so the answer can be the shipping one, not a shrug. */
export const SHIPPED_CITIES: readonly string[] = [
  'bafoussam', 'bamenda', 'garoua', 'maroua', 'ngaoundere', 'bertoua', 'kribi',
  'limbe', 'buea', 'edea', 'kumba', 'dschang', 'ebolowa', 'sangmelima', 'foumban',
  'nkongsamba', 'tiko', 'mbalmayo', 'bafang', 'banyo', 'meiganga', 'kousseri',
]

/* -------------------------------------------------------------------------- */
/* The vocabulary that routes a question                                      */
/* -------------------------------------------------------------------------- */

/** "combien coûte", "quel est le prix de", "tarif". */
export const PRICE_CUES: readonly string[] = [
  'coute', 'coutent', 'couter', 'prix', 'tarif', 'tarifs', 'cout', 'combien', 'chere', 'cher',
]

/** "c'est en stock", "vous avez", "disponible". */
export const STOCK_CUES: readonly string[] = [
  'stock', 'disponible', 'disponibles', 'dispo', 'disponibilite', 'immediat', 'immediate',
]

/**
 * "compare X et Y", "différence entre X et Y", "X vs Y".
 *
 * `entre` is deliberately NOT here even though a comparison is often phrased
 * with it: it is the budget word too, and "switch entre 100 000 et 300 000" was
 * being read as a comparison of two amounts. `mieux` and `plutot` are out for a
 * different reason, which is that Bod has no reviews and no sales figures, so
 * "lequel est mieux" is a question he must hand to a human rather than answer
 * from a price.
 */
export const COMPARE_CUES: readonly string[] = [
  'compare', 'comparer', 'comparez', 'comparaison', 'difference', 'differences',
  'differencie', 'versus', 'vs',
]

/** The basket, which is the one thing the browser knows and the server does not. */
export const CART_CUES: readonly string[] = [
  'panier', 'paniers', 'selection', 'liste',
]

/** "bonjour", and the seven other ways a counter is greeted here. */
export const GREETING_CUES: readonly string[] = [
  'bonjour', 'bonsoir', 'salut', 'hello', 'coucou', 'bjr', 'slt', 'hi', 'bonne',
]

/** "tu sais faire quoi", "aide". */
export const HELP_CUES: readonly string[] = [
  'aide', 'aider', 'sais', 'savez', 'peux', 'pouvez', 'capable', 'fonctionne', 'utiliser', 'quoi',
]

/**
 * The 513 references genuinely marked down 40 % or more.
 *
 * The same floor the catalogue's own `remise` facet uses and the same set the
 * homepage files under "Affaires", because a discount that means one thing in
 * this panel and another on `/catalogue?remise=1` is worse than no discount
 * answer at all. Nothing here invents a sale: `discountPct` is the difference
 * between the supplier's list price and the shelf price, exported as it stands.
 */
export const PROMO_CUES: readonly string[] = [
  'promo', 'promos', 'promotion', 'promotions', 'remise', 'remises', 'solde',
  'soldes', 'reduction', 'reductions', 'destockage', 'braderie', 'affaire', 'affaires',
]

/**
 * A reference number, which is the one identifier a customer arrives holding.
 *
 * The product page prints `Réf.` and the counter reads it back over the
 * telephone, so someone with a proforma in hand has a number and no words. It
 * is the WooCommerce post id, it is unique, and looking it up is exact: there
 * is no ranking, no near miss and no guessing involved.
 */
export const REFERENCE_CUES: readonly string[] = [
  'reference', 'references', 'ref', 'refs', 'article', 'code', 'numero', 'no',
]

/** "quelles marques", "quel fabricant". Answered with a counted breakdown of the set. */
export const BRAND_QUESTION_CUES: readonly string[] = [
  'marque', 'marques', 'fabricant', 'fabricants', 'constructeur', 'constructeurs', 'fabrique',
]

/**
 * A count of units, and only when the reader said it was one.
 *
 * "il me faut 12 caméras" is a quantity. "switch 24 ports" is a specification,
 * and reading it as a quantity would be as wrong as reading it as a price. So a
 * bare small integer becomes a quantity only when one of these words is
 * somewhere in the question, and the answer always repeats the count it used.
 */
export const QUANTITY_CUES: readonly string[] = [
  'faut', 'besoin', 'unites', 'unite', 'pieces', 'piece', 'postes', 'poste',
  'exemplaires', 'lot', 'lots', 'quantite', 'commander', 'commande', 'equiper', 'installer',
]

/**
 * A number is a budget only when one of these stands in front of it, and that
 * rule is not a nicety.
 *
 * "Onduleur 1500 VA" carries a number that is a specification, and reading it as
 * a price ceiling would silently return every onduleur under 1 500 FCFA, which
 * is none of them. So an amount is only ever a bound when the reader said it was
 * one, and the answer always repeats the bound it used so the reading can be
 * checked at a glance.
 */
export const CEILING_CUES: readonly string[] = [
  'moins', 'sous', 'max', 'maxi', 'maximum', 'budget', 'jusqu', 'inferieur', 'dessous', 'petit',
]

export const FLOOR_CUES: readonly string[] = [
  'plus', 'partir', 'min', 'mini', 'minimum', 'superieur', 'dessus', 'depuis',
]

/** Written after an amount, and never a search term: "200 000 FCFA", "300000 F". */
export const CURRENCY_WORDS: readonly string[] = ['fcfa', 'cfa', 'xaf', 'f', 'francs', 'franc']

/* -------------------------------------------------------------------------- */
/* What Bod says about itself                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The first thing Bod says.
 *
 * It states the limit in the first sentence, because a widget shaped like a chat
 * that has not told you what it can do will be asked things it cannot answer and
 * will look broken for refusing.
 */
export const OPENING =
  'Je lis le catalogue du magasin et les conditions de la maison. Je compte, je ' +
  'compare, je filtre par budget, je retrouve une référence par son numéro et je ' +
  'relis votre panier au prix d’aujourd’hui. Je n’invente rien : ce que je ne ' +
  'sais pas part au comptoir sur WhatsApp, avec votre question déjà écrite.'

/**
 * What Bod can do, in the reader's own terms.
 *
 * THE PANEL PREFERS THE SERVER'S VERSION OF THIS LIST. `mode=ouverture` builds
 * the same seven rows out of the live export, so the reference number in the
 * example is a reference that exists today and the brand named is one the shop
 * actually holds. This copy is the fallback for a first open with no network,
 * which is why its examples name nothing that could go out of stock.
 */
export interface Capability {
  readonly title: string
  readonly example: string
}

export const CAPABILITIES: readonly Capability[] = [
  { title: 'Chercher et compter', example: 'onduleur 1500 VA' },
  { title: 'Filtrer par budget', example: 'caméra à moins de 50 000' },
  { title: 'Répartir un budget par rayon', example: 'j’ai 500 000 francs' },
  { title: 'Voir la répartition des prix', example: 'quel budget pour une caméra' },
  { title: 'Comparer deux références', example: 'différence entre Tenda CP7 et Hikvision DS-2CD' },
  { title: 'Lister les marques d’un rayon', example: 'quelles marques de switch' },
  { title: 'Relire le panier au prix du jour', example: 'relis mon panier' },
  { title: 'Trouver le comptoir le plus proche', example: 'je suis à Bonapriso' },
]

export const FALLBACK =
  'Je ne sais pas répondre à celle-là, et je préfère le dire plutôt que ' +
  'd’inventer. Le comptoir répond sur WhatsApp, avec la question déjà écrite.'

/** A dropped connection is not the customer's problem to diagnose. */
export const OFFLINE =
  'La connexion au catalogue n’a pas répondu. Réessayez, ou passez directement ' +
  'par le comptoir sur WhatsApp.'
