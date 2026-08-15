'use client'

import Image from 'next/image'

import { PACKSHOT_BLUR } from '@/constants/blur'
import { useCallback, useRef, useState } from 'react'

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
 *
 * THE MAGNIFIER IS A READING TOOL, AND ON THIS CATALOGUE IT IS NOT DECORATION.
 * A large part of this stock is a black box whose whole identity is printed
 * small on its own face: the port count along a switch, the legend beside the
 * indicators, the model reference silkscreened on a rack fascia. The packshot
 * carries that detail at a resolution the 560px frame throws away. Pointing at
 * the picture magnifies it 2.3 times around the pointer, so the frame becomes a
 * window that is moved over the photograph rather than a fixed crop of it.
 *
 * WHAT THE MAGNIFIER CAN DO AND WHAT IT CANNOT, MEASURED. The supplier files
 * behind this frame are 425 to 576 pixels square: the eight products sampled
 * off the first page of the catalogue return 540, 540, 425, 540, 540, 540, 540
 * and 576. The frame itself draws 710 CSS pixels at 1440, so the photograph is
 * already being enlarged before anyone points at it, and 2.3 times is enlarging
 * an enlargement. This magnifier therefore makes small print BIGGER; it cannot
 * make it SHARPER, because there is no sharper anywhere on the origin. 2.3 is
 * where a control panel legend and a model number crossed from illegible to
 * legible in the frame, and the softness that comes with it is the supplier's
 * file, honestly shown. Nothing is fixed on this side of the wire: the day the
 * library is re-shot at 1500px, this same number starts resolving detail rather
 * than only enlarging it.
 *
 * NOTHING HERE GOES THROUGH REACT STATE, AND THAT IS A RULE, NOT AN
 * OPTIMISATION. A pointermove is a continuous stream; routing it through
 * `useState` re-renders this component, its images and its thumbnail row on
 * every frame of every mouse movement, to change one number the compositor
 * could have changed alone. The handler writes two custom properties straight
 * onto the frame and the browser does the rest. React re-renders here only when
 * the reader actually chooses another view, which is the only thing that is
 * really state.
 *
 * WHY THE GUARD IS A MEDIA QUERY AND NOT A DEVICE GUESS. The effect exists
 * behind `(hover: hover) and (pointer: fine)`, in CSS and again in the handler.
 * On a touch screen there is no pointer to follow, and a picture that magnifies
 * under the finger holding it is a picture that has swallowed the page's
 * scrolling. On a phone this frame stays a frame. That is the honest answer:
 * the alternative is a pinch-zoom viewer nobody asked for, and the browser
 * already has one.
 *
 * AND THE BROWSER'S ONE IS NOT A CONSOLATION HERE, IT IS THE BETTER TOOL,
 * MEASURED. `layout.tsx` declares no `viewport` export, so Next emits
 * `width=device-width, initial-scale=1` with no `maximum-scale` and no
 * `user-scalable=no`: pinch is live on this page. The frame draws 306 CSS
 * pixels at 360 on a screen whose device pixel ratio is 2 or 3, so the
 * photograph is already being painted at 612 to 918 device pixels from a source
 * file that is 425 to 576 across. The reader is looking at an enlargement
 * before touching anything, and there is no detail left on the origin for a
 * second, in-page magnifier to find. A pinch reaches the same ceiling, with the
 * gesture the phone already taught them. That is the answer to "how do I see
 * the small print" on a touch screen, and it costs no code.
 *
 * The pointer never becomes a way to operate this component: the thumbnails are
 * the control, they are buttons, they are what a keyboard and a screen reader
 * use, and none of them is touched by any of the above.
 */

/** Enough to read a silkscreened reference, little enough to stay a photograph. */
const MAGNIFICATION = 2.3

export function ProductGallery({
  images,
  name,
}: {
  images: readonly string[]
  name: string
}) {
  const [active, setActive] = useState(0)
  const frame = useRef<HTMLDivElement>(null)
  // Kept live rather than sampled once: a MediaQueryList answers `matches` at
  // the moment it is asked, so a reader who plugs in a mouse, or turns on
  // reduced motion mid-visit, gets the right answer without a listener and
  // without a re-render.
  const fine = useRef<MediaQueryList | null>(null)
  const still = useRef<MediaQueryList | null>(null)

  const track = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const node = frame.current
    if (!node) return
    fine.current ??= window.matchMedia('(hover: hover) and (pointer: fine)')
    still.current ??= window.matchMedia('(prefers-reduced-motion: reduce)')
    // `pointerType` is the per-event truth; the media queries are the device's.
    // A stylus reports `pen` and is fine and hovering, and it is welcome.
    if (event.pointerType === 'touch' || !fine.current.matches || still.current.matches) return

    const box = node.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) return
    node.style.setProperty('--zoom-x', `${((event.clientX - box.left) / box.width) * 100}%`)
    node.style.setProperty('--zoom-y', `${((event.clientY - box.top) / box.height) * 100}%`)
    node.style.setProperty('--zoom-scale', String(MAGNIFICATION))
  }, [])

  // Only the scale is released. The origin is left where the pointer left it, so
  // the picture settles back along the line it came in on instead of sliding to
  // the centre while it shrinks.
  const release = useCallback(() => {
    frame.current?.style.setProperty('--zoom-scale', '1')
  }, [])

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
      <div
        ref={frame}
        onPointerMove={track}
        onPointerLeave={release}
        // A pointer that goes down on a picture is usually a drag, and a
        // magnified picture is not what a drag should leave behind.
        onPointerDown={release}
        // THE FRAME STAYS SQUARE ON A PHONE AND THE PADDING DOES NOT. Every
        // supplier file behind it is a square canvas, 425 to 576 pixels a side,
        // with the product sitting inside it: shorten the frame to 4:3 and a
        // 540 square `contain`s to 229 instead of 306, so the packshot loses a
        // quarter of its size on the screen where it is already smallest. The
        // padding is the part that can go. 20px to 16px hands 8px of width back
        // to the photograph at 360, which is 3% more product and no layout
        // moved at all.
        className="magnify relative aspect-square overflow-hidden rounded-well border border-rule bg-surface p-4 sm:p-5 md:p-8"
      >
        <Image
          key={current}
          src={current}
          alt={`${name}, photographie ${active + 1} sur ${images.length}`}
          fill
          sizes="(max-width: 767px) 92vw, (max-width: 1279px) 46vw, 40vw"
          placeholder="blur"
          blurDataURL={PACKSHOT_BLUR}
          priority
          className="magnify-subject object-contain motion-safe:[animation:e-media-shutter_var(--e-media)_var(--ease-shutter)_both]"
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
