/**
 * The business facts, in one place.
 *
 * Every one of these is read off the live nowtechcenter.com pages, not
 * invented. They appear in the footer, the service strip, the product page and
 * the checkout, so they live here rather than being retyped in each component.
 */

export const SITE = {
  name: 'NowTech Center',
  shortName: 'NowTech',
  /** The storefront is French-first: the market is Cameroon and the catalog is French. */
  locale: 'fr-FR',
  currency: 'XAF',
} as const

export interface Showroom {
  readonly city: string
  readonly district: string
  /** Landmark directions are how addresses actually work here. */
  readonly directions: string
}

export const SHOWROOMS: readonly Showroom[] = [
  { city: 'Douala', district: 'Akwa', directions: 'Rue Drouot, à côté de la Pharmacie des hôpitaux' },
  { city: 'Douala', district: 'Bonapriso', directions: 'Face au marché des fleurs' },
  { city: 'Yaoundé', district: 'Centre-ville', directions: 'Avenue Kennedy' },
]

/**
 * The three counters on one line.
 *
 * Shared, because the utility strip and the service band were each formatting
 * their own version of the same fact and had drifted: one said "Akwa,
 * Bonapriso, Centre-ville" and the other "Akwa, Bonapriso, Yaoundé", eighty
 * pixels apart on the same screen. A reader cannot tell whether that is two
 * shops or one shop described twice.
 */
export const PICKUP_LINE = 'Akwa, Bonapriso, Yaoundé'

export const PHONES: readonly string[] = ['+237 695 54 90 58', '+237 673 55 05 51']

/** `tel:` and `wa.me` both want the number with no spaces and no plus. */
export function dialable(phone: string): string {
  return phone.replace(/[^\d]/g, '')
}

/**
 * WhatsApp is not a nice-to-have here.
 *
 * It is how a Cameroonian buyer sends a photograph of the broken part, asks
 * whether the reference is really in stock, and receives the proforma. Treating
 * it as a secondary channel behind an email form would be reading this market
 * through a European one.
 */
export const WHATSAPP = PHONES[0]

/**
 * Named on the page rather than drawn as card marks. Two of the four are mobile
 * money wallets with no payment-network artwork we hold a licence for, and a row
 * of Visa and Mastercard logos would misstate what this shop actually accepts.
 */
export const PAYMENT_METHODS: readonly string[] = [
  'Espèces au retrait',
  'Espèces à la livraison',
  'MTN Mobile Money',
  'Orange Money',
  'Virement bancaire',
]

/**
 * Delivery is a browse-time constraint, not a checkout detail: home delivery
 * and pickup points exist in Douala and Yaoundé only. Everywhere else ships by
 * intercity travel agency, which changes the lead time and the payment options.
 */
export const DELIVERY_CITIES: readonly string[] = ['Douala', 'Yaoundé']

export const SERVICE_POINTS = [
  { title: 'Retrait le jour même', detail: PICKUP_LINE },
  { title: 'Livraison 24 à 48 h', detail: 'Douala et Yaoundé, agence de voyage ailleurs' },
  { title: 'Paiement à la livraison', detail: 'Espèces, MTN Mobile Money, Orange Money' },
  { title: 'Garantie constructeur', detail: 'De 1 à 24 mois selon le produit' },
] as const

export const VAT_RATE = 0.1925
