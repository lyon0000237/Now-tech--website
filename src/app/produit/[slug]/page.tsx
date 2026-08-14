import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Breadcrumb } from '@/components/catalog/Breadcrumb'
import { BuyBlock } from '@/components/product/BuyBlock'
import { ProductGallery } from '@/components/product/ProductGallery'
import { ProductGrid } from '@/components/product/ProductGrid'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { getProductPage } from '@/lib/catalog'
import { formatAmount, formatMonth, formatPrice } from '@/lib/format'
import { SERVICE_POINTS } from '@/constants/site'

interface Params {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const product = getProductPage(slug)
  if (!product) return {}
  return {
    title: product.name,
    description: `${product.name}${product.brand ? `, ${product.brand}` : ''} à ${formatPrice(product.price)} chez NowTech Center. ${product.inStock ? 'En stock, retrait le jour même à Douala et Yaoundé.' : 'Sur commande, délai confirmé sous 24 h.'}`,
    openGraph: product.images[0] ? { images: [product.images[0]] } : undefined,
  }
}

/**
 * A product.
 *
 * THE DECISION IS THE LAYOUT. Photograph on the left, everything that answers
 * "should I buy this" on the right, and nothing between them. On this catalogue
 * the picture alone almost never decides anything, because half the shop is
 * black boxes that photograph identically, so the right column leads with the
 * facts the export actually parsed out of the name and only then asks for the
 * click.
 *
 * WHAT THIS PAGE DOES NOT HAVE, AND WHY. No description, because the export
 * carries none and writing 4 254 of them would mean generating them. No rating,
 * because there are no reviews. No "12 personnes regardent cet article", because
 * that is a number nobody counted. No countdown on the discount, because nothing
 * here actually expires. What is left is the photograph, the parsed
 * specifications, the price, the availability, and how it reaches you, which is
 * the whole of what this shop can honestly say about a reference.
 *
 * THE OPERATING FACTS SIT IN THE BUY COLUMN, NOT IN A STRIP BELOW. Retrait,
 * livraison, paiement and garantie are the four questions a Cameroonian buyer
 * asks between reading the price and pressing the button, and answering them
 * three sections further down means answering them after the decision.
 *
 * The reference number is printed at the foot of the column. It is the WooCommerce
 * post id, which is what the counter reads back over the telephone, and it is the
 * one identifier the customer and the shop can both point at.
 */
export default async function ProduitPage({ params }: Params) {
  const { slug } = await params
  const product = getProductPage(slug)
  if (!product) notFound()

  const anchored =
    product.listPrice && product.discountPct && product.discountPct >= 40 ? product.listPrice : null
  const added = formatMonth(product.addedAt)

  return (
    <>
      <Breadcrumb path={product.path} current={product.name} />

      <article className="shell pt-7 md:pt-10">
        <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] xl:gap-x-24">
          {/* Sticky on a tall screen only. On a laptop the buy column is taller
              than the viewport, and pinning the photograph there would mean the
              price scrolls away from the picture it belongs to. */}
          <div className="lg:sticky lg:top-32 lg:self-start">
            <ProductGallery images={product.images} name={product.name} />
          </div>

          <div className="enter">
            {product.brand ? (
              <p className="e-text t-label mb-4 text-accent">{product.brand}</p>
            ) : product.category ? (
              <p className="e-text t-label mb-4 text-ink-3">{product.category.name}</p>
            ) : null}

            <h1 className="text-sub leading-[1.25] font-bold tracking-[-0.02em] text-balance md:text-title md:leading-[1.15]">
              {product.name}
            </h1>

            {product.specs.length > 0 ? (
              <ul className="e-item mt-7 flex flex-wrap gap-2">
                {product.specs.map((spec) => (
                  <li
                    key={spec}
                    className="t-num rounded-[6px] bg-space px-2.5 py-1 text-micro text-ink-2"
                  >
                    {spec}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-9 border-t border-rule pt-7">
              {anchored ? (
                <p className="t-num mb-1 text-small text-ink-3">
                  <span className="line-through">{formatPrice(anchored)}</span>
                  <span className="ml-3 font-bold text-secondary-ink">
                    -{product.discountPct}%
                  </span>
                </p>
              ) : null}
              <p className="t-num text-display leading-none font-bold tracking-[-0.03em]">
                {formatPrice(product.price)}
              </p>
              <p className="mt-3 text-small text-ink-2">
                {product.inStock ? (
                  <>
                    <span className="mr-2 inline-block size-1.5 translate-y-[-1px] rounded-full bg-brand align-middle" />
                    En stock, retrait le jour même
                  </>
                ) : (
                  <span className="text-warn">Sur commande</span>
                )}
              </p>

              <div className="mt-7">
                <BuyBlock
                  product={{
                    slug: product.slug,
                    name: product.name,
                    price: product.price,
                    image: product.images[0] ?? null,
                    inStock: product.inStock,
                  }}
                />
              </div>
            </div>

            <dl className="mt-9 grid gap-x-8 gap-y-5 border-t border-rule pt-7 sm:grid-cols-2">
              {SERVICE_POINTS.map((point) => (
                <div key={point.title}>
                  <dt className="mb-1 text-small font-semibold">{point.title}</dt>
                  <dd className="text-micro leading-[1.6] text-ink-3">{point.detail}</dd>
                </div>
              ))}
            </dl>

            <dl className="mt-9 grid gap-y-3 border-t border-rule pt-7 text-micro">
              <div className="flex justify-between gap-6">
                <dt className="text-ink-3">Famille</dt>
                <dd className="text-right">
                  {product.category ? (
                    <Link
                      href={`/categorie/${product.category.slug}`}
                      className="draw-under text-accent hover:text-accent-ink"
                    >
                      {product.category.name}
                    </Link>
                  ) : (
                    'Non classé'
                  )}
                </dd>
              </div>
              {added ? (
                <div className="flex justify-between gap-6">
                  <dt className="text-ink-3">Mise en ligne</dt>
                  <dd className="t-num text-right text-ink-2">{added}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-6">
                <dt className="text-ink-3">Référence</dt>
                <dd className="t-num text-right text-ink-2">{product.reference}</dd>
              </div>
            </dl>
          </div>
        </div>
      </article>

      {product.related.length > 0 && product.category ? (
        <section className="shell mt-band">
          <SectionHeader
            title="À rapprocher"
            /* NOT "dans la même famille". The query starts in the family and
               widens to the parent when the family is too thin to fill a row,
               so on "Laptop ASUS", which holds five, it returns a Dell. A
               heading that claims family membership while showing a neighbour
               is the kind of small lie this catalogue is built to avoid, so the
               heading is loosened and the rule is printed under it. */
            context={`Les références les plus proches par famille, marque et prix. ${product.category.name} en compte ${formatAmount(product.category.count)}.`}
            action={{
              href: `/categorie/${product.category.slug}`,
              label: 'Ouvrir la famille',
            }}
          />
          <ProductGrid products={product.related} columns={5} />
        </section>
      ) : null}
    </>
  )
}
