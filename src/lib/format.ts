/**
 * Display formatting.
 *
 * Shared by server and client, so it must stay free of any Node or DOM API.
 * Every number the customer reads goes through here — a price formatted by hand
 * anywhere in the UI is a bug.
 */

/**
 * Prices are whole XAF. The franc CFA has no minor unit, so a decimal
 * separator here would be actively wrong, and `Intl` gets the grouping right
 * for fr-FR (narrow no-break space) without us hand-rolling it.
 */
const priceFormatter = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 0,
  useGrouping: true,
})

/** `1 250 000 FCFA`. The suffix is what Cameroonian buyers actually read. */
export function formatPrice(value: number): string {
  return `${priceFormatter.format(value)} FCFA`
}

/** Price without the currency, for tables and axis labels where it repeats. */
export function formatAmount(value: number): string {
  return priceFormatter.format(value)
}

/**
 * `849 produits` / `1 produit`.
 *
 * French pluralisation only needs the singular carve-out at 0 and 1, and 0 takes
 * the singular — `0 produit`, not `0 produits`.
 */
export function formatCount(value: number, singular: string, plural = `${singular}s`): string {
  return `${priceFormatter.format(value)} ${Math.abs(value) < 2 ? singular : plural}`
}

/** `août 2026` from the `YYYY-MM` recency stamp. */
const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

export function formatMonth(stamp: string | null): string | null {
  if (!stamp) return null
  const [year, month] = stamp.split('-').map(Number)
  const name = MONTHS[month - 1]
  return name ? `${name} ${year}` : null
}
