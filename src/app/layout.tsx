import type { Metadata } from 'next'
import { IBM_Plex_Mono, Poppins } from 'next/font/google'

import './globals.css'
import { Assistant } from '@/components/assistant/Assistant'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { CartDrawer } from '@/components/layout/CartDrawer'
import { Reveal } from '@/components/ui/Reveal'
import { CartProvider } from '@/lib/cart'
import { SITE } from '@/constants/site'

/**
 * Poppins carries the text and the display sizes.
 *
 * It is the face of the reference the storefront was drawn from, identified off
 * the mockup rather than guessed: single-storey `a`, perfectly circular bowls on
 * `o`, `p` and `d`, monolinear strokes, a flat-barred `G`. That is a geometric
 * sans, and among the geometric sans on Google Fonts it is the one this family
 * of commercial templates uses.
 *
 * It changes the register on purpose. Archivo was a grotesque: neutral, tight,
 * engineering. Poppins is round and open, which is warmer and reads younger, and
 * it is what the brief asked for. Two consequences are handled rather than
 * fought: its x-height is large, so the fine end of the scale looks a step
 * bigger than the same numbers in Archivo did, and it sets wide, so measures in
 * `ch` come out shorter in characters than they did.
 *
 * Weights are the three the site actually asks for. `font-extrabold` appears
 * twice; 800 is loaded for it rather than letting the browser fake it, since
 * the body sets `font-synthesis-weight: none`.
 *
 * IBM Plex Mono carries every numeral the customer compares: price, port count,
 * VA rating, reference. Tabular figures are what let a column running from
 * 1 000 to 11 800 000 FCFA stay legible as a column.
 *
 * 400 and 700, not 400 and 500. Prices ask for `font-bold`, the body sets
 * `font-synthesis-weight: none` so nothing is faked, and 500 was the heaviest
 * weight in the file: every price on the site rendered at Medium while claiming
 * to be bold. Nothing asks for 500, so it is dropped rather than added to.
 */
const poppins = Poppins({
  // `subsets` governs preloading, not what the stylesheet contains: the
  // latin-ext faces stay declared with their own unicode-range and load on
  // demand. French needs none of them, and preloading both halves cost 50 380
  // bytes of the 105 432 the page spends on type before it can paint.
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: `${SITE.name}, matériel informatique, réseau, sécurité et énergie au Cameroun`,
    template: `%s · ${SITE.name}`,
  },
  description:
    'Distributeur d’équipement informatique, réseau, vidéosurveillance et énergie à Douala et Yaoundé. ' +
    'Plus de 4 000 références en stock, garanties, avec retrait le jour même.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${poppins.variable} ${plexMono.variable}`}>
      <body>
        {/* The provider wraps the document rather than a subtree: the counter
            lives in the masthead, the drawer at the root, and the controls that
            fill it are inside the page. Nothing below is a client component
            because of this; the provider is the only one, and it renders its
            children through. */}
        <CartProvider>
          <Header />
          <main>{children}</main>
          <Footer />
          <CartDrawer />
        </CartProvider>
        <Assistant />
        <Reveal />
      </body>
    </html>
  )
}
