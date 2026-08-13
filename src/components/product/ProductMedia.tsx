import Image from 'next/image'

/**
 * The product well.
 *
 * This component is the whole image strategy in one place, so no grid ever has
 * to reason about it again.
 *
 * The library is 4,215 supplier packshots of wildly uneven crop, resolution and
 * subject scale, and every one of them was shot on white. So the well is white
 * too: the photograph's own background becomes the well, and there is nothing
 * for a seam to appear between. What varies in the source then reads as
 * variation in the product rather than as sloppiness in the page.
 *
 * Two rules never bend: the aspect ratio is constant, and the image is
 * contained, never covered. A cover crop decapitates a tower UPS and clips the
 * ports off a 24-port switch, which is exactly the silhouette a buyer scans
 * for.
 */
export function ProductMedia({
  src,
  alt,
  sizes,
  priority = false,
  className = '',
}: {
  src: string | null
  alt: string
  sizes: string
  priority?: boolean
  className?: string
}) {
  if (!src) {
    return (
      <div
        className={`grid aspect-square place-items-center rounded-well bg-surface ${className}`}
      >
        <span className="t-label text-ink-3">Photo à venir</span>
      </div>
    )
  }

  return (
    <div
      className={`relative aspect-square overflow-hidden rounded-well bg-surface p-3 ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-contain"
      />
    </div>
  )
}
