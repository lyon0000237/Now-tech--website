/**
 * Reserved slots for artwork a designer will deliver.
 *
 * Every place on the site that expects a designed asset is declared here, once,
 * with the size and the constraints it has to be drawn to. Nothing else in the
 * codebase decides what a banner is: components ask this registry.
 *
 * Two things make the registry worth the file. First, a slot renders a labelled
 * placeholder until the file exists, so the brief is legible on the page itself
 * rather than living in a conversation. Second, delivery is a drag and drop:
 * put `hero-primary.jpg` in `public/brand/` and the placeholder becomes the
 * artwork on the next build, with no code change.
 *
 * Sizes are given at 2x, because every one of these is displayed on phones
 * whose screens are 2x or 3x. Aspect ratios are fixed at the slot rather than
 * at the artwork, so a file delivered slightly off ratio is contained instead
 * of stretched.
 */

export type AssetRole =
  /** A full-width picture leading the page. */
  | 'banner'
  /** A department's own artwork, standing in for a product photograph. */
  | 'department'
  /** A square or portrait tile inside a composed grid. */
  | 'tile'
  /** A logotype, wordmark or third-party payment mark. Vector preferred. */
  | 'mark'

export interface BrandAssetSlot {
  /** File name expected in `public/brand/`, extension included. */
  readonly file: string
  readonly role: AssetRole
  /** What this artwork is for, in the words the designer needs. */
  readonly purpose: string
  /** Delivery size in CSS pixels at 2x. */
  readonly width: number
  readonly height: number
  /**
   * What must not be in the file. Type baked into artwork cannot be translated,
   * cannot reflow on a 390px screen and cannot be read by a search engine, so
   * the site sets its own type over these rather than receiving it inside them.
   */
  readonly constraints: readonly string[]
}

const NO_TYPE = [
  'Aucun texte incrusté : les titres sont composés par le site, au-dessus.',
  'Prévoir une zone calme à gauche pour la typographie.',
] as const

/**
 * The registry.
 *
 * Keys are stable ids used in code. File names are what the designer delivers.
 */
export const BRAND_ASSETS = {
  /** Replaces the drawn wordmark in the masthead and the footer when supplied. */
  wordmark: {
    file: 'wordmark.svg',
    role: 'mark',
    purpose: 'Logotype NowTech Center, version horizontale, pour l’en-tête et le pied de page.',
    width: 320,
    height: 64,
    constraints: [
      'SVG vectoriel, tracés convertis, sans texte éditable.',
      'Doit rester lisible à 20 px de hauteur réelle.',
      'Une seule couleur, appliquée via currentColor si possible.',
    ],
  },

  /** The opening picture, if the final structure carries one. */
  heroPrimary: {
    file: 'hero-primary.jpg',
    role: 'banner',
    purpose: 'Visuel d’ouverture de la page d’accueil, version large.',
    width: 2880,
    height: 1400,
    constraints: [...NO_TYPE, 'Doit supporter un recadrage vertical jusqu’au 4:5 sur téléphone.'],
  },

  heroPortrait: {
    file: 'hero-portrait.jpg',
    role: 'banner',
    purpose: 'Le même visuel d’ouverture, composé pour le téléphone.',
    width: 1170,
    height: 1460,
    constraints: [...NO_TYPE],
  },

  /** Editorial tiles for a promotional band. */
  promoA: {
    file: 'promo-a.jpg',
    role: 'tile',
    purpose: 'Tuile éditoriale, mise en avant d’un rayon ou d’une opération.',
    width: 1400,
    height: 1050,
    constraints: [...NO_TYPE],
  },
  promoB: {
    file: 'promo-b.jpg',
    role: 'tile',
    purpose: 'Deuxième tuile éditoriale, à composer en paire avec la première.',
    width: 1400,
    height: 1050,
    constraints: [...NO_TYPE],
  },

  /** Third-party marks. These cannot be drawn here: they belong to their owners. */
  paymentMtn: {
    file: 'payment-mtn.svg',
    role: 'mark',
    purpose: 'Logo officiel MTN Mobile Money, fourni par le client.',
    width: 200,
    height: 80,
    constraints: [
      'Fichier officiel uniquement, jamais redessiné.',
      'Vérifier les droits d’usage avant mise en ligne.',
    ],
  },
  paymentOrange: {
    file: 'payment-orange.svg',
    role: 'mark',
    purpose: 'Logo officiel Orange Money, fourni par le client.',
    width: 200,
    height: 80,
    constraints: [
      'Fichier officiel uniquement, jamais redessiné.',
      'Vérifier les droits d’usage avant mise en ligne.',
    ],
  },

  /** Social preview. */
  openGraph: {
    file: 'open-graph.jpg',
    role: 'banner',
    purpose: 'Image de partage, affichée sur WhatsApp, Facebook et LinkedIn.',
    width: 1200,
    height: 630,
    constraints: [
      'WhatsApp recadre au carré : garder l’essentiel au centre.',
      'Le nom de la boutique peut être incrusté ici, contrairement aux autres visuels.',
    ],
  },
} as const satisfies Record<string, BrandAssetSlot>

export type BrandAssetId = keyof typeof BRAND_ASSETS

/**
 * A department may receive its own artwork instead of showing a product
 * photograph. The file name follows the department slug, so no code changes
 * when one is delivered: `public/brand/rayon-reseau-telecom.jpg`.
 */
export function departmentAsset(slug: string): BrandAssetSlot {
  return {
    file: `rayon-${slug}.jpg`,
    role: 'department',
    purpose: `Visuel du rayon ${slug}, en remplacement du packshot produit.`,
    width: 1200,
    height: 900,
    constraints: [...NO_TYPE, 'Le nom du rayon et son compteur sont posés par le site.'],
  }
}
