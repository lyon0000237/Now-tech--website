import type { Metadata } from 'next'
import { Archivo, IBM_Plex_Mono } from 'next/font/google'

import './globals.css'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { Reveal } from '@/components/ui/Reveal'
import { SITE } from '@/constants/site'

/**
 * Archivo carries the text and the display sizes. It is a grotesque with real
 * display weights and full French diacritic coverage, and it is not Inter,
 * which every generated storefront reaches for by default.
 *
 * IBM Plex Mono carries every numeral the customer compares: price, port count,
 * VA rating, reference. Tabular figures are what let a column running from
 * 1 000 to 11 800 000 FCFA stay legible as a column.
 */
const archivo = Archivo({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-archivo',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} — Matériel informatique, réseau, sécurité et énergie au Cameroun`,
    template: `%s — ${SITE.name}`,
  },
  description:
    'Distributeur d’équipement informatique, réseau, vidéosurveillance et énergie à Douala et Yaoundé. ' +
    'Plus de 4 000 références en stock, garanties, avec retrait le jour même.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${archivo.variable} ${plexMono.variable}`}>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
        <Reveal />
      </body>
    </html>
  )
}
