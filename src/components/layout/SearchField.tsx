'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { IconSearch } from '@/components/brand/Icons'
import { ScopeSelect, type Scope } from './ScopeSelect'

/**
 * The search field.
 *
 * Search is a primary navigation mode here, not a convenience: 4 254 products
 * across 268 categories is more than any menu can expose, and a buyer who
 * already knows they want a "switch 24 ports PoE" should never have to walk the
 * tree. That is why it sits in the masthead at full width rather than behind an
 * icon.
 *
 * The department selector in front of the field is not decoration either. Half
 * the vocabulary in this catalog is ambiguous across departments: "onduleur"
 * returns power and networking, "caméra" returns surveillance and photography,
 * "switch" returns commutation and light switches. Naming the department costs
 * one click and removes a whole class of dead result page.
 *
 * The placeholder is written in the vocabulary of the catalog, so it doubles as
 * an example of what the field understands.
 *
 * The field is filled with --space, not --surface. --surface is pinned to white
 * in both themes because every packshot is shot on white; a form painted with it
 * kept a white background in the dark theme while its text followed the theme,
 * and the text a customer had just typed measured 1.2:1 against it.
 */
export function SearchField({
  scopes,
  initialQuery = '',
  initialScope = '',
}: {
  scopes: readonly Scope[]
  initialQuery?: string
  initialScope?: string
}) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [scope, setScope] = useState(initialScope)

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        const trimmed = query.trim()
        if (!trimmed) return
        const params = new URLSearchParams({ q: trimmed })
        if (scope) params.set('rayon', scope)
        router.push(`/recherche?${params}`)
      }}
      // 52px on a phone so the submit inside it clears 44, 48 from md up where a
      // pointer is doing the aiming. Only the phone changes.
      className="field flex h-13 w-full items-stretch rounded-control border border-rule-2 bg-space transition-[border-color,box-shadow] duration-[var(--t-fast)] md:h-12"
    >
      <ScopeSelect scopes={scopes} value={scope} onChange={setScope} />

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Onduleur 1500 VA, caméra 4 MP, switch 24 ports PoE…"
        aria-label="Rechercher dans le catalogue"
        className="min-w-0 flex-1 bg-transparent px-4 text-small text-ink outline-none placeholder:text-ink-3"
      />

      <button
        type="submit"
        className="press m-1 flex shrink-0 items-center gap-2 rounded-[6px] bg-accent px-5 text-small font-semibold text-paper transition-colors duration-[var(--t-fast)] hover:bg-accent-ink"
      >
        <IconSearch className="text-[1.125rem]" />
        <span className="hidden sm:inline">Chercher</span>
        <span className="sr-only sm:hidden">Chercher</span>
      </button>
    </form>
  )
}
