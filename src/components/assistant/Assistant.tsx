'use client'

import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { IconArrowRight, IconBox, IconClose } from '@/components/brand/Icons'
import {
  CAPABILITIES,
  CART_CUES,
  OFFLINE,
  OPENING,
  TOPICS,
  type AssistantBand,
  type AssistantBasket,
  type AssistantFollow,
  type AssistantIntent,
  type AssistantProduct,
  type AssistantReply,
  type AssistantScope,
  type AssistantTally,
} from '@/constants/assistant'
import { WHATSAPP, dialable } from '@/constants/site'
import { lockScroll } from '@/lib/scroll-lock'
import { formatAmount, formatPrice } from '@/lib/format'

/**
 * Bod, the counter assistant.
 *
 * WHAT IT IS. A counter clerk with the catalogue open in front of him. He reads
 * the shop's 4 254 references through `/api/assistant`, counts them, cuts them
 * into price bands, breaks them down by manufacturer, filters them by budget and
 * by discount, spreads a bare budget across the twelve departments, compares two
 * of them, finds one by the number printed on a proforma, re-reads the reader's
 * own basket against today's prices, and reads the house conditions out of
 * `constants/assistant.ts`. There is no model behind him, and the opening panel
 * says so before the first question, because a widget shaped like a chat that has
 * not stated its range will be asked things it cannot answer and will look broken
 * for refusing.
 *
 * WHY IT IS NOT A CHAT, AND WHY IT IS DRAWN AS A DOCKET. Nothing Bod returns is
 * conversation. It is a query and its result, and a query with a result is a
 * docket, not a dialogue. Each exchange is an ENTRY opened by a full rule in the
 * ink, carrying the question on the left and, on the same baseline, what Bod
 * decided the question was. Under it the figures, the merchandise, where the
 * stock sits across price, which manufacturers it is made of, and the way through
 * to the page that holds the rest. Blocks inside an entry are opened by a
 * HAIRLINE and the entry itself by a full rule, so two weights of line carry the
 * whole hierarchy and no box is needed anywhere.
 *
 * THE THREE THINGS THIS PASS CHANGED IN THE DRAWING, AND WHAT EACH ONE FIXES.
 *
 *   THE MEMORY IS NOW VISIBLE AND REVOCABLE. Bod carries the last answer's query
 *   into the next question, which is what makes "et en stock" mean something. It
 *   was invisible: after asking for cameras under 50 000, every later answer was
 *   silently bounded and there was no way to see it or drop it. A reader cannot
 *   be expected to guess at hidden state. The filter now stands under the head as
 *   removable tokens, each one carrying the exact query it removes, and it is the
 *   single most useful thing on the panel.
 *
 *   THE QUESTION STAYS ON SCREEN WHILE ITS ANSWER SCROLLS. A catalogue answer can
 *   be thirty lines of figures, bands and merchandise, and at 390 the question
 *   was off the top of the thread before the ladder arrived. The entry head is
 *   `sticky`, so what you asked is still readable while you read what came back.
 *
 *   THE HEAD IS PAPER, NOT A COLOURED BAND. The shop's rail green appears exactly
 *   twice on this site, closing the page top and bottom, and a third band inside a
 *   floating panel was borrowing that weight for a surface that is not the page.
 *   The identity is carried instead by a 3-pixel rule of the mark's own green
 *   across the panel's top edge, which is a SHAPE and never a ground under type,
 *   and by the hairlines the rest of the site is built from.
 *
 * WHAT IT REFUSES TO DO. It has no model, no key, no order history and no
 * account. It never estimates a delivery time it was not told, never ranks one
 * reference as better than another, and never invents a specification. When it
 * does not know, it says so in one line and hands the question to a human on
 * WhatsApp with the text already written.
 */

interface Turn {
  readonly id: number
  readonly question: string
  readonly reply: AssistantReply | null
}

/**
 * What Bod decided the question was, printed beside the question on its own
 * baseline.
 *
 * The cheapest possible form of honesty: a reader who asked for a price and sees
 * "Recherche" knows at a glance that the question was not understood, and does
 * not have to read three product rows to find that out. It sits at the END of
 * the question's line rather than above it, because a small tracked capital
 * stacked over a heading is a kicker, and a kicker reads louder than the thing
 * it labels.
 */
const INTENT_LABEL: Record<AssistantIntent, string> = {
  accueil: 'Bonjour',
  budget: 'Budget',
  capacites: 'Ce que je sais faire',
  comptoir: 'Comptoir',
  comparaison: 'Comparaison',
  famille: 'Familles',
  infos: 'Conditions',
  marque: 'Marques',
  panier: 'Panier',
  prix: 'Prix',
  recherche: 'Recherche',
  reference: 'Référence',
  remise: 'Démarqué',
  stock: 'Stock',
  main: 'Je passe la main',
}

/** The basket key, read at question time. See `readBasket` for why it is copied. */
const BASKET_KEY = 'nowtech.panier.v1'

const SHEET = { duration: 0.32, ease: [0.22, 1, 0.36, 1] } as const
const SPRING = { type: 'spring', stiffness: 320, damping: 32 } as const
/** The site's own `--e-text`: a sentence resolving out of blur. */
const RESOLVE = { duration: 0.5, ease: [0.22, 1, 0.28, 1] } as const
/** The site's own `--ease-draw`: a hairline drawing itself. */
const DRAW = { duration: 0.56, ease: [0.22, 1, 0.28, 1] } as const

/**
 * A media query, answered correctly on the first client render.
 *
 * `useSyncExternalStore` rather than an effect, for the reason the repository
 * forbids the effect: it would render the desktop panel once and the sheet once,
 * and the reader would see a card appear bottom-right and then jump to the
 * bottom of the screen. The server snapshot is `false`, so the first paint is
 * the desktop composition and only a phone corrects it, before paint.
 */
function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', notify)
      return () => list.removeEventListener('change', notify)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

interface StoredLine {
  readonly slug: string
  readonly qty: number
  readonly price: number
  /** Carried so a line the catalogue has dropped can still be named. */
  readonly name: string
}

