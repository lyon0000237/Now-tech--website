/**
 * The manufacturer logomarks the brand wall can draw.
 *
 * Filled by `scripts/fetch-brand-marks.mjs`, which writes the SVGs into
 * `public/brands/`. Nothing at runtime fetches a logo from anywhere.
 *
 * WHY A LIST AND NOT A GUESS. The wall used to be type, because a hundred
 * manufacturers cannot all be drawn. Marks exist for thirty-three of them, so
 * the wall is the marked brands ranked by the same depth the rest of the site
 * ranks brands by. A brand with no mark is skipped rather than set as a word
 * between two logos: half a wall of type and half a wall of marks reads as a
 * wall that failed to load.
 *
 * THIRTY-THREE IS THE CEILING, NOT A STOPPING POINT, AND IT WAS MEASURED. The
 * 101 brand names the ingest recovered were checked one by one against Simple
 * Icons' own index, 3 453 entries: 34 exist there, 67 do not. Simple Icons
 * removed most non-free marks in 2024, so Canon, Logitech, Microsoft, Philips,
 * Xerox, Brother, SanDisk, Western Digital, Crucial, Hisense, TCL, BenQ,
 * Transcend, Ricoh, Legrand, Eaton, Tenda, D-Link, Hikvision, APC and HPE are
 * all absent, several of them among the deepest brands this shop carries.
 * Hikvision alone is 266 references. Those are not missing through neglect;
 * there is no free file to fetch, and inventing one is not an option.
 * `/marques` carries all 101 either way, marked or not.
 *
 * WHY EACH ONE CARRIES TWO COLOURS. `official` is the brand's own hex, used when
 * a pointer arrives. Several of them are unusable as ink on white: Sony is
 * #ffffff, Zebra is #000000, Synology is a grey that measures 2.1:1. `hover` is
 * therefore the colour actually painted, which is the official one where it
 * clears 3:1 on paper and the page's own ink where it does not. The rule is
 * applied here, once, rather than guessed at in a component.
 */

export interface BrandMark {
  /** Catalog brand name, exactly as the ingest recovered it. */
  readonly brand: string
  /** File in `public/brands/`, without the extension. */
  readonly file: string
  /** The manufacturer's own hex, kept for the record. */
  readonly official: string
  /** What the wall actually paints on hover. */
  readonly hover: string
}

/** Falls back to the page's ink where a brand colour cannot carry itself. */
const INK = '#141715'

export const BRAND_MARKS: readonly BrandMark[] = [
  { brand: 'HP', file: 'hp', official: '#0096D6', hover: '#0096D6' },
  { brand: 'LENOVO', file: 'lenovo', official: '#E2231A', hover: '#E2231A' },
  { brand: 'TP-LINK', file: 'tplink', official: '#4ACBD6', hover: '#1F8C97' },
  { brand: 'LG', file: 'lg', official: '#A50034', hover: '#A50034' },
  { brand: 'MIKROTIK', file: 'mikrotik', official: '#293239', hover: '#293239' },
  { brand: 'DELL', file: 'dell', official: '#007DB8', hover: '#007DB8' },
  { brand: 'EPSON', file: 'epson', official: '#003399', hover: '#003399' },
  { brand: 'UBIQUITI', file: 'ubiquiti', official: '#0559C9', hover: '#0559C9' },
  { brand: 'CISCO', file: 'cisco', official: '#1BA0D7', hover: '#137FAB' },
  { brand: 'PANASONIC', file: 'panasonic', official: '#0049AB', hover: '#0049AB' },
  { brand: 'SEAGATE', file: 'seagate', official: '#6EBE49', hover: '#4A8B2C' },
  { brand: 'SAMSUNG', file: 'samsung', official: '#1428A0', hover: '#1428A0' },
  { brand: 'QNAP', file: 'qnap', official: '#0C2E82', hover: '#0C2E82' },
  { brand: 'TOSHIBA', file: 'toshiba', official: '#FF0000', hover: '#D40000' },
  { brand: 'SYNOLOGY', file: 'synology', official: '#B5B5B6', hover: INK },
  { brand: 'XIAOMI', file: 'xiaomi', official: '#FF6900', hover: '#C24F00' },
  { brand: 'ZEBRA', file: 'zebratechnologies', official: '#000000', hover: INK },
  { brand: 'ACER', file: 'acer', official: '#83B81A', hover: '#5A7F12' },
  { brand: 'SONY', file: 'sony', official: '#FFFFFF', hover: INK },
  { brand: 'NETGEAR', file: 'netgear', official: '#2C262D', hover: '#2C262D' },
  { brand: 'FORTINET', file: 'fortinet', official: '#EE3124', hover: '#EE3124' },
  { brand: 'KASPERSKY', file: 'kaspersky', official: '#006D5C', hover: '#006D5C' },
  { brand: 'INTEL', file: 'intel', official: '#0071C5', hover: '#0071C5' },
  { brand: 'HUAWEI', file: 'huawei', official: '#FF0000', hover: '#FF0000' },
  { brand: 'MSI', file: 'msi', official: '#FF0000', hover: '#FF0000' },
  { brand: 'JBL', file: 'jbl', official: '#FF3300', hover: '#FF3300' },
  { brand: 'APPLE', file: 'apple', official: '#000000', hover: INK },
  { brand: 'ASUS', file: 'asus', official: '#000000', hover: INK },
  { brand: 'GARMIN', file: 'garmin', official: '#000000', hover: INK },
  { brand: 'KINGSTON', file: 'kingstontechnology', official: '#000000', hover: INK },
  { brand: 'LINKSYS', file: 'linksys', official: '#000000', hover: INK },
  { brand: 'IMOU', file: 'imou', official: '#E89313', hover: INK },
  { brand: 'NIKON', file: 'nikon', official: '#FFE100', hover: INK },
]

export const BRAND_MARK_BY_NAME: ReadonlyMap<string, BrandMark> = new Map(
  BRAND_MARKS.map((mark) => [mark.brand, mark]),
)
