import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

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
 * and it always reads as a spec sheet off a hardware site. The block under the
 * button carries a heading for the same reason: "Retrait et livraison" is how
 * the thing reaches you, and the heading turns a run of leftover rows into one
 * answered question.
 *
 * ITS COLUMN CARRIES TWO RULES, AND NOW SO DOES OURS, WHICH COST THE COLUMN ITS
 * THIRD BLOCK. E-shop rules the column exactly twice: once above the price and
 * once above the facts. Three movements, two rules. This column had three ruled
 * blocks, and the third was "La référence" — famille, mise en ligne, référence
 * WooCommerce — set as a right-aligned two-column table, which is the one shape
 * this page's own head note says to avoid. It was also the wrong content for
 * that slot: E-shop's facts are about the OBJECT, and belong beside its price;
 * these three are about the RECORD. They are now the photograph's caption. See
 * point 6 in the body.
 *
 * WHAT THE CAPTION IS WORTH, MEASURED AT 1440. The spread was 899 pixels tall
 * with the photograph's column ending at 883 and the buy column at 1118: 235
 * pixels of white under a square frame beside a column that outran it, on every
 * reference in the catalogue. E-shop never shows that, because its photography
 * is a stack of three plates and is the TALLER column. Ours cannot be — the
 * frame is square, the packshots are 425 to 576 pixels a side and 2 880 of the
 * 4 254 references carry exactly one. Moving the record under the plate is the
 * same rebalancing done from the other end: the columns now finish 30 pixels
 * apart instead of 235, and the whole spread is 728 rather than 899. At 1280 the
 * gap goes from 347 to 138.
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
 * THE REFERENCE NUMBER IS STILL PRINTED, AND IT IS STILL THE POINT. It is the
 * WooCommerce post id, which is what the counter reads back over the telephone,
 * and it is the one identifier the customer and the shop can both point at. It
 * has moved from the foot of the buy column to the caption under the photograph,
 * which is nearer the thing it names, not further from it.
 *
 * THE SPECIFICATIONS LINE IS SET AT E-SHOP'S SIZE, WHICH IS ONE STEP ABOVE BODY
 * AND WAS ONE STEP BELOW IT. E-shop's line under the name is 17px — `text-lead`
 * here, to the pixel — because on that page it is the sentence that gives the
 * piece a voice. This page's substitute for it carries the same job and had been
 * set at 13px, where it read as a footnote on the name rather than as the second
 * half of the statement. It is `text-lead` from `sm` and `text-body` below it:
 * at 306 pixels of column, 17px mono runs three specifications onto a third line
 * and pushes the price down a screen that has none to give. Measured at 390 the
 * name, the price and the button did not move: 632, 813, 929.
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
 * children, 36/28 to 28/24 on the ruled blocks, 40 to 20 above the article. The
 * gallery gives back another 143 on top of that by turning its wrapped thumbnail
 * grid into a swipe rail; see the head of `ProductGallery`.
 *
 * THE GRID HAS THREE CHILDREN AND TWO COLUMNS, AND THE THIRD IS PLACED RATHER
 * THAN NESTED. Photograph, buy column, caption. Below `lg` the grid is one
 * column and they simply stack, so the caption falls to the foot of the article,
 * after everything about the object — which is where three facts about a
 * database row belong on a phone, and it is also the DOM order a screen reader
 * gets at every width. From `lg` the caption is placed into row 2 of column 1,
 * under the photograph, and the buy column spans both rows. Nesting it inside
 * the photograph's cell was tried first and measured: 56 pixels at 390, which
 * put the basket button back at y 982 on an 844-pixel screen. That is the exact
 * number `BuyBlock` was rewritten to get rid of.
 */
export default async function ProduitPage({ params }: Params) {
  const { slug } = await params
  const product = getProductPage(slug)
  if (!product) notFound()

  const anchored =
    product.listPrice && product.discountPct && product.discountPct >= 40 ? product.listPrice : null
  const added = formatMonth(product.addedAt)

  /* The photograph's credit line. Built here rather than inline so the three
     facts can be absent one at a time: 20 references are filed under no family
     at all, and `addedAt` is null wherever WooCommerce lost the upload date. A
     caption that prints "Famille Non classé" is worse than a caption of two
     facts. The reference itself is always known, so the line is never empty. */
  const credit: { label: string; value: ReactNode }[] = []
  if (product.category) {
    credit.push({
      label: 'Famille',
      value: (
        <Link
          href={`/categorie/${product.category.slug}`}
          /* 12px of type in a caption is a 75 by 17 target. The hit area is
             taken to 44 by a pseudo-element rather than by padding, because
             padding would push the caption off the photograph's baseline, and
             it reaches further DOWN than up: below is the product's own name,
             which is type, while above is the bottom edge of the swipe rail.
             Hidden from `sm`, where the pointer is a pointer. */
          className="draw-under relative text-accent after:absolute after:-inset-x-2 after:-top-2 after:-bottom-6 after:content-[''] hover:text-accent-ink sm:after:hidden"
        >
          {product.category.name}
        </Link>
      ),
    })
  }
  if (added) credit.push({ label: 'Mise en ligne', value: <span className="t-num">{added}</span> })
  credit.push({ label: 'Réf.', value: <span className="t-num">{product.reference}</span> })

  return (
    <>
      <Breadcrumb path={product.path} current={product.name} />

      <article className="shell pt-5 sm:pt-7 md:pt-10">
        <div className="grid gap-x-16 gap-y-7 sm:gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] xl:gap-x-24">
          {/* Sticky on a tall screen only. On a laptop the buy column is taller
              than the viewport, and pinning the photograph there would mean the
              price scrolls away from the picture it belongs to. */}
          <div className="lg:sticky lg:top-32 lg:col-start-1 lg:row-start-1 lg:self-start">
            <ProductGallery images={product.images} name={product.name} />
          </div>

          <div className="enter lg:col-start-2 lg:row-span-2 lg:row-start-1">
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
              <ul className="e-item mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-body text-ink-2 sm:mt-5 sm:text-lead">
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
          </div>

          {/* 6. THE PLATE'S CREDIT.
              Placed rather than nested, and that placement is the whole point.
              In the DOM it is last, which is where it belongs to a screen reader
              and where it belongs on a phone: three facts about the RECORD, read
              after everything about the object. From `lg` it is dropped into the
              cell under the photograph, where it reads as the caption of a
              plate. The `-mt-6` cancels most of the grid's own 40px row gap so
              it hugs the picture at 16 rather than floating 40 below it.

              IT IS NOT ABOVE THE NAME ON A PHONE, AND THAT WAS MEASURED TWICE.
              Nested inside the gallery's cell it cost 56 pixels at 390 and put
              the basket button back at y 982 on an 844-pixel screen, which is
              the exact number `BuyBlock` was rewritten to get rid of. Placed
              here it costs the name, the price and the button nothing at all,
              and the block it replaces takes 150 pixels off the column. */}
          <dl className="enter e-item flex flex-wrap items-baseline gap-x-3 gap-y-1 text-micro text-ink-3 lg:col-start-1 lg:row-start-2 lg:-mt-6">
            {credit.map((fact, index) => (
              <div key={fact.label} className="flex items-baseline gap-3">
                {index > 0 ? (
                  <span aria-hidden className="text-rule-2">
                    /
                  </span>
                ) : null}
                <dt>{fact.label}</dt>
                <dd className="text-ink-2">{fact.value}</dd>
              </div>
            ))}
          </dl>
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
