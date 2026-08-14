import { NextResponse } from 'next/server'

import { searchCatalog, searchFamilies, type SearchHit } from '@/lib/catalog'
import { FALLBACK, TOPICS } from '@/constants/assistant'
import type { CategorySummary } from '@/types/summary'

/**
 * The one thing Bod cannot do in the browser.
 *
 * The catalogue is 3.3 MB and lives behind `server-only`, which is the whole
 * reason this route exists: shipping it to the client so a chat widget could
 * grep it would cost every visitor the entire dataset for a feature most of them
 * never open. The question comes here, the scan happens on the server, and four
 * results go back.
 *
 * No model, no key, no third party. The answer is either a row from the export
 * or a paragraph written in `constants/assistant.ts`, and the reply says which.
 */
export interface AssistantReply {
  readonly kind: 'topic' | 'products' | 'families' | 'none'
  readonly text: string
  readonly link?: { readonly href: string; readonly label: string }
  readonly products?: readonly SearchHit[]
  readonly families?: readonly CategorySummary[]
}

/**
 * Folded into whole words, and matched as whole words.
 *
 * A substring match on a two-letter cue routed "vous ouvrez à quelle heure" to
 * the counter-addresses answer, because "ou" is inside "vous". The shop's
 * opening hours are not in the data at all, so that question must reach a human,
 * and it now does.
 */
function words(value: string): Set<string> {
  return new Set(
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  )
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.slice(0, 200).trim() ?? ''
  if (query.length < 2) {
    return NextResponse.json<AssistantReply>({ kind: 'none', text: FALLBACK })
  }

  // A named topic wins over a product search: someone typing "livraison Douala"
  // wants the delivery answer, and the catalogue would happily return four
  // products whose names contain "Douala" in a shipping note.
  const asked = words(query)
  const topic = TOPICS.find((candidate) => candidate.cues.some((cue) => asked.has(cue)))
  if (topic) {
    return NextResponse.json<AssistantReply>({
      kind: 'topic',
      text: topic.answer,
      link: topic.link,
    })
  }

  const products = searchCatalog(query, 4)
  if (products.length > 0) {
    return NextResponse.json<AssistantReply>({
      kind: 'products',
      text:
        products.length === 1
          ? 'Une référence correspond :'
          : `${products.length} références correspondent, les plus proches d’abord :`,
      products,
    })
  }

  // Nothing matched a product, but the words may name a shelf. Sending someone
  // to a family of 440 cameras beats telling them the shop has none.
  const families = searchFamilies(query, 3)
  if (families.length > 0) {
    return NextResponse.json<AssistantReply>({
      kind: 'families',
      text: 'Aucune référence ne porte ces mots, mais ces familles les portent :',
      families,
    })
  }

  return NextResponse.json<AssistantReply>({ kind: 'none', text: FALLBACK })
}
