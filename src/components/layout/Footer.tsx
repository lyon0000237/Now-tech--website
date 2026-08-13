import { Logo } from '@/components/brand/Logo'
import { PHONES, SHOWROOMS, VAT_RATE } from '@/constants/site'

/**
 * The footer.
 *
 * Deliberately dense. The blocker in this market is not boredom, it is the fear
 * of being scammed, and trust here is carried by the density of verifiable
 * proof: real street addresses with landmark directions, real +237 numbers,
 * named payment methods, a stated VAT rate. Every one of those removed for the
 * sake of elegance is a reason to buy removed with it.
 */
export function Footer() {
  return (
    <footer className="mt-18 border-t border-rule pt-11 pb-15">
      <div className="shell grid gap-9 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo href={null} className="mb-3.5" />
          <ul className="space-y-1.5 text-sm text-ink-2">
            {SHOWROOMS.map((showroom) => (
              <li key={`${showroom.city}-${showroom.district}`}>
                <strong className="font-semibold text-ink">{showroom.district}</strong>,{' '}
                {showroom.city}. {showroom.directions}
              </li>
            ))}
          </ul>
        </div>

        <FooterColumn title="Nous joindre">
          {PHONES.map((phone) => (
            <li key={phone} className="t-num">
              <a href={`tel:${phone.replace(/\s/g, '')}`} className="hover:text-ink">
                {phone}
              </a>
            </li>
          ))}
          <li>WhatsApp, du lundi au samedi</li>
        </FooterColumn>

        <FooterColumn title="Paiement">
          <li>Espèces au retrait</li>
          <li>Espèces à la livraison</li>
          <li>MTN Mobile Money</li>
          <li>Orange Money</li>
        </FooterColumn>

        <FooterColumn title="Entreprises">
          <li>Facture proforma</li>
          <li className="t-num">TVA {(VAT_RATE * 100).toFixed(2).replace('.', ',')} %</li>
          <li>Installation et maintenance</li>
        </FooterColumn>
      </div>
    </footer>
  )
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="t-label mb-3 text-ink-3">{title}</h2>
      <ul className="space-y-1.5 text-sm text-ink-2">{children}</ul>
    </div>
  )
}
