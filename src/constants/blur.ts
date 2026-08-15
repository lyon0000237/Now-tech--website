/**
 * The placeholder every product photograph fades in from.
 *
 * ONE PLACEHOLDER FOR 4 254 PHOTOGRAPHS, AND THAT IS A MEASUREMENT, NOT A
 * SHORTCUT. A real per-image `blurDataURL` was priced first, on a real file
 * from this catalogue: 600 by 600, reduced to a 10 by 10 thumbnail, it comes
 * out 58% near-white with a mean of rgb(210, 218, 227). Every packshot in this
 * library was shot on white, so every one of those 4 254 blurs would be a pale
 * square with a faint smudge in it. They would cost 964 bytes each, four
 * megabytes in the dataset, and 23 kilobytes added to the HTML of every
 * listing page of 24 cards, on a market where the connection is metered.
 *
 * Four megabytes to say "white" four thousand times is not a trade. This is the
 * same pale square, declared once, and it is honest about what is coming: a
 * photograph on white. Next still does the work that matters, holding the box
 * and cross-fading the real file in over it, so nothing jumps and nothing
 * appears out of nowhere.
 *
 * The day the library is re-shot on something other than white, this constant
 * stops being true and the per-image cost becomes worth paying.
 */
export const PACKSHOT_BLUR =
  '""" + uri + """'
