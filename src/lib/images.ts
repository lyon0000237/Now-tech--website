import type { Product } from '@/types/catalog'

/**
 * Resolves which photograph to render for a product.
 *
 * The supplier library is used exactly as shipped, at full resolution. An
 * automated pipeline was built to knock out the studio background and patch the
 * shop's green corner stamp, and it was removed: every pass costs image quality,
 * and on hardware photography the detail in a port block or a connector face is
 * the part a buyer is actually reading.
 *
 * The layout absorbs the background instead of fighting it. Every surface a
 * photograph touches is white, and every photograph in this library was shot on
 * white, so the two grounds merge and there is no seam to hide. The page around
 * those surfaces carries the tint. A product placed on a white tile can then run
 * past the tile edge exactly like a cutout would, and the bleed crops the corner
 * stamp out of frame as a side effect.
 */
export interface ResolvedImage {
  readonly src: string
  readonly alt: string
}

export function resolveImage(product: Product): ResolvedImage | null {
  const original = product.images[0]
  if (!original) return null
  return { src: original.url, alt: original.alt || product.name }
}
