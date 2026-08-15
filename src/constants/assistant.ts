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
 * The panel prints it as the answer's own label, which is the cheapest possible
 * form of honesty: a reader who asked for a price and sees `Recherche` knows
 * immediately that the question was not understood, and does not have to read
 * four product rows to find that out.
 */
export type AssistantIntent =
  | 'accueil'
  | 'capacites'
  | 'comptoir'
  | 'comparaison'
  | 'famille'
  | 'infos'
  | 'marque'
  | 'panier'
  | 'prix'
  | 'recherche'
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
  readonly marque?: string
  readonly famille?: string
  readonly rayon?: string
  readonly min?: number
  readonly max?: number
  readonly stock?: boolean
}

export interface AssistantReply {
  readonly intent: AssistantIntent
  readonly text: string
  readonly figures?: readonly AssistantFigure[]
  readonly products?: readonly AssistantProduct[]
  readonly families?: readonly AssistantLink[]
  readonly links?: readonly AssistantLink[]
  readonly compare?: AssistantCompare
  /** Follow-ups computed from THIS answer, and answerable with THIS scope. */
  readonly next?: readonly string[]
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
    cues: ['tva', 'taxe', 'ht', 'ttc', 'remise', 'reduction', 'negocier', 'normalisee'],
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
  'compare et je filtre par budget. Je n’invente rien : ce que je ne sais pas ' +
  'part au comptoir sur WhatsApp, avec votre question déjà écrite.'

/**
 * What Bod can do, in the reader's own terms.
 *
 * Shown before the first question and again on demand. Each line is a real
 * capability with a real example, and there is nothing here that the catalogue
 * or `site.ts` cannot answer.
 */
export interface Capability {
  readonly title: string
  readonly example: string
}

export const CAPABILITIES: readonly Capability[] = [
  { title: 'Chercher et compter', example: 'onduleur 1500 VA' },
  { title: 'Filtrer par budget', example: 'caméra à moins de 50 000' },
  { title: 'Comparer deux références', example: 'différence entre Tenda CP7 et Hikvision DS-2CD' },
  { title: 'Dire ce qui est au comptoir', example: 'switch 24 ports en stock' },
  { title: 'Compter une marque', example: 'vous avez du Mikrotik' },
  { title: 'Trouver le comptoir le plus proche', example: 'je suis à Bonapriso' },
  { title: 'Reprendre votre panier', example: 'que vaut mon panier' },
]

export const FALLBACK =
  'Je ne sais pas répondre à celle-là, et je préfère le dire plutôt que ' +
  'd’inventer. Le comptoir répond sur WhatsApp, avec la question déjà écrite.'

/** A dropped connection is not the customer's problem to diagnose. */
export const OFFLINE =
  'La connexion au catalogue n’a pas répondu. Réessayez, ou passez directement ' +
  'par le comptoir sur WhatsApp.'
