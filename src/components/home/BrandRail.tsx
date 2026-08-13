import Link from 'next/link'

import type { Brand } from '@/types/catalog'

/**
 * The brand row.
 *
 * Brand is real navigation here, not a logo wall. The export has no brand
 * taxonomy at all — the column is filled on 14 rows out of 7,116 — so these 102
 * names were recovered at ingest by reading category paths and product titles.
 * That recovery is what makes it possible to compare an HP laptop against a
 * Dell one in a single list, which the current site cannot do.
 *
 * Set as type rather than as logos: we do not hold licensed marks for a hundred
 * manufacturers, and inventing them would be worse than naming them.
 */
export function BrandRail({ brands }: { brands: readonly Brand[] }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {brands.map((brand) => (
        <Link
          key={brand.slug}
          href={`/marque/${brand.slug}`}
          className="rounded-[999px] border border-rule px-4 py-2 text-[0.84375rem] text-ink-2 transition-colors duration-[var(--t-fast)] ease-brand hover:border-ink hover:text-ink"
        >
          {brand.name}
          <span className="t-num ml-1.5 text-xs text-ink-3">{brand.productCount}</span>
        </Link>
      ))}
    </div>
  )
}
