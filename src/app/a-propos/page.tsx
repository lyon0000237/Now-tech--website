import type { Metadata } from 'next'
import Link from 'next/link'

import { PageHeader } from '@/components/layout/PageHeader'
import { getBrands, getMeta, getUniverses } from '@/lib/catalog'
import { formatAmount, formatCount } from '@/lib/format'
import { SHOWROOMS } from '@/constants/site'

export const metadata: Metadata = {
  title: 'La maison',
  description:
    'NowTech Center distribue le matériel informatique, réseau, sécurité électronique et ' +
    'énergie au Cameroun, depuis trois comptoirs à Douala et Yaoundé.',
}

/**
 * About.
 *
 * Written from what can be counted rather than from adjectives. Every figure on
 * this page is read out of the catalog at build time, so nothing here can drift
 * away from what the shop actually stocks, and nothing claims a history or a
 * headcount the data cannot support.
 */
export default function AboutPage() {
  const meta = getMeta()
  const universes = getUniverses()
  const brands = getBrands()

  return (
    <>
      <PageHeader
        title="Un magasin de matériel technique, mis en ligne comme un magasin"
        lead="NowTech Center distribue l’équipement informatique, réseau, sécurité électronique et énergie au Cameroun. Le catalogue en ligne est le stock des comptoirs, pas une vitrine séparée."
      />

      <section className="shell">
        <dl className="grid border-y border-rule sm:grid-cols-2 lg:grid-cols-4">
          {[
            { value: formatAmount(meta.productCount), label: 'Références en catalogue' },
            { value: formatAmount(meta.categoryCount), label: 'Familles de produits' },
            { value: String(brands.length), label: 'Marques distribuées' },
            { value: String(SHOWROOMS.length), label: 'Comptoirs physiques' },
          ].map((fact, index) => (
            <div
              key={fact.label}
              className={`py-11 pr-10 ${index > 0 ? 'lg:border-l lg:border-rule lg:pl-10' : ''} ${
                index % 2 === 1 ? 'sm:border-l sm:border-rule sm:pl-10' : ''
              } ${index >= 2 ? 'border-t border-rule lg:border-t-0' : ''}`}
            >
              <dt className="t-num mb-1 text-title font-bold tracking-[-0.03em]">{fact.value}</dt>
              <dd className="text-small text-ink-2">{fact.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="shell mt-band">
        <h2 className="mb-10 max-w-[24ch] text-title font-bold leading-[1.06] tracking-[-0.03em] text-balance">
          Douze rayons, parce que quarante-six n’en étaient pas
        </h2>
        <div className="grid gap-x-14 gap-y-8 lg:grid-cols-[1fr_1.1fr]">
          <p className="max-w-[54ch] text-body leading-[1.6] text-ink-2">
            Le catalogue s’est construit sur vingt ans d’arrivages, et sa structure d’origine le
            montre : quarante-six entrées de premier niveau, dont vingt-six sans aucune
            sous-catégorie, allant de huit cent quarante-neuf produits à un seul. Un tel classement
            est parfaitement utilisable en magasin, où l’on demande à quelqu’un. Il ne l’est pas
            sur un écran.
            <br />
            <br />
            Rien n’a été supprimé. Les {meta.categoryCount} familles existent toujours, avec leurs
            identifiants et leurs pages. Elles sont simplement regroupées en douze rayons, qui sont
            la façon dont les vendeurs eux-mêmes décrivent le magasin.
          </p>

          <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {universes.map((universe) => (
              <li key={universe.id}>
                <Link
                  href={`/rayon/${universe.slug}`}
                  className="flex items-baseline justify-between gap-4 border-b border-rule py-3 text-small transition-colors duration-[var(--t-fast)] hover:text-accent"
                >
                  <span>{universe.name}</span>
                  <span className="t-num shrink-0 text-micro text-ink-3">
                    {formatCount(universe.totalCount, 'réf.')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="shell mt-band">
        <h2 className="mb-10 max-w-[24ch] text-title font-bold leading-[1.06] tracking-[-0.03em] text-balance">
          Acheter ici revient à passer au comptoir
        </h2>
        <div className="grid gap-x-14 gap-y-10 md:grid-cols-3">
          {[
            {
              head: 'Le stock est réel',
              body: 'Ce qui est marqué en stock est au comptoir. Le reste est annoncé sur commande, avec un délai donné par téléphone plutôt que promis par la page.',
            },
            {
              head: 'Le prix est le prix',
              body: 'Les tarifs affichés sont ceux du comptoir. Pour une quantité ou un projet, la proforma se demande et se négocie, comme sur place.',
            },
            {
              head: 'On paie à la livraison',
              body: 'Espèces, MTN Mobile Money ou Orange Money, au retrait ou à la réception. Rien n’est prélevé avant que le matériel soit entre vos mains.',
            },
          ].map((block) => (
            <div key={block.head}>
              <h3 className="mb-3 text-body font-semibold">{block.head}</h3>
              <p className="text-small leading-[1.65] text-ink-2">{block.body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
