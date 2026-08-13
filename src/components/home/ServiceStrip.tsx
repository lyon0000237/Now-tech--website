import { SERVICE_POINTS } from '@/constants/site'

/**
 * The four operating facts, stated once.
 *
 * No icons. A truck glyph next to "Livraison 24 à 48 h" adds nothing the words
 * do not already carry, and a row of decorative pictograms is one of the
 * clearest signals that a storefront was assembled from a template. The
 * hairlines do the separating.
 */
export function ServiceStrip() {
  return (
    <div className="shell">
      <dl className="grid border-y border-rule sm:grid-cols-2 lg:grid-cols-4">
        {SERVICE_POINTS.map((point, index) => (
          <div
            key={point.title}
            className={`py-5.5 pr-6 ${index > 0 ? 'lg:border-l lg:border-rule lg:pl-6.5' : ''} ${
              index % 2 === 1 ? 'sm:border-l sm:border-rule sm:pl-6.5' : ''
            } ${index >= 2 ? 'border-t border-rule sm:border-t lg:border-t-0' : ''}`}
          >
            <dt className="mb-0.5 text-[0.9375rem] font-semibold">{point.title}</dt>
            <dd className="text-[0.84375rem] text-ink-2">{point.detail}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
