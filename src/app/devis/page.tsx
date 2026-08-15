import type { Metadata } from 'next'

import { Devis } from '@/components/devis/Devis'
import { PageHeader } from '@/components/layout/PageHeader'

/**
 * `/devis`, the page that stands where a checkout would.
 *
 * SIX SURFACES ALREADY POINT HERE and every one of them promises something
 * slightly different: the basket drawer says "Demander la proforma", the counter
 * strip says "Devis entreprise", the footer says "Facture proforma", the
 * homepage tile says "Demander un devis", the account menu says "Mon devis", and
 * the assistant says "Ouvrir un devis". They are all the same object, and the
 * lead below is written to be a true answer to all six at once: this shop takes
 * no money online, so the list of material IS the end of the journey.
 *
 * NOT INDEXED, AND THAT IS NOT A DETAIL. A quote is one browser's basket: the
 * page is different for every reader, identical and empty for every crawler, and
 * a search result promising a customer their own quote leads to a blank screen.
 * `follow` stays on, because the links out of the empty state into the catalogue
 * are worth crawling.
 *
 * The header is a server component and holds still. The count belongs to the
 * list below it rather than to the title: the basket only resolves after
 * hydration, and a page title that changes size a beat after it is read is worse
 * than a title that never carried the number.
 */
export const metadata: Metadata = {
  title: 'Votre devis',
  description:
    'Constituez votre liste de matériel, relevez la base HT, la TVA et le total TTC, ' +
    'puis envoyez-la au comptoir sur WhatsApp pour recevoir une facture proforma.',
  robots: { index: false, follow: true },
}

export default function DevisPage() {
  return (
    <>
      <PageHeader
        title="Votre devis"
        lead="Rien ne se paie en ligne chez NowTech Center, et ce site n’envoie rien tout seul. Vous constituez ici la liste du matériel, vous l’ouvrez dans WhatsApp ou vous appelez le comptoir, et le comptoir vous renvoie une facture proforma avec les prix confirmés, les délais et la TVA."
      />
      <Devis />
    </>
  )
}
