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

export const PHONES: readonly string[] = ['+237 695 54 90 58', '+237 673 55 05 51']

/**
 * Delivery is a browse-time constraint, not a checkout detail: home delivery
 * and pickup points exist in Douala and Yaoundé only. Everywhere else ships by
 * intercity travel agency, which changes the lead time and the payment options.
 */
export const DELIVERY_CITIES: readonly string[] = ['Douala', 'Yaoundé']

export const SERVICE_POINTS = [
  { title: 'Retrait le jour même', detail: 'Akwa, Bonapriso, Yaoundé' },
  { title: 'Livraison 24 à 48 h', detail: 'Douala et Yaoundé, agence de voyage ailleurs' },
  { title: 'Paiement à la livraison', detail: 'Espèces, MTN Mobile Money, Orange Money' },
  { title: 'Garantie constructeur', detail: 'De 1 à 24 mois selon le produit' },
] as const

export const VAT_RATE = 0.1925