/**
 * The basket, read straight out of storage at the moment it is asked about.
 *
 * `<Assistant />` is mounted in `layout.tsx` OUTSIDE `<CartProvider>`, so
 * `useCart()` here would throw, and moving the mount is not this component's to
 * do. Reading the key directly is the honest alternative, and reading it on
 * demand rather than subscribing is what makes it correct: the provider's own
 * listeners are module-private, so a subscription from outside would go stale
 * within the tab, while a read at question time cannot.
 *
 * THE LINES GO TO THE SERVER AND THE PRICES COME BACK. The store keeps the price
 * a line was ADDED at, which is the right trade for a shop that reprices at the
 * counter and exactly the thing a reader about to ask for a proforma needs
 * checking. The slugs are posted, and the route answers with today's figures.
 */
function readBasket(): StoredLine[] | null {
  try {
    const raw = window.localStorage.getItem(BASKET_KEY)
    if (!raw) return []
    const lines: unknown = JSON.parse(raw)
    if (!Array.isArray(lines)) return []
    const out: StoredLine[] = []
    for (const line of lines) {
      if (typeof line?.slug !== 'string' || typeof line?.qty !== 'number') continue
      out.push({
        slug: line.slug,
        qty: line.qty,
        price: typeof line.price === 'number' ? line.price : 0,
        name: typeof line.name === 'string' ? line.name : line.slug,
      })
    }
    return out
  } catch {
    return null
  }
}

const folded = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)

/** The scope, written into the query string the route reads back. */
function scopeParams(params: URLSearchParams, scope: AssistantScope): void {
  if (scope.q) params.set('t', scope.q)
  if (scope.marque) params.set('br', scope.marque)
  if (scope.min !== undefined) params.set('mn', String(scope.min))
  if (scope.max !== undefined) params.set('mx', String(scope.max))
  if (scope.stock) params.set('st', '1')
  if (scope.remise) params.set('rm', '1')
}

/**
 * The carried query, written out as a sentence.
 *
 * It is what the docket records as the question when a filter is dropped from
 * the bar, so the entry reads "caméra, en stock" rather than a machine's idea of
 * a query. Written in the same order the tokens are drawn.
 */
function phrase(scope: AssistantScope): string {
  const parts: string[] = [scope.q ?? '']
  if (scope.marque) parts.push(`chez ${scope.marque}`)
  if (scope.min !== undefined && scope.max !== undefined) {
    parts.push(`entre ${formatAmount(scope.min)} et ${formatAmount(scope.max)}`)
  } else if (scope.max !== undefined) parts.push(`sous ${formatAmount(scope.max)}`)
  else if (scope.min !== undefined) parts.push(`au-dessus de ${formatAmount(scope.min)}`)
  if (scope.stock) parts.push('en stock')
  if (scope.remise) parts.push('démarqué')
  return parts.filter(Boolean).join(', ')
}

/** One removable piece of the carried query. */
interface Token {
  readonly key: string
  readonly label: string
  /** The query that remains once this token is taken off. */
  readonly without: AssistantScope
}

function tokensOf(scope: AssistantScope): Token[] {
  const out: Token[] = []
  if (scope.q) out.push({ key: 'q', label: scope.q, without: {} })
  if (scope.marque) {
    out.push({ key: 'marque', label: scope.marque, without: { ...scope, marque: undefined } })
  }
  if (scope.min !== undefined && scope.max !== undefined) {
    out.push({
      key: 'prix',
      label: `${formatAmount(scope.min)} à ${formatAmount(scope.max)}`,
      without: { ...scope, min: undefined, max: undefined },
    })
  } else if (scope.max !== undefined) {
    out.push({
      key: 'max',
      label: `sous ${formatAmount(scope.max)}`,
      without: { ...scope, max: undefined },
    })
  } else if (scope.min !== undefined) {
    out.push({
      key: 'min',
      label: `au-dessus de ${formatAmount(scope.min)}`,
      without: { ...scope, min: undefined },
    })
  }
  if (scope.stock) out.push({ key: 'stock', label: 'en stock', without: { ...scope, stock: undefined } })
  if (scope.remise) {
    out.push({ key: 'remise', label: 'démarqué', without: { ...scope, remise: undefined } })
  }
  return out
}

