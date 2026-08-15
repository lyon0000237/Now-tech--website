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
 *
 * THE TWO NUMBERS WERE 25.5 PIXELS TALL ON A TELEPHONE. Measured at 360: each
 * `tel:` link drew 306 by 25.5 with 16px of margin between them. This is the
 * page whose entire job is to be called from, on a market where the sale
 * closes on WhatsApp, and its two most important controls were half the height
 * a thumb needs and close enough together to mis-hit. `min-h-11` takes each to
 * 44 below `sm` without moving a single glyph, and `sm:min-h-0` gives the
 * desktop back its 25.5.
 *
 * THE FOUR SERVICE FACTS WERE A TUNNEL AND A BROKEN RULE. The strip is one
 * column below `sm`, four columns at `lg`, and it carried `py-11` and `pr-10`
 * at every width: 88 pixels of padding around two lines of text, four times
 * over, and 40 pixels of dead margin down the right of a 306px screen. Worse,
 * the top rule was drawn on cells 2 and 3 only, which is correct in two columns
 * and nonsense in one: stacked, the reader saw no line between `Retrait` and
 * `Livraison` and a line under everything after it. Below `sm` every cell after
 * the first now carries the rule, cell 1 drops it again at `sm` where the two
 * columns come back, and `lg` is untouched. 128 pixels of the tunnel go with
 * it.
 *
 * ONE GAP SERVED TWO AXES AND ONLY ONE OF THEM EXISTS ON A TELEPHONE. The two
 * blocks, the numbers and the counters, sit side by side from `lg` and are
 * stacked everywhere below it, and `gap-y-14` measured 56 pixels at 360 exactly
 * as it did at 1440. On a wide page that number is spent horizontally and the
 * row gap costs nothing; stacked, it is 56 pixels of white between the one
 * thing this page is for, the two numbers, and the addresses under them. 40
 * below `lg`, which is where the columns actually part, and 56 from `lg` up.
 * The column gap is untouched, and the grid at 1440 measures 584 + 584 with 56
 * between, before and after.
 */
export default function ContactPage() {
  return (
    <>
      <PageHeader
        title="Nous joindre"
        lead="Le plus rapide reste le téléphone ou WhatsApp : les conseillers ont le stock atelier sous les yeux, y compris ce qui n’est pas encore en ligne."
      />

      <div className="shell grid gap-x-14 gap-y-10 lg:grid-cols-[1fr_1fr] lg:gap-y-14">
        <section>
          <h2 className="t-label mb-6 text-ink-3">Par téléphone</h2>
          <ul className="space-y-4">
            {PHONES.map((phone) => (
              <li key={phone}>
                <a
                  href={`tel:${phone.replace(/\s/g, '')}`}
                  className="flex min-h-11 items-center gap-4 text-lead transition-colors duration-[var(--t-fast)] hover:text-accent sm:min-h-0"
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
              className={`py-7 sm:py-11 sm:pr-10 ${
                index > 0 ? 'lg:border-l lg:border-rule lg:pl-10' : ''
              } ${index % 2 === 1 ? 'sm:border-l sm:border-rule sm:pl-10' : ''} ${
                index > 0
                  ? `border-t border-rule lg:border-t-0 ${index === 1 ? 'sm:border-t-0' : ''}`
                  : ''
              }`}
            >
              <dt className="mb-1 text-body font-semibold">{point.title}</dt>
              <dd className="text-small text-ink-2">{point.detail}</dd>
            </div>
          ))}
        </dl>
        {/* The space before the per-cent sign is a no-break space, which is
            what French typography asks for and what stops the line breaking
            between `19,25` and `%.` It did break, at 360: the whole sentence is
            320 pixels of 13px mono in a 306px column, so the phone was left
            with `%.` alone on a second line. */}
        <p className="t-num mt-6 text-small text-ink-3">
          Facture proforma sur demande.{' '}
          {`TVA ${(VAT_RATE * 100).toFixed(2).replace('.', ',')} %.`}
        </p>
      </div>
    </>
  )
}
