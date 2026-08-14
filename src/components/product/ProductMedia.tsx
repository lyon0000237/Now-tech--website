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
 * The well carries the only border in a product grid. Not the card: a hairline
 * round the whole cell boxes the name, the specs and the price along with the
 * photograph, and those three are type, which the page separates with space
 * everywhere else. The picture is the one thing that needs an edge, because a
 * packshot shot on white sitting on a white page has none of its own.
 *
 * The well paints --surface rather than inheriting the page. On a white page
 * that is invisible and looks redundant; in the dark theme it is the whole
 * point, because without it each packshot draws its own white rectangle on a
 * near-black ground.
 *
 * Two rules never bend: the aspect ratio is constant, and the image is
 * contained, never covered. A cover crop decapitates a tower UPS and clips the
 * ports off a 24-port switch, which is exactly the silhouette a buyer scans
 * for.
 */
export function ProductMedia({
  src,
  second = null,
  alt,
  sizes,
  priority = false,
  className = '',
}: {
  src: string | null
  /** A second angle, wiped across the first on hover. */
  second?: string | null
  alt: string
  sizes: string
  priority?: boolean
  className?: string
}) {
  if (!src) {
    return (
      <div
        className={`grid aspect-square place-items-center rounded-well bg-space ${className}`}
      >
        <span className="t-label text-ink-3">Photo à venir</span>
      </div>
    )
  }

  return (
    <div
      className={`relative aspect-square overflow-hidden rounded-well border border-rule bg-surface p-2 transition-colors duration-[var(--t-base)] group-hover:border-rule-2 ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="e-media object-contain"
      />
      {second ? (
        // The alternate view is wiped across rather than crossfaded: a fade
        // reads as a loading glitch on a packshot, a wipe reads as a decision.
        <Image
          src={second}
          alt=""
          fill
          sizes={sizes}
          aria-hidden
          className="object-contain [clip-path:inset(0_100%_0_0)] transition-[clip-path] duration-[var(--t-wipe)] ease-[var(--ease-wipe)] group-hover:[clip-path:inset(0_0_0_0)]"
        />
      ) : null}
    </div>
  )
}
