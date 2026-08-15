'use client'

import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { IconArrowRight, IconBox, IconClose } from '@/components/brand/Icons'
import {
  CAPABILITIES,
  CART_CUES,
  OFFLINE,
  OPENING,
  TOPICS,
  type AssistantIntent,
  type AssistantProduct,
  type AssistantReply,
  type AssistantScope,
} from '@/constants/assistant'
import { WHATSAPP, dialable } from '@/constants/site'
import { lockScroll } from '@/lib/scroll-lock'
import { formatAmount, formatPrice } from '@/lib/format'

/**
 * Bod, the counter assistant.
 *
 * WHAT IT IS. A counter clerk with the catalogue open in front of him. He reads
 * the shop's 4 254 references through `/api/assistant`, counts them, filters
 * them by budget, compares two of them, says what is on the shelf today, and
 * reads the house conditions out of `constants/assistant.ts`. There is no model
 * behind him, and the opening panel says so before the first question, because
 * a widget shaped like a chat that has not stated its range will be asked things
 * it cannot answer and will look broken for refusing.
 *
 * WHY IT IS NOT A CHAT, AND WHY THE BUBBLES ARE GONE. The previous version drew
 * a right-aligned green bubble for the reader and a grey one for Bod, which is
 * the costume every chat widget wears and it was actively wrong here: nothing
 * Bod returns is conversation. It is a query and its result, and a query with a
 * result is a docket, not a dialogue. So each exchange is now an ENTRY struck
 * under its own hairline: the datum rule, the question, what kind of question
 * Bod decided it was, the figures, the merchandise, and the way through to the
 * page that holds the rest. That is the same drawing language the rest of the
 * site is built in, and it means the answer can carry counts and price bands
 * that a speech bubble had nowhere to put.
 *
 * THE EIGHT TOPIC CHIPS NO LONGER FOLLOW THE READER DOWN THE THREAD. Measured at
 * 390 x 844 they occupied 404 pixels of a 533-pixel panel, repeated after every
 * single answer, and the answer they were attached to had been pushed off the
 * top of the view. They are now shown once, in the opening panel, beside the
 * list of the things Bod computes; after an answer the panel offers at most
 * three follow-ups, and each is computed from THAT answer and answerable with
 * its scope.
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
 * What Bod decided the question was, printed beside it.
 *
 * The cheapest possible form of honesty: a reader who asked for a price and sees
 * "Recherche" knows at a glance that the question was not understood, and does
 * not have to read three product rows to find that out.
 */
const INTENT_LABEL: Record<AssistantIntent, string> = {
  accueil: 'Bonjour',
  capacites: 'Ce que je sais faire',
  comptoir: 'Comptoir',
  comparaison: 'Comparaison',
  famille: 'Famille',
  infos: 'Conditions',
  marque: 'Marque',
  panier: 'Votre panier',
  prix: 'Prix',
  recherche: 'Recherche',
  stock: 'Stock',
  main: 'Je passe la main',
}

/** The basket key, read at question time. See `readBasket` for why it is copied. */
const BASKET_KEY = 'nowtech.panier.v1'

const SHEET = { duration: 0.32, ease: [0.22, 1, 0.36, 1] } as const
const SPRING = { type: 'spring', stiffness: 320, damping: 32 } as const
/** The site's own `--e-text`: a sentence resolving out of blur. */
const RESOLVE = { duration: 0.5, ease: [0.22, 1, 0.28, 1] } as const

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

/**
 * The basket, read straight out of storage at the moment it is asked about.
 *
 * `<Assistant />` is mounted in `layout.tsx` OUTSIDE `<CartProvider>`, so
 * `useCart()` here would throw, and moving the mount is not this component's to
 * do. Reading the key directly is the honest alternative, and reading it on
 * demand rather than subscribing is what makes it correct: the provider's own
 * listeners are module-private, so a subscription from outside would go stale
 * within the tab, while a read at question time cannot.
 */
function readBasket(): { count: number; total: number } | null {
  try {
    const raw = window.localStorage.getItem(BASKET_KEY)
    if (!raw) return { count: 0, total: 0 }
    const lines = JSON.parse(raw)
    if (!Array.isArray(lines)) return { count: 0, total: 0 }
    let count = 0
    let total = 0
    for (const line of lines) {
      if (typeof line?.qty !== 'number' || typeof line?.price !== 'number') continue
      count += line.qty
      total += line.price * line.qty
    }
    return { count, total }
  } catch {
    return null
  }
}

const folded = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)

