'use client'

import Image from 'next/image'
import { useState } from 'react'

/**
 * The photographs, at the size the decision is actually made at.
 *
 * WHAT THIS LIBRARY IS. 4 215 supplier packshots, every one shot on white, of
 * wildly uneven crop and resolution. So the well is white too and the image is
 * contained, never covered: a cover crop decapitates a tower UPS and clips the
 * ports off a 24-port switch, which is exactly the silhouette this buyer is
 * scanning for. That rule is the same one the grid follows, and it matters more
 * here, because this is the last picture anyone sees before spending money.
 *
 * THE SWITCH IS A SHUTTER, NOT A FADE. A crossfade between two packshots on
 * white reads as an image failing to load. The wipe is the same `e-media-shutter`
 * the whole site opens its pictures with, replayed by remounting on the key, so
 * changing angle uses the page's existing vocabulary rather than a second one
 * invented for this component. `motion-safe` carries the reduced-motion guard,
 * so no hook and no client-side media query is needed for it.
 *
 * THE THUMBNAILS ONLY EXIST WHEN THERE IS SOMETHING TO CHOOSE. Most products in
 * this export have one photograph; 1 354 have a second. A single thumbnail under
 * a picture is a control that cannot do anything, and drawing one on three
 * quarters of the catalogue would teach readers to ignore the row on the quarter
 * where it works.
 */
export function ProductGallery({
  images,
  name,
}: {
  images: readonly string[]
  name: string
}) {
  const [active, setActive] = useState(0)
  const current = images[active]

  if (!current) {
    return (
      <div className="grid aspect-square place-items-center rounded-well bg-space">
        <span className="t-label text-ink-3">Photo à venir</span>
      </div>
    )
  }

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-well border border-rule bg-surface p-5 md:p-8">
        <Image
          key={current}
          src={current}
          alt={`${name}, photographie ${active + 1} sur ${images.length}`}
          fill
          sizes="(max-width: 767px) 92vw, (max-width: 1279px) 46vw, 40vw"
          priority
          className="object-contain motion-safe:[animation:e-media-shutter_var(--e-media)_var(--ease-shutter)_both]"
        />
      </div>

      {images.length > 1 ? (
        <div
          role="group"
          aria-label="Autres vues"
          className="mt-4 flex flex-wrap gap-3 md:mt-5"
        >
          {images.map((image, index) => {
            const selected = index === active
            return (
              <button
                key={image}
                type="button"
                onClick={() => setActive(index)}
                aria-pressed={selected}
                aria-label={`Vue ${index + 1}`}
                // 72px is the smallest a packshot of a black rack-mount box is
                // still distinguishable at, and it clears the 44px target with
                // room to spare, so no pseudo-element expander is needed here.
                className={`press relative size-[4.5rem] overflow-hidden rounded-[10px] border bg-surface p-1.5 transition-colors duration-[var(--t-fast)] ${
                  selected ? 'border-accent' : 'border-rule hover:border-ink'
                }`}
              >
                <Image src={image} alt="" fill sizes="72px" className="object-contain" />
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
