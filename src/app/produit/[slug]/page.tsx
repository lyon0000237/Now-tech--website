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
 * ==========================================================================
 * WHAT WAS TAKEN FROM E-SHOP, AND WHAT COULD NOT BE
 * ==========================================================================
 *
 * E-shop's product page is written as an editorial spread, and its column reads
 * in one unbroken order: CLASSIFICATION, NAME, ONE LINE, rule, PRICE beside
 * AVAILABILITY, the CONTROL, prose, rule, the FACTS in labelled clusters. That
 * order is the thing worth copying, because it is a ladder — each step is the
 * next question a buyer asks — and it is what stops a product page reading as a
 * form with a picture next to it. It is taken here step for step, with three
 * substitutions this catalogue forces.
 *
 * ITS ONE LINE IS OUR SPECIFICATIONS. E-shop has a hand-written sentence under
 * every name. This export has none, and writing 4 254 of them would mean
 * generating them. What sits in that slot instead is the only characterisation
 * this shop can honestly make: the two or three facts the ingestion parsed out
 * of the product's own name. 1 498 of 4 254 references carry at least one; on
 * the other 2 756 the slot is simply not drawn, because an empty label is worse
 * than no label.
 *
 * THEY ARE NO LONGER CHIPS. They were set in filled grey rectangles, which is
 * what the grid card uses, and in the grid that is right: there they are
 * scanned across twelve cards at 12px and the fill is what separates them. Here
 * there is one product, the reader is reading rather than scanning, and a row
 * of filled rectangles under a heading is the single most template-looking
 * object on the page. They are now a line of type separated by hairline
 * slashes, in the register the rest of this column is set in.
 *
 * ITS PROSE SLOT IS LEFT EMPTY, DELIBERATELY. Between the button and the facts
 * E-shop prints a paragraph about how the piece was made. There is nothing
 * truthful to put there, so nothing goes there. Filling it would mean inventing
 * copy for 4 254 references, which is the one thing this storefront does not
 * do. The column is shorter than E-shop's as a result, and that is the honest
 * shape of what this shop knows.
 *
 * ITS CLUSTERS ARE HEADED, AND NOW SO ARE OURS. E-shop groups its facts under
 * three small labels — Made from, Fits, Lives — instead of running a hairline
 * table of ten rows. A ruled table is the default for a catalogue of this size
 * and it always reads as a spec sheet off a hardware site. The two blocks under
 * the button carry headings for the same reason: "Retrait et livraison" is how
 * the thing reaches you, "La référence" is how the counter and the customer
 * point at the same object over the telephone. Two headings turn a run of
 * leftover rows into two answered questions.
 *
 * WHAT WAS NOT TAKEN. E-shop pins the BUYING COLUMN and lets the photography
 * scroll past it. Measured here at 1440 that would be wrong: the buy column runs
 * 293 to 1059, which is 766 pixels against 803 of usable viewport under a
 * 157-pixel chrome, and the longest names in this export are 211 characters and
 * push it well past that. Pinning a column taller than the screen pins nothing
 * and scrolls the price away from the picture it belongs to. The photograph is
 * pinned instead, which is the same idea applied to the column that actually
 * fits.
 *
 * ALSO NOT TAKEN: its rule above the related run. E-shop closes the spread with
 * a hairline and opens the next section under it. `SectionHeader` already draws
 * a hairline of its own, and two hairlines 60 pixels apart is a boxed section,
 * not an editorial one. The `band` of silence does that work here.
 *
 * ==========================================================================
 *
 * WHAT THIS PAGE DOES NOT HAVE, AND WHY. No description, because the export
 * carries none. No rating, because there are no reviews. No "12 personnes
 * regardent cet article", because that is a number nobody counted. No countdown
 * on the discount, because nothing here actually expires. What is left is the
 * photograph, the parsed specifications, the price, the availability, and how it
 * reaches you, which is the whole of what this shop can honestly say about a
 * reference.
 *
 * THE OPERATING FACTS SIT IN THE BUY COLUMN, NOT IN A STRIP BELOW. Retrait,
 * livraison, paiement and garantie are the four questions a Cameroonian buyer
 * asks between reading the price and pressing the button, and answering them
 * three sections further down means answering them after the decision. E-shop
 * keeps its own facts in the column for the same reason.
 *
 * THE PRICE AND THE AVAILABILITY SHARE A BASELINE, WHICH COST THE AVAILABILITY
 * FOUR WORDS. They were stacked, 28 pixels apart, which made the availability
 * read as a caption on the price rather than as the second half of the same
 * statement. E-shop sets the two on one baseline, and it can, because its two
 * strings are short. Measured here they were not: the price draws 262 pixels at
 * 1440 and "En stock, retrait le jour même" draws 201, which is 483 in a
 * 416-pixel column, so the row wrapped on the 3 916 references that are in stock
 * and held on the 338 that are not. A row that changes shape with the stock
 * status is worse than either shape. The sentence is cut to "En stock" — 57
 * pixels, and 339 with the price — and the four words it lost are printed word
 * for word two rules below, under "Retrait et livraison", which is where a
 * reader who has finished reading the price actually looks for them. Nothing is
 * lost from the page and the row now holds at 390 as well: 183 + 20 + 57 = 260
 * against 332.
 *
 * The reference number is printed at the foot of the column. It is the WooCommerce
 * post id, which is what the counter reads back over the telephone, and it is the
 * one identifier the customer and the shop can both point at.
 *
 * THE VERTICAL RHYTHM BELOW `sm` IS A DIFFERENT RHYTHM, BECAUSE THE COLUMN IS
 * NOT BESIDE THE PHOTOGRAPH ANY MORE, IT IS UNDER IT. Measured at 360 on a
 * 780px screen before this change: the masthead and the trail end at 275, the
 * frame runs 303 to 609, the thumbnails to 697, and the product's own NAME
 * started at 771. Every gap in the column was a desktop gap: 40px between the
 * two grid children, 36 above each ruled block with 28 under each rule, on a
 * screen where the same content is stacked instead of side by side.
 *
 * They are cut below `sm` and restored at `sm` exactly: 40 to 28 between the
 * children, 36/28 to 28/24 on the three ruled blocks, 40 to 20 above the
 * article. The gallery gives back another 143 on top of that by turning its
 * wrapped thumbnail grid into a swipe rail; see the head of `ProductGallery`.
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

      <article className="shell pt-5 sm:pt-7 md:pt-10">
        <div className="grid gap-x-16 gap-y-7 sm:gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] xl:gap-x-24">
          {/* Sticky on a tall screen only. On a laptop the buy column is taller
              than the viewport, and pinning the photograph there would mean the
              price scrolls away from the picture it belongs to. */}
          <div className="lg:sticky lg:top-32 lg:self-start">
            <ProductGallery images={product.images} name={product.name} />
          </div>

          <div className="enter">
            {/* 1. CLASSIFICATION. The brand when the export knows it, the family
                   when it does not, and nothing at all when neither is known —
                   1 212 of 4 254 references carry no brand. */}
            {product.brand ? (
              <p className="e-text t-label mb-4 text-accent">{product.brand}</p>
            ) : product.category ? (
              <p className="e-text t-label mb-4 text-ink-3">{product.category.name}</p>
            ) : null}

            {/* 2. THE NAME. The darkest and largest thing in the column. */}
            <h1 className="text-sub leading-[1.25] font-bold tracking-[-0.02em] text-balance md:text-title md:leading-[1.15]">
              {product.name}
            </h1>

            {/* 3. THE LINE. See the head of this file: on this catalogue the one
                   line under the name is the parsed specifications, set as type
                   rather than as chips. The slash is a separator and carries no
                   meaning, so it is hidden from assistive technology, and it
                   leads its item rather than trailing it: a wrapped second line
                   then opens with a mark that reads as a continuation instead of
                   closing with one that reads as a mistake. */}
            {product.specs.length > 0 ? (
              <ul className="e-item mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-small text-ink-2 sm:mt-5">
                {product.specs.map((spec, index) => (
                  <li key={spec} className="flex items-baseline gap-3">
                    {index > 0 ? (
                      <span aria-hidden className="text-rule-2">
                        /
                      </span>
                    ) : null}
                    <span className="t-num">{spec}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {/* 4. THE PRICE, THE AVAILABILITY, THE CONTROL. */}
            <div className="mt-7 border-t border-rule pt-6 sm:mt-9 sm:pt-7">
              {anchored ? (
                <p className="t-num mb-1 text-small text-ink-3">
                  <span className="line-through">{formatPrice(anchored)}</span>
                  <span className="ml-3 font-bold text-secondary-ink">
                    -{product.discountPct}%
                  </span>
                </p>
              ) : null}

              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
                <p className="t-num text-display leading-none font-bold tracking-[-0.03em]">
                  {formatPrice(product.price)}
                </p>
                {/* "En stock" and not "En stock, retrait le jour même". The
                    longer sentence is 201 pixels wide and would not sit on the
                    price's baseline in a 416-pixel column; it is also printed
                    word for word two rules below, under "Retrait et livraison",
                    where it is the answer to a question the reader is actually
                    asking by then. Nothing is lost and the row holds its shape
                    on every reference. */}
                <p className="text-small text-ink-2">
                  {product.inStock ? (
                    <>
                      <span className="mr-2 inline-block size-1.5 translate-y-[-1px] rounded-full bg-brand align-middle" />
                      En stock
                    </>
                  ) : (
                    <span className="text-warn">Sur commande</span>
                  )}
                </p>
              </div>

              <div className="mt-6 sm:mt-7">
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

            {/* 5. HOW IT REACHES YOU. */}
            <section className="mt-7 border-t border-rule pt-6 sm:mt-9 sm:pt-7">
              <h2 className="t-label mb-4 text-ink-3">Retrait et livraison</h2>
              <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {SERVICE_POINTS.map((point) => (
                  <div key={point.title}>
                    <dt className="mb-1 text-small font-semibold">{point.title}</dt>
                    <dd className="text-micro leading-[1.6] text-ink-3">{point.detail}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* 6. HOW THE COUNTER AND THE CUSTOMER NAME THE SAME OBJECT. */}
            <section className="mt-7 border-t border-rule pt-6 sm:mt-9 sm:pt-7">
              <h2 className="t-label mb-4 text-ink-3">La référence</h2>
              <dl className="grid gap-y-3 text-micro">
                <div className="flex justify-between gap-6">
                  <dt className="text-ink-3">Famille</dt>
                  <dd className="text-right">
                    {product.category ? (
                      <Link
                        href={`/categorie/${product.category.slug}`}
                        /* 75 by 17 measured at 360, and it is a link in a table
                           rather than a link in a sentence, so the 44px rule
                           applies to it. It cannot be padded: this row is a
                           baseline-aligned pair and padding it would push the two
                           rows below it apart. The pseudo-element takes the hit
                           area to 79 by 45 and moves nothing, and it is hidden
                           from `sm` so the desktop link keeps exactly the target
                           it has today. */
                        className="draw-under relative text-accent after:absolute after:-inset-x-2 after:-inset-y-[0.875rem] after:content-[''] hover:text-accent-ink sm:after:hidden"
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
            </section>
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
