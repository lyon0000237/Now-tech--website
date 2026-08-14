import type { Metadata } from 'next'

import { IconPhone, IconPin } from '@/components/brand/Icons'
import { PageHeader } from '@/components/layout/PageHeader'
import { PHONES, SHOWROOMS, SERVICE_POINTS, VAT_RATE } from '@/constants/site'

export const metadata: Metadata = {
  title: 'Nous joindre',
  description:
    'Showrooms à Akwa, Bonapriso et Yaoundé. Conseil par téléphone et WhatsApp, ' +
    'devis et facture proforma pour les entreprises.',
}

/**
 * Contact.
 *
 * Deliberately plain and deliberately dense. Research on this market is
 * consistent: the blocker is not indecision, it is the fear of sending money to
 * a website that does not exist in the physical world. Street addresses with
 * landmark directions, numbers that dial, and a stated VAT rate answer that
 * better than any amount of composition.
 *
 * No contact form. A form here would put a queue between a buyer and a shop
 * whose whole sales process already runs on the phone.
 */
export default function ContactPage() {
  return (
    <>
      <PageHeader
        title="Nous joindre"
        lead="Le plus rapide reste le téléphone ou WhatsApp : les conseillers ont le stock atelier sous les yeux, y compris ce qui n’est pas encore en ligne."
      />

      <div className="shell grid gap-x-14 gap-y-14 lg:grid-cols-[1fr_1fr]">
        <section>
          <h2 className="t-label mb-6 text-ink-3">Par téléphone</h2>
          <ul className="space-y-4">
            {PHONES.map((phone) => (
              <li key={phone}>
                <a
                  href={`tel:${phone.replace(/\s/g, '')}`}
                  className="flex items-center gap-4 text-lead transition-colors duration-[var(--t-fast)] hover:text-accent"
                >
                  <IconPhone className="shrink-0 text-[1.375rem] text-ink-3" />
                  <span className="t-num">{phone}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-[46ch] text-small text-ink-2">
            Les deux numéros reçoivent WhatsApp. Pour une demande chiffrée, envoyez la liste du
            matériel et la ville de livraison, la proforma part le jour même.
          </p>
        </section>

        <section>
          <h2 className="t-label mb-6 text-ink-3">Nos comptoirs</h2>
          <ul className="space-y-7">
            {SHOWROOMS.map((showroom) => (
              <li key={`${showroom.city}-${showroom.district}`} className="flex gap-4">
                <IconPin className="mt-1 shrink-0 text-[1.25rem] text-ink-3" />
                <span>
                  <span className="block text-body font-semibold">
                    {showroom.district}, {showroom.city}
                  </span>
                  <span className="mt-1 block text-small text-ink-2">{showroom.directions}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="shell mt-band">
        <dl className="grid border-y border-rule sm:grid-cols-2 lg:grid-cols-4">
          {SERVICE_POINTS.map((point, index) => (
            <div
              key={point.title}
              className={`py-11 pr-10 ${index > 0 ? 'lg:border-l lg:border-rule lg:pl-10' : ''} ${
                index % 2 === 1 ? 'sm:border-l sm:border-rule sm:pl-10' : ''
              } ${index >= 2 ? 'border-t border-rule lg:border-t-0' : ''}`}
            >
              <dt className="mb-1 text-body font-semibold">{point.title}</dt>
              <dd className="text-small text-ink-2">{point.detail}</dd>
            </div>
          ))}
        </dl>
        <p className="t-num mt-6 text-small text-ink-3">
          Facture proforma sur demande. {`TVA ${(VAT_RATE * 100).toFixed(2).replace('.', ',')} %.`}
        </p>
      </div>
    </>
  )
}
