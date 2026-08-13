import Image from 'next/image'
import Link from 'next/link'

import { formatCount } from '@/lib/format'
import type { Universe } from '@/types/catalog'

/**
 * The department grid: the main event of the homepage.
 *
 * Each tile reads as a doorway into a space rather than as a link in a list.
 * The product is not a thumbnail pinned inside a box; it is the room's own
 * contents, seen from the threshold, and it runs past the tile edge to say so.
 *
 * The tile is white and the page around it is tinted, which is the inverse of
 * the obvious arrangement and the only one that works here: every packshot in
 * the library was shot on white, so a white tile lets the photograph's own
 * background become the tile, and the product appears to sit in the space with
 * no rectangle around it.
 *
 * The layout is a fixed rhythm, not a random one: four rows of 5/4/3, 3/5/4,
 * 4/3/5, 4/4/4 on a twelve-column grid. Every row closes at twelve so the grid
 * never breaks, and no two consecutive rows share a shape, which is what stops
 * twelve tiles reading as a spreadsheet. Type sits in the corner opposite the
 * product so the two never fight.
 */

interface Plan {
  readonly span: 3 | 4 | 5
  readonly anchor: 'top' | 'bottom'
}

const PLAN: readonly Plan[] = [
  { span: 5, anchor: 'bottom' },
  { span: 4, anchor: 'bottom' },
  { span: 3, anchor: 'top' },
  { span: 3, anchor: 'top' },
  { span: 5, anchor: 'bottom' },
  { span: 4, anchor: 'bottom' },
  { span: 4, anchor: 'bottom' },
  { span: 3, anchor: 'top' },
  { span: 5, anchor: 'bottom' },
  { span: 4, anchor: 'bottom' },
  { span: 4, anchor: 'bottom' },
  { span: 4, anchor: 'top' },
]

const SPAN_CLASS: Record<Plan['span'], string> = {
  3: 'md:col-span-3',
  4: 'md:col-span-4',
  5: 'md:col-span-5',
}

export interface DepartmentTile {
  readonly universe: Universe
  /** A knocked-out hero product, or `null` when none is available yet. */
  readonly image: string | null
  readonly imageAlt: string
}

export function DepartmentGrid({ tiles }: { tiles: readonly DepartmentTile[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-12 md:gap-3.5">
      {tiles.map((tile, index) => (
        <DepartmentSpace
          key={tile.universe.id}
          tile={tile}
          plan={PLAN[index] ?? { span: 4, anchor: 'bottom' }}
          index={index}
        />
      ))}
    </div>
  )
}

function DepartmentSpace({
  tile,
  plan,
  index,
}: {
  tile: DepartmentTile
  plan: Plan
  index: number
}) {
  const { universe } = tile

  return (
    <Link
      href={`/rayon/${universe.slug}`}
      style={{ '--reveal-index': index } as React.CSSProperties}
      className={`reveal group relative isolate flex min-h-[200px] overflow-hidden rounded-space border border-rule bg-surface p-[18px] transition-colors duration-[var(--t-base)] ease-brand hover:border-rule-2 md:min-h-[250px] md:p-[26px_28px] ${
        SPAN_CLASS[plan.span]
      } ${plan.anchor === 'top' ? 'items-start' : 'items-end'}`}
    >
      <span className="relative z-2 max-w-[68%] md:max-w-[54%]">
        <span className="block text-base font-bold leading-[1.16] tracking-[-0.02em] text-balance md:text-xl">
          {universe.name}
        </span>
        <span className="t-num mt-1 block text-[0.78125rem] text-ink-3">
          {formatCount(universe.totalCount, 'référence')}
        </span>
        <span className="t-label mt-3 inline-block border-b-[1.5px] border-accent pb-[3px] text-accent">
          Explorer
        </span>
      </span>

      {tile.image ? (
        <span
          aria-hidden
          className={`pointer-events-none absolute -right-[5%] z-1 aspect-square w-[46%] max-w-[240px] transition-transform duration-[var(--t-base)] ease-brand group-hover:-translate-y-1.5 ${
            plan.anchor === 'top' ? '-top-[8%]' : '-bottom-[10%]'
          }`}
        >
          {/* A square box rather than a free-floating image: a 24-port switch is
              five times wider than it is tall, and left unconstrained it slides
              straight across the department name. */}
          <Image
            src={tile.image}
            alt=""
            fill
            sizes="(max-width: 820px) 40vw, 240px"
            className="object-contain"
          />
        </span>
      ) : null}
    </Link>
  )
}
