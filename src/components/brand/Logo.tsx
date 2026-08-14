import Image from 'next/image'
import Link from 'next/link'

/**
 * The wordmark.
 *
 * The mark itself now, not a stand-in for it. It was a drawn lozenge and the
 * name set in Poppins, which held the slot honestly while no file existed;
 * `public/logo/now-tech.png` exists, so the drawing is gone. The same file is
 * the favicon and the touch icon, from `src/app/icon.png`.
 *
 * WHY THE NAME IS NOT REPEATED BESIDE IT. The mark contains "NOW TECH" already.
 * Setting it again in type puts the shop's name twice in 200 pixels and makes
 * the masthead read as a placeholder that was never finished. The accessible
 * name carries it instead, which is where a reader who cannot see the mark
 * needs it.
 *
 * `tone` is kept because the mark appears on two grounds, the white masthead and
 * the green footer. The artwork is a green disc with white inside it, which sits
 * on white and disappears into the rail, so on the rail it is given a white disc
 * to stand on rather than a second version of the file.
 */
type Tone = 'ink' | 'rail'

export function Logo({
  href = '/',
  tone = 'ink',
  className = '',
}: {
  href?: string | null
  tone?: Tone
  className?: string
}) {
  const mark = (
    <span
      className={`relative block size-9 shrink-0 md:size-10 ${
        tone === 'rail' ? 'rounded-full bg-paper p-0.5' : ''
      }`}
    >
      <Image
        src="/logo/now-tech.png"
        alt=""
        fill
        sizes="40px"
        priority
        className="object-contain"
      />
    </span>
  )

  const classes = `flex shrink-0 items-center ${className}`

  if (href === null) {
    return (
      <span className={classes} aria-label="NowTech Center">
        {mark}
      </span>
    )
  }
  return (
    <Link href={href} className={classes} aria-label="NowTech Center, accueil">
      {mark}
    </Link>
  )
}
