/**
 * Products withheld from the storefront.
 *
 * The export is the source of truth and is never edited. When a record has to
 * be kept out of the shop, it is listed here with the reason, so the decision
 * survives the next catalog rebuild and nobody has to guess later why a product
 * that exists upstream never appears.
 *
 * Suppression removes a product from every listing, every count and its own
 * page. It is not a soft hide.
 */
export const SUPPRESSED_PRODUCTS: ReadonlyMap<number, string> = new Map([
  [
    59269,
    'Photography is a supplier marketing sheet, not a packshot: a full-bleed ' +
      'poster with its own headline, logos and feature bullets. It cannot be ' +
      'made to sit in a product grid.',
  ],
  [
    59933,
    'Same: the image is an HPE promotional layout rather than a photograph of ' +
      'the switch.',
  ],
])