export function Assistant() {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])
  /** The opening panel, built by the server from the live export. See `Opening`. */
  const [greeting, setGreeting] = useState<AssistantReply | null>(null)
  /**
   * The whole of Bod's memory, and now the only piece of state the reader can
   * see and undo. It was a ref, which is why nothing could draw it.
   */
  const [scope, setScope] = useState<AssistantScope | null>(null)

  const counter = useRef(1)
  const launcher = useRef<HTMLButtonElement>(null)
  const surface = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLInputElement>(null)
  const thread = useRef<HTMLDivElement>(null)
  const newest = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const sheet = useMedia('(max-width: 767.98px)')

  /**
   * How many pixels the on-screen keyboard is eating, or 0 when there is none.
   *
   * ANDROID CHROME SHRINKS THE VISUAL VIEWPORT AND LEAVES THE LAYOUT ALONE, so a
   * surface pinned to the bottom of the layout viewport does not move when the
   * keys arrive. Measured at 360 x 640 on the old panel: the composer sat at
   * y=509 with the keys starting around y=370, so the one control this thing
   * exists for was behind the keyboard the moment it was used. `visualViewport`
   * is the only thing that knows. Under 80 pixels of inset there is no keyboard,
   * the state stays 0, and no inline geometry is written at all.
   */
  const [keyboard, setKeyboard] = useState(0)
  const [visible, setVisible] = useState(0)

  useEffect(() => {
    const view = window.visualViewport
    if (!open || !view) return

    const measure = () => {
      const eaten = window.innerHeight - view.height - view.offsetTop
      setKeyboard(eaten < 80 ? 0 : Math.round(eaten))
      setVisible(Math.round(view.height))
    }

    measure()
    view.addEventListener('resize', measure)
    view.addEventListener('scroll', measure)
    return () => {
      view.removeEventListener('resize', measure)
      view.removeEventListener('scroll', measure)
      setKeyboard(0)
    }
  }, [open])

  /* The phone sheet covers the page and brings its own way out, so the page
     behind it must not scroll. The desktop panel covers nothing and does not
     take the page away from the reader. */
  useEffect(() => {
    if (!open || !sheet) return
    return lockScroll()
  }, [open, sheet])

  /**
   * The newest ENTRY at the top of the view, not the bottom of the thread.
   *
   * Scrolling to the bottom is what a chat does, and it is wrong for an answer
   * that can be thirty lines of figures, bands and merchandise: the reader would
   * land under three product rows with the sentence explaining them already off
   * the top of the screen. Putting the question at the top means the answer is
   * read in the order it was written.
   *
   * IT RUNS TWICE, AND THE SECOND TIME IS THE ONE THAT MATTERS. The first pass
   * fires when the question is added and the entry is still one line tall; the
   * answer then renders underneath and the thread grows. Watching the newest
   * turn's reply as well is what puts the question back at the top once the
   * answer it belongs to has arrived.
   */
  const settled = turns[turns.length - 1]?.reply !== null && turns.length > 0
  useEffect(() => {
    const box = thread.current
    const entry = newest.current
    if (!open || !box || !entry) return
    box.scrollTo({ top: entry.offsetTop, behavior: reduced ? 'auto' : 'smooth' })
  }, [turns.length, settled, open, reduced])

  useEffect(() => {
    if (open) field.current?.focus()
  }, [open])

  /**
   * The opening panel, asked for once.
   *
   * It is built by the route out of the live export, so the reference number in
   * its example is a reference that exists today and the figures are the
   * catalogue's own rather than three numbers typed into a constant last month.
   * A failure is silent: `Opening` falls back to the written list, which names
   * nothing that can go out of stock.
   */
  useEffect(() => {
    if (!open || greeting !== null) return
    let live = true
    fetch('/api/assistant?mode=ouverture')
      .then((response) => response.json())
      .then((reply: AssistantReply) => {
        if (live) setGreeting(reply)
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [open, greeting])

  const close = useCallback(() => {
    setOpen(false)
    launcher.current?.focus()
  }, [])

  /**
   * Escape closes; Tab stays inside the phone sheet.
   *
   * The trap is deliberately only on the phone. There the panel is
   * `aria-modal` and covers the page, so a keyboard leaving it lands on
   * controls the reader cannot see. On a desktop the panel covers nothing, it
   * is not modal, and trapping the keyboard inside a 432-pixel column standing
   * in the corner of a working page would be taking the page hostage.
   */
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
        return
      }
      if (event.key !== 'Tab' || !sheet) return
      const root = surface.current
      if (!root) return
      const stops = [...root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input')]
      if (stops.length === 0) return
      const first = stops[0]
      const last = stops[stops.length - 1]
      const active = document.activeElement
      if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && (active === first || !root.contains(active))) {
        event.preventDefault()
        last.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, sheet, close])

  /**
   * The launcher steps out of the way while the reader is going down the page.
   *
   * MEASURED, NOT ASSUMED: at 390 x 844 on the home page the 52-pixel disc sat
   * at 322,776 directly over the "Voir le rayon ordinateurs" link, which is a
   * floating control covering a real one. A phone has no corner that is
   * reliably empty, so the disc retreats the moment the reader scrolls down and
   * comes back the moment they stop or turn around, which is exactly when they
   * are looking for it rather than reading past it.
   *
   * The state flips on a change of DIRECTION, not on every frame, so this
   * re-renders twice per gesture rather than sixty times a second. Under
   * reduced motion it never retreats: a control that vanishes is worse than one
   * that overlaps for a reader who asked the interface to hold still.
   */
  const { scrollY } = useScroll()
  const lastY = useRef(0)
  const [tucked, setTucked] = useState(false)

  useMotionValueEvent(scrollY, 'change', (value) => {
    const next = value > lastY.current + 4 && value > 200
    const back = value < lastY.current - 4 || value < 120
    lastY.current = value
    if (next && !tucked) setTucked(true)
    else if (back && tucked) setTucked(false)
  })

  /* Two reasons to be gone, and only one of them is about motion. The sheet
     covers the whole phone screen and the disc would land on the composer, so
     that one holds even under reduced motion. */
  const away = (open && sheet) || (!open && tucked && !reduced)

  /**
   * The basket question, answered where the basket is.
   *
   * The slugs live in this browser and nowhere else, so they are read here; the
   * prices live in the export, so they are read there. The two halves meet in
   * one POST, which is also why this is the only question that does not travel
   * as a query string: a list of forty slugs is a truncation waiting to happen.
   */
  const askBasket = useCallback(
    async (question: string) => {
      const stored = readBasket()
      const id = counter.current++
      if (stored === null) {
        setTurns((current) => [
          ...current,
          {
            id,
            question,
            reply: { intent: 'panier', text: 'Ce navigateur ne me laisse pas lire le panier.', handoff: true },
          },
        ])
        return
      }

      setBusy(true)
      setTurns((current) => [...current, { id, question, reply: null }])
      try {
        const response = await fetch('/api/assistant', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ lines: stored }),
        })
        const reply = (await response.json()) as AssistantReply
        setTurns((current) => current.map((turn) => (turn.id === id ? { ...turn, reply } : turn)))
      } catch {
        setTurns((current) =>
          current.map((turn) =>
            turn.id === id ? { ...turn, reply: { intent: 'main', text: OFFLINE, handoff: true } } : turn,
          ),
        )
      } finally {
        setBusy(false)
      }
    },
    [],
  )

  const ask = useCallback(
    async (question: string, pinned?: AssistantScope) => {
      const asked = question.trim()
      if (!asked || busy) return
      setDraft('')

      const words = folded(asked)
      if (!pinned && words.some((word) => CART_CUES.includes(word)) && words.length <= 5) {
        void askBasket(asked)
        return
      }

      const id = counter.current++
      setBusy(true)
      setTurns((current) => [...current, { id, question: asked, reply: null }])

      try {
        const params = new URLSearchParams({ q: asked })
        /* A PINNED FOLLOW-UP CARRIES ITS OWN QUERY AND SAYS SO. `sc=1` tells the
           route to use the scope verbatim instead of re-reading the sentence,
           which is what keeps the count on a pressed button and the count in the
           answer it opens the same arithmetic. */
        if (pinned) {
          scopeParams(params, pinned)
          params.set('sc', '1')
        } else if (scope) {
          scopeParams(params, scope)
        }

        const response = await fetch(`/api/assistant?${params}`)
        const reply = (await response.json()) as AssistantReply
        setScope(reply.scope ?? null)
        setTurns((current) => current.map((turn) => (turn.id === id ? { ...turn, reply } : turn)))
      } catch {
        setTurns((current) =>
          current.map((turn) =>
            turn.id === id ? { ...turn, reply: { intent: 'main', text: OFFLINE, handoff: true } } : turn,
          ),
        )
      } finally {
        setBusy(false)
      }
    },
    [busy, scope, askBasket],
  )

  const follow = useCallback((entry: AssistantFollow) => ask(entry.ask, entry.scope), [ask])

  /**
   * Taking a filter off.
   *
   * Dropping the words drops everything, because a query with a budget and no
   * merchandise is not a narrower question, it is a different one. Dropping
   * anything else re-runs the remaining query verbatim, which is why the token
   * carries the scope rather than a sentence to be parsed again.
   */
  const drop = useCallback(
    (token: Token) => {
      if (token.key === 'q' || !token.without.q) {
        setScope(null)
        return
      }
      ask(phrase(token.without), token.without)
    },
    [ask],
  )

  const marks = scope ? tokensOf(scope) : []

  const panel = (
    <motion.div
      key="panel"
      ref={surface}
      role="dialog"
      aria-modal={sheet}
      aria-label="Bod, assistant du comptoir"
      initial={reduced ? { opacity: 0 } : sheet ? { y: '100%' } : { opacity: 0, y: 16, scale: 0.98 }}
      animate={reduced ? { opacity: 1 } : sheet ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
      exit={reduced ? { opacity: 0 } : sheet ? { y: '100%' } : { opacity: 0, y: 12, scale: 0.98 }}
      transition={reduced ? { duration: 0 } : sheet ? SHEET : SPRING}
      style={{
        transformOrigin: 'bottom right',
        // Written only while a keyboard is up. See `keyboard` above.
        ...(keyboard > 0
          ? { bottom: `${keyboard}px`, maxHeight: `${Math.max(220, visible - 16)}px` }
          : null),
      }}
      /* A SHEET ON A PHONE, A PANEL ON A DESKTOP, AND THE DIFFERENCE IS NOT
         cosmetic. At 390 a floating card left the page showing around all four
         sides, which reads as something dropped on the site rather than part of
         it, and it left the composer 88 pixels up from the thumb. Full width off
         the bottom edge is where a phone puts a surface that owns the screen,
         its head is the first thing in the flex column so the way out is visible
         at every scroll position, and `dvh` rather than `vh` because on iOS the
         address bar is counted into `vh`. From `md` up the sheet becomes a
         432-pixel column standing off the corner its launcher is in. */
      className="fixed inset-x-0 bottom-0 z-[var(--z-assistant)] flex max-h-[86dvh] flex-col overflow-hidden rounded-t-space bg-paper shadow-[var(--shadow-panel)] ring-1 ring-rule md:inset-x-auto md:right-6 md:bottom-24 md:max-h-[min(84dvh,44rem)] md:w-[27rem] md:rounded-space"
    >
      {/* THE PRINTED HEAD RULE. Three pixels of the mark's own green across the
          top edge: the one place --brand is unambiguously a shape, carrying the
          shop's colour without putting a word on it. It is also what tells a
          reader in one glance that this panel belongs to this site. */}
      <span aria-hidden className="block h-[3px] shrink-0 bg-brand" />

      <header className="flex shrink-0 items-center gap-3 border-b border-rule px-4 py-3 md:px-5">
        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full ring-1 ring-rule">
          <span className="relative block size-7">
            <Image src="/logo/bod.png" alt="" fill sizes="28px" className="object-contain" />
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-body leading-tight font-bold tracking-[-0.01em] text-ink">Bod</span>
          <span className="mt-0.5 block text-micro leading-tight text-ink-3">
            En lecture directe du catalogue
          </span>
        </span>
        <button
          type="button"
          data-bod-close
          onClick={close}
          aria-label="Fermer l’assistant"
          className="press -mr-1.5 grid size-11 shrink-0 place-items-center rounded-control text-ink-3 transition-colors duration-[var(--t-fast)] hover:text-ink"
        >
          <IconClose className="text-[1.125rem]" />
        </button>
      </header>

      {/* THE MEMORY, MADE VISIBLE AND REVOCABLE. See the file head: this is the
          query the next question will be answered inside, and every token takes
          itself off. Without it the panel silently bounded every later answer
          and there was no way to see it, let alone undo it. */}
      <AnimatePresence initial={false}>
        {marks.length > 0 ? (
          <motion.div
            key="scope"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.18 }}
            className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-rule px-4 py-2 md:px-5 md:py-2.5"
          >
            <span className="t-label shrink-0 text-ink-3">Je filtre sur</span>
            {marks.map((token) => (
              <button
                key={token.key}
                type="button"
                onClick={() => drop(token)}
                aria-label={`Retirer le filtre ${token.label}`}
                className="press group inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-pill border border-rule pr-2.5 pl-3.5 text-micro whitespace-nowrap text-ink-2 transition-colors duration-[var(--t-fast)] hover:bg-space hover:text-ink md:min-h-8 md:pr-2 md:pl-3"
              >
                {token.label}
                <IconClose className="text-[0.75rem] text-ink-3 transition-colors duration-[var(--t-fast)] group-hover:text-ink" />
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div
        ref={thread}
        data-bod-thread
        className="relative flex-1 overflow-y-auto overscroll-contain px-4 pb-7 md:px-5"
      >
        {turns.length === 0 ? <Opening greeting={greeting} onAsk={ask} onFollow={follow} /> : null}

        {turns.map((turn, index) => (
          <div key={turn.id} ref={index === turns.length - 1 ? newest : undefined}>
            {/* THE ENTRY'S OWN RULE, in the ink and full width, against the
                hairlines every block inside the answer opens on. Two weights of
                line are the whole hierarchy of this panel.

                The head is sticky, so the question is still readable while a
                thirty-line answer goes past it. */}
            <div className="sticky top-0 z-10 bg-paper pt-5">
              {/* THE ENTRY'S RULE IS DRAWN, NOT BORDERED, AND THAT IS NOT A STYLE
                  CHOICE. `globals.css` carries an UNLAYERED `* { border-color:
                  var(--rule) }`, and unlayered CSS beats everything Tailwind puts
                  in `@layer utilities` whatever its specificity, so `border-ink`
                  resolves to the hairline like every other border colour on this
                  site. Measured: rgb(226 229 224) where rgb(20 23 21) was asked
                  for. A background on a one-pixel block is not subject to that
                  rule and gives the entry the weight the hierarchy needs.

                  The hairline UNDER the question is what the sticky head needs to
                  be readable: measured at 390, a chip from the answer above was
                  sliced through its own outline at the head's lower edge and read
                  as a rendering fault. A rule turns that edge into an edge. */}
              <span aria-hidden className="block h-px bg-ink" />
              <div className="flex items-baseline gap-4 border-b pt-2.5 pb-2.5">
                <p className="min-w-0 flex-1 text-body leading-[1.4] font-semibold text-ink">
                  {turn.question}
                </p>
                <span className="t-label shrink-0 text-ink-3">
                  {turn.reply ? INTENT_LABEL[turn.reply.intent] : 'En cours'}
                </span>
              </div>
            </div>

            {turn.reply ? (
              <Answer
                reply={turn.reply}
                question={turn.question}
                onFollow={follow}
                reduced={Boolean(reduced)}
              />
            ) : (
              <Counting />
            )}
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t border-rule bg-paper px-3 py-3 md:px-4">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            ask(draft)
          }}
          /* The frame is the field itself and not the whole bar. Painted on the
             bar, the focus state that `.field` draws put a green rectangle round
             the bottom of the panel every time the reader typed. */
          className="field flex items-center gap-2 rounded-control border border-rule pr-1.5 pl-3 transition-colors duration-[var(--t-fast)]"
        >
          <label htmlFor="bod-field" className="sr-only">
            Votre question
          </label>
          <input
            ref={field}
            id="bod-field"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Caméra à moins de 50 000…"
            autoComplete="off"
            /* 16px on a phone: under that, Safari zooms the whole page when the
               field takes focus, and this field takes focus by itself the moment
               the panel opens. */
            className="min-h-11 min-w-0 flex-1 bg-transparent text-[1rem] outline-none placeholder:text-ink-3 md:min-h-10 md:text-small"
          />
          <button
            type="submit"
            disabled={busy || draft.trim().length === 0}
            aria-label="Envoyer la question"
            className="press grid size-11 shrink-0 place-items-center rounded-control bg-accent text-paper transition-colors duration-[var(--t-fast)] hover:bg-accent-ink disabled:pointer-events-none disabled:opacity-25 md:size-9"
          >
            <IconArrowRight className="text-[1.0625rem]" />
          </button>
        </form>
      </div>
    </motion.div>
  )

  return (
    <>
      <AnimatePresence>
        {open ? (
          <>
            {/* The sheet takes the phone screen, so the page behind it says so.
                The desktop panel takes nothing and gets no scrim. */}
            {sheet ? (
              <motion.button
                key="scrim"
                type="button"
                aria-label="Fermer l’assistant"
                onClick={() => setOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.2 }}
                className="fixed inset-0 z-[var(--z-assistant)] bg-[rgb(20_23_21_/_0.45)] md:hidden"
              />
            ) : null}
            {panel}
          </>
        ) : null}
      </AnimatePresence>

      <motion.button
        ref={launcher}
        type="button"
        data-bod-launcher
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-hidden={away}
        tabIndex={away ? -1 : undefined}
        aria-label={open ? 'Fermer l’assistant' : 'Ouvrir Bod, l’assistant du comptoir'}
        animate={{ y: away ? 88 : 0, opacity: away ? 0 : 1 }}
        transition={reduced ? { duration: 0 } : { duration: 0.24, ease: [0.22, 1, 0.28, 1] }}
        whileTap={reduced ? undefined : { scale: 0.96 }}
        style={{ pointerEvents: away ? 'none' : 'auto' }}
        // White disc, not a green one: the artwork is a green bot, and set on
        // the brand green it disappears into its own background.
        className="fixed right-4 bottom-4 z-[var(--z-assistant)] grid size-13 place-items-center overflow-hidden rounded-full bg-paper ring-1 ring-rule shadow-[var(--shadow-panel)] sm:right-6 sm:bottom-6 md:size-14"
      >
        <span className="relative block size-10 md:size-11">
          <Image src="/logo/bod.png" alt="" fill sizes="44px" className="object-contain" />
        </span>
      </motion.button>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* While the catalogue is being scanned                                       */
/* -------------------------------------------------------------------------- */

/**
 * The shape of the answer, before the answer.
 *
 * A sentence reading "Bod compte…" tells the reader nothing about what is
 * coming and leaves the panel jumping by four hundred pixels when it lands.
 * These are the three blocks every catalogue answer has, drawn empty, so the
 * layout is already the right height and the arrival is a fill rather than a
 * shove.
 */
function Counting() {
  return (
    <div className="pt-1" aria-hidden>
      <span className="block h-3 w-4/5 rounded-pill bg-space" />
      <span className="mt-2 block h-3 w-3/5 rounded-pill bg-space" />
      <div className="mt-5 flex gap-6 border-t border-rule pt-3.5">
        <span className="block h-8 flex-1 rounded-control bg-space" />
        <span className="block h-8 flex-1 rounded-control bg-space" />
      </div>
      <span className="sr-only" role="status">
        Bod compte
      </span>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Before the first question                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The opening panel, and the only place Bod's range is stated in full.
 *
 * THREE THINGS, IN THE ORDER A STRANGER NEEDS THEM. What this is and what it
 * refuses to do. What it reads, in the export's own figures, which is the
 * fastest possible proof that there is a real catalogue behind the field. Then
 * questions that work, each one pressable, each one arriving from the server so
 * that the reference number in the example is a reference that exists today.
 *
 * The conditions sit apart at the bottom, because they are a different kind of
 * promise: those answers are written down and will not change with the stock.
 */
function Opening({
  greeting,
  onAsk,
  onFollow,
}: {
  greeting: AssistantReply | null
  onAsk: (question: string) => void
  onFollow: (entry: AssistantFollow) => void
}) {
  const examples: AssistantFollow[] =
    greeting?.next && greeting.next.length > 0
      ? [...greeting.next]
      : CAPABILITIES.map((capability) => ({ label: capability.title, ask: capability.example }))

  return (
    <div className="pt-5">
      <p className="text-small leading-[1.65] text-ink-2">{greeting?.text ?? OPENING}</p>

      {greeting?.figures && greeting.figures.length > 0 ? (
        <Figures figures={greeting.figures} />
      ) : null}

      <span aria-hidden className="mt-7 block h-px bg-ink" />
      <ul>
        {examples.map((example) => (
          <li key={example.ask}>
            <button
              type="button"
              onClick={() => onFollow(example)}
              className="press group flex min-h-14 w-full items-center gap-3 border-b border-rule py-2.5 text-left"
            >
              {/* THE QUESTION LEADS AND THE CLASSIFIER FOLLOWS IT, in the page's
                  own face. Stacked above the question in small caps it was an
                  eyebrow six rows deep, and because tracked capitals are wider
                  than the sentence under them the quiet line was reading louder
                  than the thing the reader is meant to press. */}
              <span className="min-w-0 flex-1">
                <span className="block text-small leading-[1.4] text-ink transition-colors duration-[var(--t-fast)] group-hover:text-accent">
                  {example.ask}
                </span>
                <span className="mt-1 block text-micro leading-[1.4] text-ink-3">{example.label}</span>
              </span>
              <IconArrowRight className="travel shrink-0 text-[1rem] text-ink-3" />
            </button>
          </li>
        ))}
      </ul>

      <p className="t-label mt-7 text-ink-3">Les conditions de la maison</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {TOPICS.map((topic) => (
          <button
            key={topic.id}
            type="button"
            onClick={() => onAsk(topic.label)}
            /* 44 on a phone, 32 from `md` up. A chip is a suggestion and not a
               decision, but eight of them at 32 pixels on a touch screen is
               eight ways to open the wrong one. */
            className="press inline-flex min-h-11 items-center rounded-pill border border-rule px-3.5 text-micro text-ink-2 transition-colors duration-[var(--t-fast)] hover:bg-space hover:text-ink md:min-h-8 md:px-3"
          >
            {topic.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* One answer                                                                 */
/* -------------------------------------------------------------------------- */

function Answer({
  reply,
  question,
  onFollow,
  reduced,
}: {
  reply: AssistantReply
  question: string
  onFollow: (entry: AssistantFollow) => void
  reduced: boolean
}) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, filter: 'blur(6px)', y: 8 }}
      animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
      transition={reduced ? { duration: 0 } : RESOLVE}
    >
      <p className="text-small leading-[1.65] text-ink-2">{reply.text}</p>

      {reply.figures && reply.figures.length > 0 ? <Figures figures={reply.figures} /> : null}

      {reply.compare ? <Compare compare={reply.compare} /> : null}

      {reply.basket ? <Basket basket={reply.basket} /> : null}

      {reply.products && reply.products.length > 0 ? (
        <ul className="mt-5 border-t border-rule">
          {reply.products.map((product) => (
            <li key={product.slug} className="border-b border-rule">
              <Row product={product} />
            </li>
          ))}
        </ul>
      ) : null}

      {reply.bands && reply.bands.length > 0 ? (
        <Ladder bands={reply.bands} onFollow={onFollow} reduced={reduced} />
      ) : null}

      {reply.tallies && reply.tallies.length > 0 ? (
        <Tallies tallies={reply.tallies} onFollow={onFollow} />
      ) : null}

      {reply.families && reply.families.length > 0 ? (
        <ul className="mt-5 border-t border-rule">
          {reply.families.map((family) => (
            <li key={family.href} className="border-b border-rule">
              <Link
                href={family.href}
                className="group flex min-h-12 items-center gap-3 py-2 text-small text-ink transition-colors duration-[var(--t-fast)] hover:text-accent"
              >
                <IconBox className="shrink-0 text-[1.0625rem] text-accent" />
                <span className="clamp-1 min-w-0 flex-1">{family.label}</span>
                {family.count !== undefined ? (
                  <span className="t-num shrink-0 text-micro text-ink-3">
                    {formatAmount(family.count)}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {reply.links && reply.links.length > 0 ? (
        <div className="mt-4 flex flex-col items-start gap-1">
          {reply.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group inline-flex min-h-11 items-center gap-2 text-small font-semibold text-accent transition-colors duration-[var(--t-fast)] hover:text-accent-ink md:min-h-9"
            >
              <span className="draw-under">{link.label}</span>
              {link.count !== undefined ? (
                <span className="t-num font-normal text-ink-3">{formatAmount(link.count)}</span>
              ) : null}
              <IconArrowRight className="travel text-[1rem]" />
            </Link>
          ))}
        </div>
      ) : null}

      {reply.next && reply.next.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {reply.next.map((entry) => (
            <button
              key={entry.label}
              type="button"
              onClick={() => onFollow(entry)}
              className="press inline-flex min-h-11 items-center rounded-pill border border-rule px-3.5 text-micro text-ink-2 transition-colors duration-[var(--t-fast)] hover:bg-space hover:text-ink md:min-h-8 md:px-3"
            >
              {entry.label}
            </button>
          ))}
        </div>
      ) : null}

      {reply.handoff ? (
        <a
          href={`https://wa.me/${dialable(WHATSAPP)}?text=${encodeURIComponent(question)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fill press mt-5 inline-flex min-h-11 items-center gap-2.5 rounded-control bg-accent px-5 text-[0.875rem] font-bold text-paper transition-colors duration-[var(--t-fast)] [--fill-to:var(--accent-ink)] md:min-h-10"
        >
          Poser la question au comptoir
          <IconArrowRight className="travel text-[1rem]" />
        </a>
      ) : null}
    </motion.div>
  )
}

/* -------------------------------------------------------------------------- */
/* The measured parts                                                         */
/* -------------------------------------------------------------------------- */

/**
 * The figure strip: the part a speech bubble had nowhere to put.
 *
 * EVERY CELL IS THE WIDTH OF WHAT IS IN IT, AND THAT IS THE WHOLE FIX. A grid
 * gives each figure the same width whatever it holds, and this panel puts the
 * two characters `87` beside `7 500 à 200 000 FCFA`: measured at three equal
 * columns each cell was 110 pixels inside the 350-pixel phone thread and 125
 * inside the 432-pixel desktop column, so the range broke over three lines in
 * both while its neighbour used a sixth of its cell. A media query could not
 * have helped, since the panel is 432 pixels wide on a 1440-pixel screen and the
 * constraint is the panel rather than the viewport. Wrapping content-sized cells
 * puts three short figures on one line and lets a long one take the room it
 * needs. The currency lives in the label, which is where a unit belongs.
 *
 * ONE RULE PER BLOCK, STRUCK ABOVE IT. The strip used to be framed top AND
 * bottom, so its closing rule and the opening rule of the merchandise list
 * beneath it landed twenty pixels apart and read as a mistake. Every block in an
 * answer is now introduced by a single hairline and closes on nothing, which is
 * how a ledger is ruled.
 *
 * THE VALUE IS A STEP LARGER THAN THE SENTENCE ABOVE IT. These figures are the
 * reason this panel exists rather than a search field, and at 13px they were the
 * same size as the prose explaining them. Body against small, in tabular mono,
 * is what makes a count read as a measurement.
 *
 * Tabular figures are for figures only. A counter's street directions arrive
 * with `wide` and take the page's own face across the full width, because
 * monospace on a street name is a costume rather than a measurement.
 */
function Figures({ figures }: { figures: NonNullable<AssistantReply['figures']> }) {
  return (
    <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-4 border-t border-rule pt-3.5">
      {figures.map((figure) =>
        figure.wide ? (
          <div key={figure.label} className="min-w-0 basis-full">
            <dt className="text-micro leading-[1.4] text-ink-3">{figure.label}</dt>
            <dd className="mt-0.5 text-small leading-[1.5] text-ink">{figure.value}</dd>
          </div>
        ) : (
          <div key={figure.label} className="min-w-0 max-w-full">
            <dt className="text-micro leading-[1.35] text-ink-3">{figure.label}</dt>
            <dd className="t-num mt-1 text-body leading-[1.25] font-bold text-ink">{figure.value}</dd>
          </div>
        ),
      )}
    </dl>
  )
}

/**
 * The price ladder: where the stock of an answer actually sits.
 *
 * A MIN AND A MAX ARE NOT A BUDGET ANSWER. "camera" spans 150 to 1 620 000 FCFA,
 * which is arithmetically true and useless: it is one doorbell button and one
 * thermal camera, and the 421 references between them are the question. Three
 * counted bands cut at the set's own tertiles say where the shop is, and each
 * band is a query Bod can run.
 *
 * THE BAR IS A HAIRLINE AND NOT A TRACK. A filled grey rail with a coloured
 * bar on top is dashboard furniture; this site draws hairlines and has one
 * green, and a rule whose length IS the share says the same thing with the
 * page's own vocabulary. The green is the mark's own, which is allowed here
 * because it is a shape and never a ground under type.
 */
function Ladder({
  bands,
  onFollow,
  reduced,
}: {
  bands: readonly AssistantBand[]
  onFollow: (entry: AssistantFollow) => void
  reduced: boolean
}) {
  return (
    <div className="mt-6">
      <p className="t-label text-ink-3">Où se trouvent les prix</p>
      <ul className="mt-2.5 border-t border-rule">
        {bands.map((rung, index) => (
          <li key={rung.label}>
            <button
              type="button"
              onClick={() => onFollow(rung.follow)}
              className="press group block w-full border-b border-rule py-2.5 text-left"
            >
              <span className="flex min-h-6 items-baseline gap-3">
                <span className="min-w-0 flex-1 text-small text-ink transition-colors duration-[var(--t-fast)] group-hover:text-accent">
                  {rung.label}
                </span>
                <span className="t-num shrink-0 text-small font-bold text-ink">
                  {formatAmount(rung.count)}
                </span>
              </span>
              <span aria-hidden className="mt-2 block">
                <motion.span
                  className="block h-0.5 bg-brand"
                  style={{ width: `${Math.max(2, Math.round(rung.share * 100))}%`, transformOrigin: '0% 50%' }}
                  initial={reduced ? false : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={reduced ? { duration: 0 } : { ...DRAW, delay: 0.08 * index }}
                />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Which manufacturers the counted set is made of.
 *
 * Pills rather than a fourth list of rows: the ladder above it is already a
 * counted list under a hairline, and two of those stacked read as one long table
 * a reader stops seeing. Pressing one filters the set BY BRAND rather than
 * searching the brand's name, which is why the number on the pill is the number
 * the next answer prints.
 */
function Tallies({
  tallies,
  onFollow,
}: {
  tallies: readonly AssistantTally[]
  onFollow: (entry: AssistantFollow) => void
}) {
  return (
    <div className="mt-6">
      <p className="t-label text-ink-3">Les marques de cette liste</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {tallies.map((tally) => (
          <button
            key={tally.label}
            type="button"
            onClick={() => onFollow(tally.follow)}
            className="press inline-flex min-h-11 items-center gap-2 rounded-pill border border-rule px-3.5 transition-colors duration-[var(--t-fast)] hover:bg-space md:min-h-9"
          >
            <span className="text-micro text-ink-2">{tally.label}</span>
            <span className="t-num text-micro text-ink-3">{formatAmount(tally.count)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * A product, as a row and never as a card.
 *
 * A card is for a grid a reader compares across. This is at most three answers
 * inside a 432-pixel column that is itself already a panel, and a card inside a
 * panel is a box inside a box: the site's own language separates rows with a
 * hairline and nothing else, which is also what leaves the photograph its edge.
 */
function Row({ product }: { product: AssistantProduct }) {
  return (
    <Link
      href={`/produit/${product.slug}`}
      className="group flex items-center gap-3.5 py-3 transition-colors duration-[var(--t-fast)]"
    >
      <span className="relative block size-13 shrink-0 overflow-hidden rounded-control bg-space">
        {product.image ? (
          <Image src={product.image} alt="" fill sizes="52px" className="object-contain p-1" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="clamp-2 block text-small leading-[1.35] text-ink group-hover:text-accent">
          {product.name}
        </span>
        <span className="mt-1 flex items-baseline gap-2">
          <span className="t-num text-small font-bold text-ink">{formatPrice(product.price)}</span>
          {product.inStock ? null : <span className="text-micro text-warn">sur commande</span>}
        </span>
        {product.specs.length > 0 ? (
          <span className="clamp-1 mt-0.5 block text-micro text-ink-3">
            {product.specs.slice(0, 2).join(' · ')}
          </span>
        ) : null}
      </span>
    </Link>
  )
}

/**
 * The reader's own basket, re-read against today's catalogue.
 *
 * TWO PRICES ARE PRINTED ONLY WHERE THERE ARE TWO. `lib/cart.tsx` stores the
 * price a line was ADDED at and joins the catalogue at render, which is right
 * for a shop that reprices at the counter and exactly the thing a reader about
 * to ask for a proforma needs checked. A second figure on every line of an
 * unchanged basket teaches the reader to stop looking, so the earlier price
 * appears on the lines that moved and nowhere else.
 *
 * The quantity is written as the multiplication it is, `3 × 18 500`, so the line
 * total is checkable without arithmetic on the reader's part.
 */
function Basket({ basket }: { basket: AssistantBasket }) {
  return (
    <ul className="mt-5 border-t border-rule">
      {basket.lines.map((line) => (
        <li key={line.slug} className="border-b border-rule">
          <LineBody slug={line.slug} live={line.price !== null}>
            <span className="flex items-baseline gap-3">
              <span
                className={`clamp-2 min-w-0 flex-1 text-small leading-[1.4] ${
                  line.price === null
                    ? 'text-ink-3'
                    : 'text-ink transition-colors duration-[var(--t-fast)] group-hover:text-accent'
                }`}
              >
                {line.name}
              </span>
              {line.price !== null ? (
                <span className="t-num shrink-0 text-small font-bold text-ink">
                  {formatAmount(line.price * line.qty)}
                </span>
              ) : null}
            </span>
            <span className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <span className="t-num text-micro text-ink-3">
                {line.price === null
                  ? `${formatAmount(line.qty)} article${line.qty > 1 ? 's' : ''}`
                  : `${formatAmount(line.qty)} × ${formatAmount(line.price)}`}
              </span>
              {line.price === null ? (
                <span className="text-micro text-warn">n’est plus au catalogue</span>
              ) : null}
              {line.price !== null && line.was > 0 && line.was !== line.price ? (
                <span className="t-num text-micro text-secondary-ink">
                  ajouté à {formatAmount(line.was)}
                </span>
              ) : null}
              {line.price !== null && !line.inStock ? (
                <span className="text-micro text-warn">sur commande</span>
              ) : null}
            </span>
          </LineBody>
        </li>
      ))}
    </ul>
  )
}

/**
 * The whole line is the target, or none of it is.
 *
 * Measured on the phone: the product name inside a basket row was an 18-pixel
 * anchor in a 60-pixel row, which is a thumb-sized row with a fingernail-sized
 * link in it. A line the catalogue still carries is one 60-pixel link; a line it
 * has dropped is not a link at all, because there is no page left to open.
 */
function LineBody({
  slug,
  live,
  children,
}: {
  slug: string
  live: boolean
  children: React.ReactNode
}) {
  return live ? (
    <Link href={`/produit/${slug}`} className="group block py-3">
      {children}
    </Link>
  ) : (
    <div className="py-3">{children}</div>
  )
}

/**
 * Two references, side by side.
 *
 * IT STATES WHAT IT HOLDS AND NEVER FILLS THE GAP. The specifications were
 * parsed out of the product names at ingestion and 1 498 of the 4 254 references
 * carry at least one, so a column with nothing parsed says so rather than
 * borrowing its neighbour's. The only sentence Bod writes here is the price gap,
 * because that is the one difference that is arithmetic rather than opinion.
 */
function Compare({ compare }: { compare: NonNullable<AssistantReply['compare']> }) {
  return (
    <div className="mt-5">
      <div className="grid grid-cols-2 gap-x-4 border-t border-rule pt-3.5">
        {[compare.left, compare.right].map((column, index) => (
          <div key={column.slug} className={index === 0 ? 'min-w-0' : 'min-w-0 border-l border-rule pl-4'}>
            <Link
              href={`/produit/${column.slug}`}
              className="clamp-2 block text-micro leading-[1.45] font-semibold text-ink hover:text-accent"
            >
              {column.name}
            </Link>
            <p className="t-num mt-2 text-body leading-[1.2] font-bold text-ink">
              {formatAmount(column.price)}
            </p>
            <p className="text-micro text-ink-3">FCFA</p>
            <p className={`mt-1.5 text-micro ${column.inStock ? 'text-accent' : 'text-warn'}`}>
              {column.inStock ? 'Au comptoir' : 'Sur commande'}
            </p>
            {column.brand ? <p className="mt-1.5 text-micro text-ink-3">{column.brand}</p> : null}
            <ul className="mt-1.5">
              {column.specs.length > 0 ? (
                column.specs.map((spec) => (
                  <li key={spec} className="text-micro leading-[1.5] text-ink-2">
                    {spec}
                  </li>
                ))
              ) : (
                <li className="text-micro leading-[1.5] text-ink-3">Rien d’extrait sur cette fiche</li>
              )}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-3 text-micro leading-[1.6] text-ink-2">{compare.gap}</p>
    </div>
  )
}
