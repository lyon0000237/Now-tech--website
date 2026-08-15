import type { Metadata } from 'next'
import Link from 'next/link'

import { PageHeader } from '@/components/layout/PageHeader'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Action } from '@/components/ui/Action'
import { getServices, getUniverse } from '@/lib/catalog'
import { formatCount, formatPrice } from '@/lib/format'

export const metadata: Metadata = {
  // The tab in the green band says "Services", so the browser tab and the
  // search result say it too. The h1 below is the one that adds the boundary.
  title: 'Services',
  description:
    'Les prestations de l’atelier NowTech : installation et maintenance de vidéosurveillance, ' +
    'réseaux et téléphonie IP, contrôle d’accès, énergie solaire et backup électrique, ' +
    'à Douala et Yaoundé. Le matériel, lui, est au catalogue.',
}

/**
 * `/services`, the page that sells WORK rather than objects.
 *
 * THE COMPLAINT THIS PAGE ANSWERS. A reader clicked a link marked Services and
 * was shown printers, laptops, a drone and a power bank. They were not wrong,
 * and the shop was not lying: this page listed a WooCommerce term, and the term
 * is a bin. `Nos Services` carries 34 records. Nineteen of them are labour
 * lines. Fourteen are hardware that was filed there and never re-filed. One is
 * a record with no name, no price and no photograph at all.
 *
 * THE PAGE THEREFORE SPLITS THE TERM RATHER THAN PRINTING IT. The split is a
 * rule and not a hand-picked list, so it stays true when the export changes:
 * a record is a prestation when ITS OWN NAME OPENS BY NAMING ONE — service,
 * installation, maintenance, menuiserie, douane, énergie. That is the shop's
 * own naming habit, visible in nineteen consecutive rows, and it is a query a
 * reader could re-run by eye on `/rayon/services-occasion`. Everything else is
 * called what it is: matériel, disclosed at the foot of the page under a
 * heading that says so, with the counts and a way through to the department
 * where that matériel lives. Hidden it would look like an omission; printed
 * without a label it was the confusion itself.
 *
 * The nameless record is dropped. A row with no name is not a service the shop
 * declines to describe, it is a hole in the export.
 *
 * NOT ONE PRESTATION, PRICE OR LEAD TIME IS WRITTEN HERE. Every line below is
 * a record from the catalogue and every figure is its price. The one sentence
 * this page adds about how a job is costed — that it is quoted after a site
 * survey — is the sentence the on-site assistant already gives in
 * `constants/assistant.ts`, so the two cannot drift apart.
 *
 * Set as a price list rather than as a grid of cards. These have no photographs
 * worth showing, and what a buyer wants from a service is the scope and the
 * entry price on one line, which is a table's job.
 */

/**
 * A prestation declares itself in the first word of its own name.
 *
 * Anchored at the start on purpose. `kit GPS + installation` and
 * `Kit GPS Vehicule + Installation` both contain the word installation and are
 * both a box with a cable in it; a loose test would have sold them as labour.
 */
const PRESTATION = /^\s*(services?|installations?|maintenance|menuiserie|douane|[eé]nergie)\b/i

/**
 * Both lists run cheapest first, which is the one ordering a reader can check.
 *
 * `getServices` sorts by a narrower version of the test above and then by
 * price, so a row it did not recognise fell to the bottom whatever it cost:
 * the menuiserie line at 5 000 FCFA printed after the automotive one at
 * 100 000. Sorting again here is not a second opinion about what a service is,
 * it is the same list with the ranking key removed.
 */
const byPrice = (a: { price: number }, b: { price: number }) => a.price - b.price

export default function ServicesPage() {
  const rows = getServices().filter((row) => row.name.trim().length > 0)
  const prestations = rows.filter((row) => PRESTATION.test(row.name)).sort(byPrice)
  const material = rows.filter((row) => !PRESTATION.test(row.name)).sort(byPrice)
  const rayon = getUniverse('services')

  return (
    <>
      <PageHeader
        title="Services : ce que fait l’atelier"
        lead="L’atelier installe et configure ce qu’il vend : vidéosurveillance, réseau, contrôle d’accès, onduleurs et solaire. Les équipes interviennent sur site à Douala et à Yaoundé. Une prestation se chiffre après un relevé sur site : les montants ci-dessous sont des prix d’entrée, pas un devis."
        aside={formatCount(prestations.length, 'prestation')}
      />

      <section className="shell">
        {/* The one thing a reader can do about a prestation. There is no
            add-to-basket for a technician's morning: the assistant already
            tells them the job is priced after a site survey, so the button
            asks for the survey and nothing else. */}
        <Action href="/contact">Demander un relevé sur site</Action>

        <ul className="mt-stack border-t border-rule">
          {prestations.map((prestation) => (
            <li key={prestation.id}>
              <Link
                href={`/produit/${prestation.slug}`}
                className="group flex flex-wrap items-baseline justify-between gap-x-10 gap-y-1 border-b border-rule py-6 transition-colors duration-[var(--t-fast)] hover:bg-space"
              >
                <span className="max-w-[62ch] text-body group-hover:text-accent">
                  {prestation.name}
                </span>
                <span className="t-num shrink-0 text-small text-ink-2">
                  à partir de{' '}
                  <b className="font-semibold text-ink">{formatPrice(prestation.price)}</b>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* The boundary, stated rather than implied.
          Two things share one word in this shop and they are not the same
          trade: this page bills a technician's time, the department sells a
          machine you carry away. The reader who came here for the second one
          gets told where it is instead of being left to wonder why a laptop is
          on a services page. */}
      {material.length > 0 ? (
        <section className="shell mt-band">
          <SectionHeader
            title="Du matériel, classé sous le même mot"
            context={`Le fournisseur a rangé ${formatCount(rows.length, 'référence')} sous le terme « Nos Services » : ${formatCount(prestations.length, 'prestation')}, ci-dessus, et ${formatCount(material.length, 'pièce')} de matériel, ci-dessous. Ce ne sont pas deux façons de dire la même chose. Une prestation, c’est du travail sur site, chiffré après un relevé. Le matériel s’achète, se retire au comptoir ou se fait livrer, et il se compare en rayon${rayon ? `, dans les ${formatCount(rayon.totalCount, 'référence')} de Services & Occasion` : ''}, avec le reconditionné.`}
            aside={
              <Action href="/rayon/services-occasion" variant="secondary">
                Voir le rayon Services &amp; Occasion
              </Action>
            }
          />

          <ul className="grid gap-x-12 sm:grid-cols-2">
            {material.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/produit/${item.slug}`}
                  className="group flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1 border-b border-rule py-4 transition-colors duration-[var(--t-fast)] hover:bg-space"
                >
                  <span className="clamp-2 max-w-[42ch] text-small text-ink-2 group-hover:text-accent">
                    {item.name}
                  </span>
                  {/* One record in this bin carries no price at all. `0 FCFA`
                      would be a claim the shop never made, so the column stays
                      empty and the product sheet answers. */}
                  {item.price > 0 ? (
                    <span className="t-num shrink-0 text-small font-semibold">
                      {formatPrice(item.price)}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}
