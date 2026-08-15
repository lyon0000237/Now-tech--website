import { BannerStage } from '@/components/home/BannerStage'
import { BrandRail } from '@/components/home/BrandRail'
import { CounterTour } from '@/components/home/CounterTour'
import { HeroDeck } from '@/components/home/HeroDeck'
import { PromoBand } from '@/components/home/PromoBand'
import { RecentColumns, type RecentColumn } from '@/components/home/RecentColumns'
import { Selections } from '@/components/home/Selections'
import { ServiceStrip } from '@/components/home/ServiceStrip'
import { ShowroomBand } from '@/components/home/ShowroomBand'
import { SectionHeader } from '@/components/ui/SectionHeader'
import {
  getBrandTiles,
  getCounterTour,
  getDepartmentPicture,
  getHeroPanels,
  getFamilyCount,
  getMeta,
  getPromoPanels,
  getRecentBySubcategory,
  getSelections,
  summarise,
} from '@/lib/catalog'
import { formatAmount } from '@/lib/format'

/**
 * The homepage.
 *
 * It orchestrates and does not render: every visual decision lives in a section
 * component, and every fact comes from the catalog rather than from this file.
 *
 * THE SHAPE. The designer's banners open the page, on a loop, saying nothing the
 * artwork does not already say. Then a rail of twelve departments driving the
 * card beside it, two banners for the two departments nobody needs arguing for,
 * then
 * merchandise in decreasing order of how much the shop chose it: four filters a
 * customer would have applied themselves, a deliberate pass over the six
 * departments the top of the page cannot reach, and last the families where
 * stock genuinely moved this month. The operating facts and the three counters
 * interrupt that twice, at the two points where a reader has seen enough to
 * start asking how any of it would reach them.
 *
 * WHAT IS NOT HERE. No star ratings, because the catalog holds no reviews. No
 * "best seller" shelf, because the export carries no order history. No
 * countdown, because nothing here is genuinely expiring. Every list on this page
 * is a query a customer could run themselves, and each one says which.
 *
 * THE BAND BETWEEN SECTIONS IS 64 PIXELS ON A PHONE AND THE TOKEN'S OWN VALUE
 * FROM sm UP. `--s-band` is clamp(6rem, 8.5vw, 10rem), and 8.5vw of a 360
 * screen is 30 pixels, so the clamp holds it at its 96px floor: a measure
 * calculated for a 1440 screen, where it computes to 122 and separates two
 * bands the eye takes in whole. On a phone nothing is taken in whole, the
 * sections are already one per screen, and six of those gaps put 576 pixels of
 * empty page between them on a document that measured 13 009 tall. Sixteen
 * (64px) keeps the page's air and gives back a third of it. At 640 the utility
 * returns and computes to the same 96 it always did, so no screen from sm up
 * moves.
 */
export default function HomePage() {
  const meta = getMeta()
  const familyCount = getFamilyCount()
  const panels = getHeroPanels()
  const promos = getPromoPanels()
  // Twelve, not ten: the grid runs 2, 3 and 4 columns, and twelve is the only
  // count under fifteen that fills whole rows at all three. Ten left two empty
  // cells, 613 by 474 pixels each, on every screen between 768 and 1279.
  const selections = getSelections(12)
  const picks = getCounterTour()

  // Twelve marks, two rows of six, ranked by catalogue depth. The wall shows
  // only manufacturers we hold a mark for; the other 89 are one link away.
  const brands = getBrandTiles(12)

  const columns: RecentColumn[] = getRecentBySubcategory({
    blocks: 3,
    productsPerBlock: 4,
    minProducts: 8,
  }).map((block) => ({
    categoryName: block.category.name,
    categorySlug: block.category.slug,
    departmentName: block.universe.name,
    totalCount: block.category.totalCount,
    newestAt: block.products[0]?.addedAt ?? null,
    products: summarise(block.products),
  }))

  return (
    <>
      {/* Full bleed and flush to the masthead: the artwork is the first thing,
          and a gutter around it would frame someone else's composition. */}
      <BannerStage />

      {/* `block`, not `band`. The stage and the rail are one opening seen in
          two parts, and a full band between them reads as the page having
          already moved on from the artwork. */}
      <section className="shell mt-stack">
        <HeroDeck panels={panels} />

        <div className="mt-stack">
          <PromoBand panels={promos} />
        </div>
      </section>

      <section className="shell mt-16 sm:mt-band">
        <Selections selections={selections} />
      </section>

      <div className="mt-16 sm:mt-band">
        <ServiceStrip />
      </div>

      <section className="shell mt-16 sm:mt-band">
        <SectionHeader
          title="Le tour du magasin"
          context="Un article en stock dans chacun des six rayons que le haut de cette page ne traverse pas."
          action={{ href: '/catalogue', label: `Les ${familyCount} familles` }}
        />
        <CounterTour picks={picks} reconditioned={getDepartmentPicture('services')} />
      </section>

      <section className="shell mt-16 sm:mt-band">
        <SectionHeader
          title="Derniers arrivages"
          context="Les trois familles où du stock est entré le plus récemment, une par rayon."
          action={{ href: '/catalogue?tri=recent', label: 'Tout voir' }}
        />
        <RecentColumns columns={columns} />
      </section>

      <section className="shell mt-16 sm:mt-band">
        <SectionHeader
          title="Marques distribuées"
          context={`${formatAmount(meta.productCount)} références réparties sur une centaine de marques, retrouvées ligne par ligne dans le catalogue.`}
          action={{ href: '/marques', label: 'Toutes les marques' }}
        />
        <BrandRail brands={brands} />
      </section>

      <div className="mt-16 sm:mt-band">
        <ShowroomBand />
      </div>
    </>
  )
}