export function Assistant() {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])

  const counter = useRef(1)
  const launcher = useRef<HTMLButtonElement>(null)
  const field = useRef<HTMLInputElement>(null)
  const thread = useRef<HTMLDivElement>(null)
  const newest = useRef<HTMLDivElement>(null)
  const scope = useRef<AssistantScope | null>(null)
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
   * that can be twenty lines of figures and merchandise: measured on the old
   * panel, the reader landed under three product rows with the sentence
   * explaining them already off the top of the screen. Putting the question at
   * the top means the answer is read in the order it was written.
   */
  useEffect(() => {
    const box = thread.current
    const entry = newest.current
    if (!open || !box || !entry) return
    box.scrollTo({ top: entry.offsetTop - 12, behavior: reduced ? 'auto' : 'smooth' })
  }, [turns.length, open, reduced])

  useEffect(() => {
    if (open) field.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      launcher.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  /**
   * The launcher steps out of the way while the reader is going down the page.
   *
   * MEASURED, NOT ASSUMED: at 390 x 844 on the home page the 56-pixel disc sat
   * at 318,772 directly over the "Voir le rayon ordinateurs" link, which is a
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

  const ask = async (question: string) => {
    const asked = question.trim()
    if (!asked || busy) return
    setDraft('')

    const id = counter.current++

    /* The basket lives in this browser and nowhere else, so the question about
       it is answered here rather than sent to a server that cannot see it. */
    const words = folded(asked)
    if (words.some((word) => CART_CUES.includes(word)) && words.length <= 5) {
      const basket = readBasket()
      setTurns((current) => [
        ...current,
        {
          id,
          question: asked,
          reply:
            basket === null
              ? { intent: 'panier', text: 'Ce navigateur ne me laisse pas lire le panier.', handoff: true }
              : basket.count === 0
                ? {
                    intent: 'panier',
                    text: 'Votre panier est vide. Ajoutez des références depuis une fiche produit, puis revenez : je vous donne le total et j’ouvre le devis.',
                    links: [{ href: '/catalogue', label: 'Parcourir le catalogue' }],
                  }
                : {
                    intent: 'panier',
                    text: 'Voici votre panier tel qu’il est dans ce navigateur. Le comptoir le reprend en facture proforma, et les prix sont dégressifs à la quantité.',
                    figures: [
                      { label: 'Articles', value: formatAmount(basket.count) },
                      { label: 'Total', value: formatPrice(basket.total) },
                    ],
                    links: [{ href: '/devis', label: 'Transformer en devis' }],
                  },
        },
      ])
      return
    }

    setBusy(true)
    setTurns((current) => [...current, { id, question: asked, reply: null }])

    try {
      const carried = scope.current
      const params = new URLSearchParams({ q: asked })
      if (carried?.q) params.set('t', carried.q)
      if (carried?.min !== undefined) params.set('mn', String(carried.min))
      if (carried?.max !== undefined) params.set('mx', String(carried.max))
      if (carried?.stock) params.set('st', '1')

      const response = await fetch(`/api/assistant?${params}`)
      const reply = (await response.json()) as AssistantReply
      scope.current = reply.scope ?? null
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
  }

  const panel = (
    <motion.div
      key="panel"
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
         cosmetic. At 390 the old panel was a 358-pixel card floating with the
         page showing around all four sides, which reads as something dropped on
         the site rather than part of it, and it left the composer 88 pixels up
         from the thumb. Full width off the bottom edge is where a phone puts a
         surface that owns the screen, its head is sticky so the way out is
         visible at every scroll position, and `dvh` rather than `vh` because on
         iOS the address bar is counted into `vh`. From `md` up the sheet becomes
         a 432-pixel column standing off the corner its launcher is in. */
      className="fixed inset-x-0 bottom-0 z-[var(--z-assistant)] flex max-h-[86dvh] flex-col overflow-hidden rounded-t-space border-t border-rule bg-paper shadow-[var(--shadow-panel)] md:inset-x-auto md:right-6 md:bottom-24 md:max-h-[min(80dvh,40rem)] md:w-[27rem] md:rounded-space md:border"
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-rule px-5 py-3.5">
        <span className="relative block size-9 shrink-0">
          <Image src="/logo/bod.png" alt="" fill sizes="36px" className="object-contain" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-small font-bold tracking-[-0.01em]">Bod</span>
          <span className="block text-micro text-ink-3">Le catalogue et les conditions</span>
        </span>
        <button
          type="button"
          data-bod-close
          onClick={() => {
            setOpen(false)
            launcher.current?.focus()
          }}
          aria-label="Fermer l’assistant"
          className="press -mr-2 grid size-11 shrink-0 place-items-center rounded-control text-ink-3 transition-colors duration-[var(--t-fast)] hover:text-ink"
        >
          <IconClose className="text-[1.125rem]" />
        </button>
      </header>

      <div
        ref={thread}
        data-bod-thread
        className="relative flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-6"
      >
        {turns.length === 0 ? <Opening onAsk={ask} /> : null}

        {turns.map((turn, index) => (
          <div
            key={turn.id}
            ref={index === turns.length - 1 ? newest : undefined}
            className={index === 0 ? '' : 'mt-7'}
          >
            {/* The datum. Struck first, in the mark's own green, which is the
                one thing --brand is allowed to be: a shape. */}
            <span aria-hidden className="mb-3 block h-0.5 w-6 bg-brand" />

            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 flex-1 text-body font-semibold leading-[1.45] text-ink">
                {turn.question}
              </p>
              {turn.reply ? (
                <span className="t-label shrink-0 pt-0.5 text-ink-3">
                  {INTENT_LABEL[turn.reply.intent]}
                </span>
              ) : null}
            </div>

            {turn.reply ? (
              <Answer reply={turn.reply} question={turn.question} onAsk={ask} reduced={Boolean(reduced)} />
            ) : (
              <p className="mt-3 text-small text-ink-3" role="status">
                Bod compte…
              </p>
            )}
          </div>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          ask(draft)
        }}
        className="field flex shrink-0 items-center gap-2 border-t border-rule px-3 py-3"
      >
        <label htmlFor="bod-field" className="sr-only">
          Votre question
        </label>
        <input
          ref={field}
          id="bod-field"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Caméra à moins de 50 000, garantie…"
          autoComplete="off"
          /* 16px on a phone: under that, Safari zooms the whole page when the
             field takes focus, and this field takes focus by itself the moment
             the panel opens. */
          className="min-h-11 min-w-0 flex-1 bg-transparent px-2 text-[1rem] outline-none placeholder:text-ink-3 md:min-h-10 md:text-small"
        />
        <button
          type="submit"
          disabled={busy || draft.trim().length === 0}
          aria-label="Envoyer la question"
          className="press grid size-11 shrink-0 place-items-center rounded-control bg-accent text-paper transition-colors duration-[var(--t-fast)] hover:bg-accent-ink disabled:pointer-events-none disabled:opacity-30 md:size-10"
        >
          <IconArrowRight className="text-[1.125rem]" />
        </button>
      </form>
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
        aria-label={open ? 'Fermer l’assistant' : 'Ouvrir Bod, l’assistant du comptoir'}
        animate={reduced || open ? { y: 0, opacity: 1 } : { y: tucked ? 88 : 0, opacity: tucked ? 0 : 1 }}
        transition={reduced ? { duration: 0 } : { duration: 0.24, ease: [0.22, 1, 0.28, 1] }}
        whileTap={reduced ? undefined : { scale: 0.96 }}
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
/* Before the first question                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The opening panel, and the only place Bod's range is stated in full.
 *
 * TWO GROUPS, BECAUSE THERE ARE TWO KINDS OF ANSWER AND CONFUSING THEM IS HOW
 * THIS SORT OF WIDGET LOSES TRUST. The first group is what Bod COMPUTES out of
 * the catalogue, each row carrying the real question that produces it, so a
 * reader can press one and see the machinery work on the first try. The second
 * is what he RECITES from the house conditions, which is a different promise:
 * those answers are written down and will not change with the stock.
 */
function Opening({ onAsk }: { onAsk: (question: string) => void }) {
  return (
    <div>
      <p className="text-small leading-[1.65] text-ink-2">{OPENING}</p>

      <ul className="mt-6 border-t border-rule">
        {CAPABILITIES.map((capability) => (
          <li key={capability.title}>
            <button
              type="button"
              onClick={() => onAsk(capability.example)}
              className="press group flex w-full min-h-12 items-center gap-3 border-b border-rule py-2.5 text-left transition-colors duration-[var(--t-fast)]"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-small font-semibold text-ink">{capability.title}</span>
                <span className="clamp-1 mt-0.5 block text-micro text-accent">
                  {capability.example}
                </span>
              </span>
              <IconArrowRight className="travel shrink-0 text-[1rem] text-ink-3" />
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-micro leading-[1.6] text-ink-3">
        Et les conditions de la maison, écrites une fois et jamais réinventées :
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {TOPICS.map((topic) => (
          <button
            key={topic.id}
            type="button"
            onClick={() => onAsk(topic.label)}
            /* 44 on a phone, 32 from `md` up. A chip is a suggestion and not a
               decision, but eight of them at 32 pixels on a touch screen is
               eight ways to open the wrong one. */
            className="press inline-flex min-h-11 items-center rounded-pill border border-rule px-3.5 text-micro text-ink-2 transition-colors duration-[var(--t-fast)] hover:border-ink hover:text-ink md:min-h-8 md:px-3"
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
  onAsk,
  reduced,
}: {
  reply: AssistantReply
  question: string
  onAsk: (question: string) => void
  reduced: boolean
}) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, filter: 'blur(6px)', y: 8 }}
      animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
      transition={reduced ? { duration: 0 } : RESOLVE}
      className="mt-2.5"
    >
      <p className="text-small leading-[1.65] text-ink-2">{reply.text}</p>

      {reply.figures && reply.figures.length > 0 ? (
        /* THE FIGURE STRIP IS THE PART A SPEECH BUBBLE HAD NOWHERE TO PUT, and
           it is the reason this panel earns its own drawing. A sentence saying
           "nous en avons plusieurs" is worth nothing beside three counted
           columns. Tabular figures are for figures only: a counter's street
           directions arrive with `wide` and take the page's own face across the
           full width, because monospace on a street name is a costume. */
        <dl className="mt-4 flex flex-wrap gap-x-4 gap-y-3 border-y border-rule py-3">
          {reply.figures.map((figure) =>
            figure.wide ? (
              <div key={figure.label} className="min-w-0 basis-full">
                <dt className="text-micro leading-[1.4] text-ink-3">{figure.label}</dt>
                <dd className="mt-0.5 text-small leading-[1.5] text-ink">{figure.value}</dd>
              </div>
            ) : (
              <div
                key={figure.label}
                className="min-w-0 flex-1 basis-20 border-rule [&:not(:first-child)]:border-l [&:not(:first-child)]:pl-4"
              >
                <dt className="text-micro leading-[1.4] text-ink-3">{figure.label}</dt>
                <dd className="t-num mt-0.5 text-small leading-[1.4] font-bold text-ink">
                  {figure.value}
                </dd>
              </div>
            ),
          )}
        </dl>
      ) : null}

      {reply.compare ? <Compare compare={reply.compare} /> : null}

      {reply.products && reply.products.length > 0 ? (
        <ul className="mt-4 border-t border-rule">
          {reply.products.map((product) => (
            <li key={product.slug} className="border-b border-rule">
              <Row product={product} />
            </li>
          ))}
        </ul>
      ) : null}

      {reply.families && reply.families.length > 0 ? (
        <ul className="mt-4 border-t border-rule">
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
          {reply.next.map((follow) => (
            <button
              key={follow}
              type="button"
              onClick={() => onAsk(follow)}
              className="press inline-flex min-h-11 items-center rounded-pill border border-rule px-3.5 text-micro text-ink-2 transition-colors duration-[var(--t-fast)] hover:border-ink hover:text-ink md:min-h-8 md:px-3"
            >
              {follow}
            </button>
          ))}
        </div>
      ) : null}

      {reply.handoff ? (
        <a
          href={`https://wa.me/${dialable(WHATSAPP)}?text=${encodeURIComponent(question)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fill press mt-4 inline-flex min-h-11 items-center gap-2.5 rounded-control bg-accent px-5 text-[0.875rem] font-bold text-paper transition-colors duration-[var(--t-fast)] [--fill-to:var(--accent-ink)] md:min-h-10"
        >
          Poser la question au comptoir
          <IconArrowRight className="travel text-[1rem]" />
        </a>
      ) : null}
    </motion.div>
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
      className="group flex items-center gap-3 py-2.5 transition-colors duration-[var(--t-fast)]"
    >
      <span className="relative block size-12 shrink-0 overflow-hidden rounded-control bg-space">
        {product.image ? (
          <Image src={product.image} alt="" fill sizes="48px" className="object-contain p-1" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="clamp-2 block text-micro leading-[1.45] text-ink group-hover:text-accent">
          {product.name}
        </span>
        <span className="mt-1 flex items-baseline gap-2">
          <span className="t-num text-small font-bold text-ink">{formatPrice(product.price)}</span>
          {product.inStock ? null : (
            <span className="text-micro text-warn">sur commande</span>
          )}
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
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-x-4 border-y border-rule py-3">
        {[compare.left, compare.right].map((column, index) => (
          <div key={column.slug} className={index === 0 ? 'min-w-0' : 'min-w-0 border-l border-rule pl-4'}>
            <Link
              href={`/produit/${column.slug}`}
              className="clamp-2 block text-micro leading-[1.45] font-semibold text-ink hover:text-accent"
            >
              {column.name}
            </Link>
            <p className="t-num mt-1.5 text-small font-bold text-ink">{formatAmount(column.price)}</p>
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
      <p className="mt-2.5 text-micro leading-[1.6] text-ink-2">{compare.gap}</p>
    </div>
  )
}
