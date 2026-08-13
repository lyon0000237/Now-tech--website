'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * The search field.
 *
 * Search is a primary navigation mode here, not a convenience: 4,256 products
 * across 267 categories is more than any menu can expose, and a buyer who
 * already knows they want a "switch 24 ports PoE" should never have to walk the
 * tree. That is why it sits in the masthead at full width rather than behind an
 * icon.
 *
 * The placeholder is written in the vocabulary of the catalog, so it doubles as
 * an example of what the field understands.
 */
export function SearchField({ initialQuery = '' }: { initialQuery?: string }) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        const trimmed = query.trim()
        if (trimmed) router.push(`/recherche?q=${encodeURIComponent(trimmed)}`)
      }}
      className="flex h-[46px] w-full max-w-[620px] flex-1 items-center gap-3 rounded-control border border-rule-2 bg-surface pl-4 pr-1.5"
    >
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Onduleur 1500 VA, caméra 4 MP, switch 24 ports PoE…"
        aria-label="Rechercher dans le catalogue"
        className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-ink outline-none placeholder:text-ink-3"
      />
      <button
        type="submit"
        className="hidden rounded-md bg-accent px-4 py-[9px] text-[0.8125rem] font-semibold text-paper transition-colors duration-[var(--t-fast)] hover:bg-accent-ink sm:block"
      >
        Chercher
      </button>
    </form>
  )
}
