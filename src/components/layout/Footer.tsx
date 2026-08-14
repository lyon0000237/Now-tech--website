import Link from 'next/link'
import type { ReactNode } from 'react'

import { IconPhone } from '@/components/brand/Icons'
import { Logo } from '@/components/brand/Logo'
import { getUniverses } from '@/lib/catalog'
import { PAYMENT_METHODS, PHONES, SHOWROOMS, VAT_RATE, WHATSAPP, dialable } from '@/constants/site'

/**
 * The footer.
 *
 * Deliberately dense, and on the same dark ground as the department bar so the
 * two of them close the page top and bottom. The blocker in this market is not
 * boredom, it is the fear of sending money to a website that does not exist in
 * the physical world, and trust is carried by the density of verifiable proof:
 * street addresses, +237 numbers that dial, named payment methods, a stated VAT
 * rate. Every one of those removed for the sake of elegance is a reason to buy
 * removed with it.
 *
 * It is also the site's secondary navigation. The masthead carries only what is
 * used on every page; everything else belongs down here, where a reader who got
 * to the bottom is already looking for it. The departments are repeated in full
 * because this is the only place on a product page, three levels deep, where the
 * whole shop is visible again.
 */
const SHOP_LINKS = [
  { href: '/a-propos', label: 'La maison' },
  { href: '/services', label: 'Installation et maintenance' },
  { href: '/catalogue', label: 'Index du catalogue' },
  { href: '/marques', label: 'Marques distribuées' },
  { href: '/contact', label: 'Nous joindre' },
] as const

const ORDER_LINKS = [
  { href: '/services', label: 'Retrait le jour même' },
  { href: '/services', label: 'Livraison 24 à 48 h' },
  { href: '/devis', label: 'Facture proforma' },
  { href: '/contact', label: 'Garantie et retours' },
] as const

export function Footer() {
  const universes = getUniverses()

  return (
    <footer className="on-rail mt-band bg-rail pt-20 pb-10 text-rail-ink">
      <div className="shell grid gap-x-14 gap-y-14 md:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr]">
        <div>
          <Logo href={null} tone="rail" />
          <p className="mt-6 max-w-[38ch] text-small leading-[1.65] text-pretty text-rail-ink-2">
            Distributeur d’équipement informatique, réseau, vidéosurveillance et énergie au
            Cameroun. Vente aux particuliers, aux entreprises et aux installateurs.
          </p>

          <ul className="mt-8 space-y-3 text-small">
            {PHONES.map((phone) => (
              <li key={phone}>
                <a
                  href={`tel:${dialable(phone)}`}
                  className="t-num flex items-center gap-2.5 text-rail-ink-2 transition-colors duration-[var(--t-fast)] hover:text-rail-ink"
                >
                  <IconPhone className="text-[1rem]" />
                  {phone}
                </a>
              </li>
            ))}
            <li>
              <a
                href={`https://wa.me/${dialable(WHATSAPP)}`}
                className="font-semibold text-rail-accent transition-colors duration-[var(--t-fast)] hover:text-rail-ink"
              >
                WhatsApp
              </a>
            </li>
          </ul>
        </div>

        {/* Twelve in one column is a 500-pixel spike next to three columns of
            five. Two of six keeps the block square and the footer level. */}
        <FooterColumn title="Rayons" listClassName="grid grid-cols-2 gap-x-6 gap-y-2.5">
          {universes.map((universe) => (
            <li key={universe.id}>
              <FooterLink href={`/rayon/${universe.slug}`}>{universe.shortName}</FooterLink>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title="Le magasin">
          {SHOP_LINKS.map((link) => (
            <li key={link.label}>
              <FooterLink href={link.href}>{link.label}</FooterLink>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title="Commande">
          {ORDER_LINKS.map((link) => (
            <li key={link.label}>
              <FooterLink href={link.href}>{link.label}</FooterLink>
            </li>
          ))}
          <li className="t-num pt-1 text-rail-ink-2">
            {`TVA ${(VAT_RATE * 100).toFixed(2).replace('.', ',')} %`}
          </li>
        </FooterColumn>
      </div>

      <div className="shell mt-16 grid gap-x-12 gap-y-5 border-t border-rail-rule pt-7 text-micro text-rail-ink-2 lg:grid-cols-[1fr_1fr_auto]">
        <ul className="flex flex-wrap gap-x-5 gap-y-1">
          {SHOWROOMS.map((showroom) => (
            <li key={`${showroom.city}-${showroom.district}`}>
              {showroom.district}, {showroom.city}
            </li>
          ))}
        </ul>
        <ul className="flex flex-wrap gap-x-5 gap-y-1">
          {PAYMENT_METHODS.map((method) => (
            <li key={method}>{method}</li>
          ))}
        </ul>
        <p className="lg:text-right">© NowTech Center, Cameroun</p>
      </div>
    </footer>
  )
}

function FooterColumn({
  title,
  children,
  listClassName = 'space-y-3',
}: {
  title: string
  children: ReactNode
  listClassName?: string
}) {
  return (
    <div>
      <h2 className="t-label mb-6 text-rail-ink">{title}</h2>
      <ul className={`text-small ${listClassName}`}>{children}</ul>
    </div>
  )
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="draw-under text-rail-ink-2 transition-colors duration-[var(--t-fast)] hover:text-rail-ink"
    >
      {children}
    </Link>
  )
}
