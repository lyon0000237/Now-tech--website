import type { Metadata } from 'next'
import Link from 'next/link'

import { IconPhone } from '@/components/brand/Icons'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Action } from '@/components/ui/Action'
import { PHONES, PICKUP_LINE, WHATSAPP, dialable } from '@/constants/site'
import { TRADES, isPrestation, readable, tradeOf } from '@/constants/services'
import { getCategoryBySlug, getServices, getUniverse } from '@/lib/catalog'
import type { ProductSummary } from '@/types/summary'
import { formatCount, formatPrice } from '@/lib/format'

export const metadata: Metadata = {
  // The tab in the green band says "Services", so the browser tab and the
  // search result say it too. The h1 below is the one that draws the boundary.
  title: 'Services',
  description:
    'Les prestations de l’atelier NowTech : vidéosurveillance, réseau, contrôle d’accès, ' +
    'onduleurs et solaire. Une prestation se chiffre après un relevé sur site, elle ne se ' +
    'met pas au panier. Le matériel, lui, est au catalogue.',
}

/**
 * `/services`, the page that sells WORK, and the one page on this site with no
 * way into the basket.
 *
 * THE COMPLAINT THIS REWRITE ANSWERS, in the shop owner's own words: "on ne peut
 * pas avoir le même détaillé des produits aux services, le panier sert à ce
 * moment à quoi, je ne comprends plus". He is right, and the fault was ours.
 * This page used to print nineteen prestations as a price list in which EVERY
 * ROW LINKED TO `/produit/<slug>`, and a product sheet carries an Ajouter au
 * panier button. So the site said, in the same breath, that an installation of
 * fire detectors is quoted after a site survey and that you may put it in a
 * basket for 45 000 FCFA. Then it printed fourteen laptops, printers and a drone
 * underneath. Nobody can hold that shape in their head, and a customer who
 * cannot tell what the basket is for stops using it for the things it IS for.
 *
 * THE FIX IS A CUT, NOT A LAYOUT. Not one link on this page reaches a product
 * sheet. A prestation row opens WhatsApp with the request already written,
 * because a site survey is arranged by a human and always was: the product
 * sheets for these nineteen records still exist and are still reachable from
 * `/rayon/services-occasion` and from search, which is where a record that has a
 * basket button belongs.
 *
 * THE SECOND CUT IS THE FOURTEEN PIECES OF HARDWARE. They are gone from the
 * page as a list and stated as a fact, with the count and the way through to the
 * department. Printed as rows they were the confusion itself; deleted in silence
 * they would look like an omission, and four of them are not even in the Services
 * & Occasion department: they are filed under GPS Tracker, Imprimantes EPSON and
 * Laptop HP, so "go and see them next door" had to become "go and see the
 * department, and search for the rest".
 *
 * NOT ONE PRESTATION, RATE, DELAY OR GUARANTEE IS INVENTED HERE. Every row is a
 * record from the export and every figure is that record's own price. The
 * sentences this page adds are each already asserted elsewhere in this repository
 * and are quoted rather than rewritten, so they cannot drift:
 *   - what the workshop installs, and that a prestation is quoted after a site
 *     survey: `constants/assistant.ts`, the `installation` topic, which is also
 *     what Bod answers on every page of this site;
 *   - that a list of material comes back as a facture proforma: the same file,
 *     the `devis` topic, and `/devis` itself;
 *   - that nothing is paid online: `constants/site.ts`, `PAYMENT_METHODS`, whose
 *     five entries are cash, two mobile-money wallets and a bank transfer;
 *   - where the counters are: the same file, `PICKUP_LINE`, printed verbatim
 *     rather than retyped, exactly as the utility strip and the service band do;
 *   - that WhatsApp is where this shop is reached: the same file, and the
 *     showroom band on the homepage.
 * No lead time appears anywhere below. The record names carry the supplier's own
 * "Express" and "Rapide"; the page never turns those into a promise of its own.
 *
 * TWO CLAIMS WERE CUT FROM THIS PAGE FOR HAVING NO SOURCE AT ALL, and both read
 * as harmless until you look for the file that backs them:
 *   - "les équipes interviennent sur site à Douala et à Yaoundé", in the lead and
 *     in the meta description. Nothing in this repository says where a technician
 *     travels. `SHOWROOMS` says where the three counters ARE and `DELIVERY_CITIES`
 *     says where a parcel goes; neither is a service area, and inventing one on a
 *     page whose whole point is that it does not invent is the worst place to do
 *     it. The counters are stated instead, from `PICKUP_LINE`, which is true.
 *   - "le prix dépend du nombre de points, des distances et de l'état de
 *     l'existant". Plausible, unsourced, and a price list in disguise: it tells a
 *     reader that distance is billed. `assistant.ts` says only that the prestation
 *     is quoted after a site survey, so that is all this page says.
 *
 * The nameless record is dropped. A row with no name is not a service the shop
 * declines to describe, it is a hole in the export.
 */

