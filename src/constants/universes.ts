import type { UniverseId } from '@/types/catalog'

/**
 * The curated navigation layer.
 *
 * WHY THIS EXISTS — the export's root level cannot be navigation. It holds 46
 * terms, 26 of which have no children, ranging from `Réseaux et
 * Télecommunication` (845 products) down to `antenne` (1). Presenting that as a
 * top-level menu asks a customer to choose between a department and a single SKU.
 *
 * WHERE THESE TWELVE COME FROM — not from us. The live nowtechcenter.com
 * "Toutes Catégories" panel already groups the shop into twelve human
 * departments (Ordinateurs et Accessoires, Reseaux/Switchs/Routeurs/AP,
 * Telecom/Telephonie Fixe, Onduleurs et Regulateurs, Stockage/disques durs/NAS,
 * Connectiques/Adaptateurs, TV/Audio/Electromenager, Occasions/Reconditionnés,
 * Services/Installation/Maintenance …). That is the merchant's own mental model
 * of their business, and it is a far better starting point than either the raw
 * export or anything we would invent. These universes reproduce it, with the
 * source category ids resolved against the real tree.
 *
 * HOW IT BINDS — `categoryIds` may point at a term on ANY level, not only a
 * root. `Téléphonie` (106) is a child of `Réseaux et Télecommunication` in the
 * export, but the merchant sells telecom as its own department, so it is bound
 * directly and leaves its siblings behind in `network`. A category with no
 * binding inherits from its nearest bound ancestor.
 *
 * NOTHING IS DESTROYED — no source category is renamed, merged or deleted. All
 * 267 terms keep their id, their parent, their page and their URL. The universe
 * is a grouping placed over the tree, never a replacement for it, and never an
 * extra click: the navigation links straight through to real categories.
 */
export interface UniverseDefinition {
  readonly id: UniverseId
  readonly slug: string
  readonly name: string
  /** Short label for tight navigation rows. */
  readonly shortName: string
  /** One-line positioning, French. */
  readonly tagline: string
  /** Bound source category ids, any level, in editorial order (heaviest first). */
  readonly categoryIds: readonly number[]
}

