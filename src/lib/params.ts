import { SORTS, type SortKey } from './catalog'

/**
 * Query parameters, read defensively.
 *
 * A listing URL is a thing people edit, share and mistype, and Next hands the
 * value through as `string | string[] | undefined`. Anything that is not one of
 * the four orderings falls back to the default rather than 404ing: a customer
 * who lands on `?tri=cheapest` from a stale link wants the family, not an error
 * page about a parameter they did not know existed.
 */
export function parseSort(value: string | string[] | undefined): SortKey {
  const first = Array.isArray(value) ? value[0] : value
  return SORTS.some((sort) => sort.key === first) ? (first as SortKey) : 'recent'
}

export function parsePage(value: string | string[] | undefined): number {
  const first = Array.isArray(value) ? value[0] : value
  const page = Number(first)
  return Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1
}