/** The one message this page sends, wherever it is sent from. */
function surveyHref(subject?: string): string {
  const message = subject
    ? `Bonjour, je voudrais un relevé sur site pour : ${readable(subject)}`
    : 'Bonjour, je voudrais un relevé sur site pour une installation.'
  return `https://wa.me/${dialable(WHATSAPP)}?text=${encodeURIComponent(message)}`
}

/**
 * Cheapest first inside every trade, which is the one ordering a reader can
 * check against the department without trusting us.
 *
 * `getServices` sorts by a narrower version of the prestation test and then by
 * price, so a row it did not recognise fell to the bottom whatever it cost: the
 * menuiserie line at 5 000 FCFA printed after the automotive one at 100 000.
 * Sorting again here is not a second opinion about what a service is, it is the
 * same list with the ranking key removed.
 */
const byPrice = (a: ProductSummary, b: ProductSummary) => a.price - b.price

/** "les traceurs GPS, les imprimantes EPSON et les portables HP", in French. */
const listFrench = new Intl.ListFormat('fr-FR', { style: 'long', type: 'conjunction' })

export default function ServicesPage() {
  const rows = getServices().filter((row) => row.name.trim().length > 0)
  const prestations = rows.filter((row) => isPrestation(row.name))
  const material = rows.filter((row) => !isPrestation(row.name))
  const rayon = getUniverse('services')

  /**
   * THE FAMILIES THAT CARRY THE SUPPLIER'S TERM WITHOUT LIVING UNDER IT, READ
   * OFF THE RECORDS RATHER THAN TYPED OUT.
   *
   * Four of the fourteen pieces of hardware are filed elsewhere as their primary
   * category: GPS Tracker, Imprimantes EPSON, Laptop HP. This page used to name
   * those three in prose, which was true on the day it was written and is a
   * claim about somebody else's data every day after. `categoryName` on the
   * summary IS the primary category, so the sentence now rebuilds itself: a
   * re-export that refiles a record changes the sentence, and one that refiles
   * all of them deletes it.
   *
   * The term's own name comes from the catalogue and not from a literal, so the
   * comparison cannot start matching everything the day someone renames it.
   */
  const termName = getCategoryBySlug('nos-services')?.name ?? null
  const elsewhere = [...new Set(material.map((row) => row.categoryName))]
    .filter((name) => name !== termName)
    .sort((a, b) => a.localeCompare(b, 'fr'))

  // A heading is drawn only when records fell under it. Five trades is the rule,
  // never the promise: if the export stops carrying camera work, the camera
  // heading stops being printed rather than standing over an empty column.
  const groups = TRADES.map((trade) => ({
    trade,
    rows: prestations.filter((row) => tradeOf(row.name).id === trade.id).sort(byPrice),
  })).filter((group) => group.rows.length > 0)

  return (
    <>
      <PageHeader
        title="Ce que fait l’atelier"
        lead="L’atelier installe et configure ce qu’il vend : vidéosurveillance, réseau, contrôle d’accès, onduleurs et solaire. Cette page ne vend rien : une prestation se chiffre après un relevé sur site, elle ne se met pas au panier. Le panier, lui, sert au matériel."
        aside={prestations.length > 0 ? formatCount(prestations.length, 'prestation') : undefined}
      />

      {/* THE BUY BOX OF A PAGE THAT DOES NOT SELL. It sits where a product sheet
          puts its basket button, on purpose: the reader arriving from a tab
          marked Services is looking for the control that starts things, and
          finding a telephone number there instead of a basket is the whole
          answer to "le panier sert à quoi". The dark rail is the same block the
          homepage already uses to hand over a number. */}
      <section className="shell">
        <div className="on-rail enter rounded-space bg-rail p-6 text-rail-ink sm:p-10 lg:p-12">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
            <div>
              <h2 className="text-sub font-semibold leading-[1.2] tracking-[-0.02em] text-balance">
                Une prestation ne se met pas au panier
              </h2>
              <p className="e-text mt-4 max-w-[54ch] text-small leading-[1.65] text-pretty text-rail-ink-2">
                Vous décrivez le besoin, un technicien passe, le comptoir renvoie une facture
                proforma. Le chiffre vient de ce relevé et de rien d’autre : un chantier ne se
                devine pas depuis un écran. Rien ne se paie en ligne, ici pas plus qu’ailleurs
                sur ce site.
              </p>

              {/* THE OTHER HALF OF "COMMENT JE VOUS FAIS VENIR" IS QUE JE PASSE
                  VOUS VOIR, and this page was the only one of the three that
                  hands over a number without saying where the number sits. The
                  line is `PICKUP_LINE` itself, not a retyping of it: the utility
                  strip and the service band had each formatted their own version
                  of these three districts and had already drifted apart once. */}
              <p className="mt-4 text-small leading-[1.65] text-rail-ink-2">
                Trois comptoirs, si vous préférez passer : {PICKUP_LINE}.
              </p>
            </div>

            {/* Two ways to start, and the second is not a fallback: in this
                market the number is dialled at least as often as the message is
                written. Both take a 44px line box below sm, where they are the
                only controls on the screen. */}
            <div className="flex flex-col gap-6 lg:items-start">
              {/* `on-rail` and not the default: --accent on the green band is
                  1.34:1, which is not a button, it is a rumour. The variant
                  inverts the roles, white ground and rail-coloured label.

                  TARGET AND REL, BECAUSE `Action` RENDERS A BARE `next/link` AND
                  ADDS NEITHER. The nineteen rows below already open WhatsApp in
                  a new tab; this control, the biggest one on the page, was
                  taking the whole tab with it, so the primary action was the one
                  that lost the reader his place. `/recherche` passes the same
                  two props to the same component for the same absolute wa.me
                  URL, and this is now the same control everywhere. */}
              <Action href={surveyHref()} variant="on-rail" target="_blank" rel="noopener noreferrer">
                Demander un relevé sur site
              </Action>

              <ul className="flex flex-wrap gap-x-8 gap-y-2">
                {PHONES.map((phone) => (
                  <li key={phone}>
                    <a
                      href={`tel:${dialable(phone)}`}
                      className="t-num flex min-h-11 items-center gap-2.5 text-small text-rail-ink-2 transition-colors duration-[var(--t-fast)] hover:text-rail-ink sm:min-h-0"
                    >
                      <IconPhone className="text-[1rem]" />
                      {phone}
                    </a>
                  </li>
                ))}
              </ul>

              <p className="max-w-[42ch] text-small leading-[1.6] text-rail-ink-2">
                Une liste de matériel à chiffrer, elle, se prépare ici et repart en proforma :{' '}
                {/* A drawn underline only appears on hover, and this link sits
                    on a band a thumb never hovers. It carries a real one. */}
                <Link
                  href="/devis"
                  className="font-semibold text-rail-ink underline underline-offset-4 transition-colors duration-[var(--t-fast)] hover:text-rail-ink-2"
                >
                  ouvrir un devis
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      {groups.length > 0 ? (
        <section className="shell mt-band">
          <SectionHeader
            title="Les métiers de l’atelier"
            context={`${formatCount(prestations.length, 'ligne')} de prestation, telles que l’atelier les a déclarées, regroupées par métier d’après leur propre libellé. Le montant est le prix d’entrée porté par la fiche, pas un devis. Chaque ligne ouvre WhatsApp avec la demande déjà écrite.`}
          />

          {/* Two columns from lg only. The measure of a row is its name, and
              these names run to 80 characters: split earlier, half of them wrap
              to three lines and the price column stops being a column. */}
          <div className="grid gap-x-16 gap-y-12 lg:grid-cols-2">
            {groups.map((group, index) => (
              <section
                key={group.trade.id}
                style={{ '--enter-index': index } as React.CSSProperties}
                className="enter e-item"
              >
                <h3 className="flex items-baseline justify-between gap-4 border-b border-rule pb-3">
                  <span className="t-label text-accent">{group.trade.label}</span>
                  <span className="t-num shrink-0 text-micro text-ink-3">
                    {formatCount(group.rows.length, 'ligne')}
                  </span>
                </h3>

                <ul>
                  {group.rows.map((row) => (
                    <li key={row.id}>
                      <a
                        href={surveyHref(row.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex min-h-11 flex-wrap items-baseline justify-between gap-x-8 gap-y-1 border-b border-rule py-4 transition-colors duration-[var(--t-fast)] hover:bg-space"
                      >
                        <span className="max-w-[46ch] text-small leading-[1.5] text-pretty group-hover:text-accent">
                          {readable(row.name)}
                        </span>
                        {/* THE PRICE AND THE HANDSET TAKE THE WHOLE LINE BELOW
                            `sm`, AND THAT IS NOT A MARGIN DECISION. At 390 the
                            name eats the row and this pair wraps under it, where
                            `justify-between` on the row above has nothing left
                            to push apart: the handset ended up eleven pixels
                            after the last F of FCFA, reading as part of the
                            price rather than as the row's own control. Full
                            width, it returns to the right edge under the name,
                            which is where the eye already goes for it. From `sm`
                            the pair is `w-auto` again and nothing moves. */}
                        <span className="flex w-full shrink-0 items-center justify-between gap-3 text-ink-3 sm:w-auto sm:justify-end">
                          <span className="t-num text-small">
                            dès <b className="font-semibold text-ink-2">{formatPrice(row.price)}</b>
                          </span>
                          {/* The affordance a phone cannot hover to find. The
                              handset is what this shop already draws for a
                              WhatsApp link, on the product sheet and in the
                              footer alike. */}
                          <IconPhone
                            aria-hidden
                            className="text-[1rem] transition-colors duration-[var(--t-fast)] group-hover:text-accent"
                          />
                          {/* NOT AN `aria-label` ON THE ROW. A label on the
                              anchor replaces everything inside it, and the
                              price is inside it: a screen reader would have
                              been told the trade and never the figure. Appended
                              instead, so the accessible name is the name, the
                              price, and then what pressing it does. */}
                          <span className="sr-only">
                            Demander un relevé sur site, sur WhatsApp
                          </span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
      ) : (
        // The export could stop carrying the term tomorrow, and this page would
        // still have to answer the question it exists for. The rail above is the
        // answer; this is the sentence that stops the page ending on a blank.
        <section className="shell mt-band">
          <p className="max-w-[62ch] text-lead leading-[1.55] text-ink-2">
            Le détail des prestations n’est pas consultable en ligne pour le moment. Le comptoir
            répond sur WhatsApp et au téléphone, et le relevé sur site reste la première étape.
          </p>
        </section>
      )}

      {/* THE BOUNDARY, STATED RATHER THAN IMPLIED, AND STATED WITHOUT PRINTING
          THE LIST. Two things share one word in this shop and they are not the
          same trade: this page bills a technician's time, the department sells a
          machine you carry away. A reader who came for the second one is told
          where it is instead of being left to wonder why a laptop is on a
          services page, and the department is where the basket button lives. */}
      {material.length > 0 ? (
        <section className="shell mt-band">
          <SectionHeader
            title="Du matériel porte le même mot"
            /* THE OPENING CLAUSE COUNTS BOTH SIDES, SO IT HAS TO SURVIVE ONE OF
               THEM BEING EMPTY. Written flat it read "le fournisseur a rangé deux
               choses : les 0 prestation ci-dessus, et 14 pièces de matériel",
               pointing at nothing above it, on the one export where this page
               matters most: the one where the term has stopped carrying labour
               and is now a hardware bin with a misleading name. */
            context={`${
              prestations.length > 0
                ? `Sous le terme « ${termName ?? 'Nos Services'} », le fournisseur a rangé deux choses : les ${formatCount(prestations.length, 'prestation')} ci-dessus, et ${formatCount(material.length, 'pièce')} de matériel`
                : `Sous le terme « ${termName ?? 'Nos Services'} », le fournisseur a aussi rangé ${formatCount(material.length, 'pièce')} de matériel`
            }. Ce n’est pas la même chose. Du matériel a un prix ferme, se met au panier, se retire au comptoir ou se fait livrer. Une prestation, non. Le matériel se compare en rayon${rayon ? `, avec l’occasion, dans les ${formatCount(rayon.totalCount, 'référence')} de ${rayon.name}` : ''}.`}
            aside={
              <Action href="/rayon/services-occasion" variant="secondary">
                Voir le rayon Services &amp; Occasion
              </Action>
            }
          />

          <p className="max-w-[62ch] text-small leading-[1.65] text-ink-2">
            {elsewhere.length > 0
              ? `Quelques-unes de ces pièces sont classées ailleurs, sous leur vraie famille : ${listFrench.format(elsewhere)}. Le plus court pour les retrouver reste la recherche, par référence ou par modèle.`
              : 'Le plus court pour retrouver une de ces pièces reste la recherche, par référence ou par modèle.'}
          </p>
          {/* 19.5 pixels tall on a telephone, measured, and it is the last
              control on the page. `min-h-11` gives it a thumb below `sm` and
              `sm:min-h-0` gives the desktop its own height back, which is the
              same treatment the showroom band's closing link already takes. */}
          <p className="mt-3 sm:mt-5">
            <Link
              href="/catalogue"
              className="draw-under inline-flex min-h-11 items-center text-small font-semibold text-accent hover:text-accent-ink sm:min-h-0"
            >
              Parcourir tout le catalogue
            </Link>
          </p>
        </section>
      ) : null}
    </>
  )
}