export const UNIVERSE_DEFINITIONS: readonly UniverseDefinition[] = [
  {
    id: 'computing',
    slug: 'ordinateurs-accessoires',
    name: 'Ordinateurs & Accessoires',
    shortName: 'Ordinateurs',
    tagline: 'Portables, bureaux, écrans, serveurs, composants et périphériques.',
    // .Ordinateurs · Accessoires Ordinateurs · Systèmes/Logiciels · LOGITECH · Jeux vidéo
    categoryIds: [67, 65, 128, 397, 331],
  },
  {
    id: 'network',
    slug: 'reseaux-switchs-routeurs',
    name: 'Réseaux, Switchs & Routeurs',
    shortName: 'Réseaux',
    tagline: 'Routage, commutation, radio, fibre, câblage et baies de brassage.',
    // The "Réseaux et Télecommunication" root itself, plus the loose "antenne"
    // term. Téléphonie (106) sits under 63 in the export but binds itself to
    // the telecom department below, and a self-binding always wins.
    categoryIds: [63, 1229],
  },
  {
    id: 'security',
    slug: 'securite-biometrie',
    name: 'Sécurité & Biométrie',
    shortName: 'Sécurité',
    tagline: 'Vidéosurveillance, enregistreurs, contrôle d’accès, alarme, interphonie.',
    categoryIds: [62, 1195],
  },
  {
    id: 'printing',
    slug: 'impression-copie-scan',
    name: 'Impression, Copie & Scan',
    shortName: 'Impression',
    tagline: 'Imprimantes, copieurs, étiqueteuses, scanners et consommables d’origine.',
    categoryIds: [720, 84],
  },
  {
    id: 'power',
    slug: 'onduleurs-energie',
    name: 'Onduleurs, Régulateurs & Énergie',
    shortName: 'Énergie',
    tagline: 'Onduleurs, régulateurs, batteries et solaire — pour un site qui ne tombe pas.',
    categoryIds: [89, 179, 382, 1240, 456, 1043, 1238, 1235, 1226, 1239, 402],
  },
  {
    id: 'vision',
    slug: 'tv-audio-electromenager',
    name: 'TV, Audio & Électroménager',
    shortName: 'TV & Audio',
    tagline: 'Téléviseurs, vidéoprojection, hi-fi, photo, gadgets et électroménager.',
    categoryIds: [109, 142, 1356, 1228, 1041, 1328, 1270, 395, 1346],
  },
  {
    id: 'connectics',
    slug: 'connectiques-adaptateurs',
    name: 'Connectiques & Adaptateurs',
    shortName: 'Connectiques',
    tagline: 'Câbles, adaptateurs, convertisseurs, splitters et extendeurs.',
    categoryIds: [1094],
  },
  {
    id: 'storage',
    slug: 'stockage-disques-nas',
    name: 'Stockage, Disques & NAS',
    shortName: 'Stockage',
    tagline: 'Disques internes et externes, SSD, cartes mémoire et baies NAS.',
    categoryIds: [428],
  },
  {
    id: 'telecom',
    slug: 'telecom-telephonie',
    name: 'Télécom & Téléphonie',
    shortName: 'Télécom',
    tagline: 'Standards IPBX, passerelles GSM et postes IP pour l’entreprise.',
    // Lifted out of "Réseaux et Télecommunication" — the merchant sells it as its own department.
    categoryIds: [106],
  },
  {
    id: 'mobile',
    slug: 'telephones-tablettes',
    name: 'Téléphones & Tablettes',
    shortName: 'Mobiles',
    tagline: 'Smartphones, tablettes et accessoires de charge et d’écoute.',
    categoryIds: [719, 1224, 1223],
  },
  {
    id: 'office',
    slug: 'bureautique-atelier',
    name: 'Bureautique & Atelier',
    shortName: 'Bureautique',
    tagline: 'Caisses, compteurs de billets, outillage, sérigraphie et matériel de bureau.',
    categoryIds: [1269, 429, 180, 66, 372, 737, 325, 17],
  },
  {
    id: 'services',
    slug: 'services-occasion',
    name: 'Services & Occasion',
    shortName: 'Services',
    tagline: 'Installation, maintenance, prestations de l’atelier et matériel reconditionné.',
    categoryIds: [329, 355],
  },
] as const

/** Fallback for a source term with no bound ancestor — should never fire. */
export const FALLBACK_UNIVERSE_ID: UniverseId = 'office'

/**
 * Which product opens each department on the homepage.
 *
 * These twelve are chosen by eye, and they have to be. Ranking a family by
 * recency opens the department with whatever arrived last, which in this
 * catalogue is routinely a supplier's promotional sheet rather than a product:
 * a Black Friday toolbox collage, a spec banner for a switch, a doorbell advert
 * filed under projectors. No image statistic separates those from a real
 * packshot either, because a phone and a banner are both colourful rectangles.
 *
 * So this is a merchandising decision, held as twelve product ids. It is the
 * only hand-picked content in the entire storefront, and it is deliberate: the
 * twelve doors into the catalogue are worth choosing.
 */
export const DEPARTMENT_HERO_PRODUCT: Readonly<Record<UniverseId, number>> = {
  computing: 58494, // Lenovo ThinkBook, three-quarter view
  network: 60021, // Tenda desktop switch
  security: 59781, // Hikvision dome camera
  printing: 60040, // HP LaserJet Pro 3303sdw
  power: 53923, // APC modular tower UPS
  vision: 50734, // Epson projector
  connectics: 47915, // HDMI cable, coiled
  storage: 53275, // Samsung T7 Shield
  telecom: 59266, // Grandstream desk phone
  mobile: 47141, // Galaxy Tab A9
  office: 56198, // Tool chest
  services: 39583, // Reconditioned monitor
}
