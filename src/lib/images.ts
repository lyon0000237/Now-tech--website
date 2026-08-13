import type { Product } from '@/types/catalog'

/**
 * Resolves which photograph to render for a product.
 *
 * The supplier library is used exactly as shipped. An automated knockout pass
 * was built and rejected: eroding the alpha to kill JPEG halos also ate thin
 * subjects, and antenna whips, patch cables and rack ears came back visibly
 * chewed. On a catalogue where the silhouette is what identifies the product,
 * that is a worse failure than an untouched white background.
 *
 * So the background stays, and the layout absorbs it instead: every product
 * sits on a white surface, and it is the page around it that carries the tint.
 * The seam disappears because there is no seam.
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
