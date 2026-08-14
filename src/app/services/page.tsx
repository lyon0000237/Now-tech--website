import type { Metadata } from 'next'

import { PageHeader } from '@/components/layout/PageHeader'
import { getServices } from '@/lib/catalog'
import { formatPrice } from '@/lib/format'

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Installation, maintenance et infogérance : vidéosurveillance, réseaux et téléphonie IP, ' +
    'contrôle d’accès, énergie solaire et backup électrique, à Douala et Yaoundé.',
}

/**
 * The services page.
 *
 * Every line comes from the shop's own `Nos Services` term, prices included.
 * Nothing is written for the page: a storefront that invents a service list is
 * one phone call away from being caught out, and this shop already sells 34 of
 * them with real rates attached.
 *
 * Set as a price list rather than as a grid of cards. These have no photographs
 * worth showing, and what a buyer wants from a service is the scope and the
 * entry price on one line, which is a table's job.
 */
export default function ServicesPage() {
  const services = getServices()

  return (
    <>
      <PageHeader
        title="Installation, maintenance et infogérance"
        lead="Les équipes interviennent sur site à Douala et à Yaoundé. Les tarifs ci-dessous sont des prix d’entrée : le devis final dépend du nombre de points, de la distance et du matériel."
        aside={`${services.length} prestations`}
      />

      <div className="shell">
        <ul className="border-t border-rule">
          {services.map((service) => (
            <li key={service.id}>
              <a
                href={`/produit/${service.slug}`}
                className="group flex flex-wrap items-baseline justify-between gap-x-10 gap-y-1 border-b border-rule py-6 transition-colors duration-[var(--t-fast)] hover:bg-space"
              >
                <span className="max-w-[62ch] text-body group-hover:text-accent">
                  {service.name}
                </span>
                <span className="t-num shrink-0 text-small text-ink-2">
                  à partir de <b className="font-semibold text-ink">{formatPrice(service.price)}</b>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
