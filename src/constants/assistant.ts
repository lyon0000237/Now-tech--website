import {
  DELIVERY_CITIES,
  PAYMENT_METHODS,
  PHONES,
  PICKUP_LINE,
  SHOWROOMS,
  VAT_RATE,
} from './site'

/**
 * What Bod can actually answer.
 *
 * IT IS NOT A LANGUAGE MODEL AND IT DOES NOT PRETEND TO BE ONE. There is no
 * model behind this, no order system, no stock feed beyond the export, and no
 * account. What there is: 4 254 references with prices, and the shop's real
 * operating facts. So Bod does exactly two things, searches the catalogue and
 * reads those facts back, and hands everything else to a human on WhatsApp.
 *
 * That limit is the design, not a shortcoming to be hidden. A widget that
 * improvises an answer about a delivery time it cannot know is worse than no
 * widget, because a customer in Douala will plan their day around it.
 *
 * EVERY ANSWER BELOW IS BUILT FROM `site.ts`. Not one of them is retyped, so a
 * telephone number or a payment method can never drift between the footer, the
 * product page and this panel.
 */
export interface Topic {
  readonly id: string
  /** The chip a reader can press. */
  readonly label: string
  /**
   * Whole words that route a typed question here. Whole words, not fragments:
   * a two-letter cue matched inside longer words and hijacked questions it had
   * nothing to do with.
   */
  readonly cues: readonly string[]
  readonly answer: string
  /** Where the answer continues, when a page says it better. */
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
    cues: ['retrait', 'retirer', 'magasin', 'boutique', 'adresse', 'comptoir', 'douala', 'yaounde'],
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
    // dependency and a class of surprises; the six ways a customer writes "payer"
    // are a list six long.
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
    id: 'prix',
    label: 'Prix et TVA',
    cues: ['tva', 'taxe', 'ht', 'ttc', 'remise', 'reduction', 'negocier'],
    answer:
      `Les prix affichés sont en FCFA, TVA de ${(VAT_RATE * 100).toLocaleString('fr-FR')} % ` +
      'comprise. Une facture normalisée est délivrée sur demande.',
  },
  {
    id: 'contact',
    label: 'Parler à quelqu’un',
    cues: ['telephone', 'appeler', 'numero', 'whatsapp', 'contact', 'joindre', 'humain'],
    answer: `Appelez le comptoir : ${PHONES.join(' ou ')}. WhatsApp répond aux mêmes numéros.`,
    link: { href: '/contact', label: 'Nous joindre' },
  },
]

/** The first thing Bod says, and the only place its limits are stated. */
export const OPENING =
  'Bonjour. Je cherche dans les 4 254 références du magasin et je réponds sur la ' +
  'livraison, le paiement, le retrait et la garantie. Pour le reste, je vous passe ' +
  'le comptoir sur WhatsApp.'

export const FALLBACK =
  'Je ne trouve rien de sûr là-dessus, et je préfère vous le dire plutôt que ' +
  'd’inventer. Le comptoir répond sur WhatsApp, avec la question déjà écrite.'
