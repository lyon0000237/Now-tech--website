import type { Metadata } from 'next'
import { IBM_Plex_Mono, Poppins } from 'next/font/google'

import './globals.css'
import { AuthDialog } from '@/components/account/AuthDialog'
import { Assistant } from '@/components/assistant/Assistant'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { CartDrawer } from '@/components/layout/CartDrawer'
import { Reveal } from '@/components/ui/Reveal'
import { AccountProvider } from '@/lib/account'
import { CartProvider } from '@/lib/cart'
import { getMeta } from '@/lib/catalog'
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
        {/* Both providers wrap the document rather than a subtree: the masthead
            reads them, the drawer and the dialog render at the root, and the
            controls that fill them are inside the page. Nothing below is a
            client component because of this; the providers are, and they render
            their children through.

            The account wraps the basket because the account names whoever the
            basket belongs to, and because its dialog is the one surface allowed
            to cover the drawer. The reference count is read here rather than
            inside the dialog: `lib/catalog` is `server-only`, so a client
            component cannot ask it anything. */}
        <AccountProvider>
          <CartProvider>
            <Header />
            {/* THE LAST SECTION OF EVERY PAGE STOPS SHORT OF THE FOOTER, AND IT HAD
            TO BE SAID HERE RATHER THAN ON EACH PAGE. Measured on seven routes:
            the gap between a page's last element and the footer was 0 pixels
            everywhere, so the closing band of a page and the green rail beneath
            it read as one object. Setting it on `main` means a page written
            tomorrow inherits it without its author having to remember; setting
            it per page means seven chances to forget and one more each time a
            route is added.

            A band, not a margin: the footer is a different surface, not the next
            section, and the page's own rhythm is what says so. */}
        <main className="pb-band">{children}</main>
            <Footer />
            <CartDrawer />
          </CartProvider>
          <AuthDialog referenceCount={getMeta().productCount} />
        </AccountProvider>
        <Assistant />
        <Reveal />
      </body>
    </html>
  )
}
