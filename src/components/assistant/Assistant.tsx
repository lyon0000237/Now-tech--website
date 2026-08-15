'use client'

import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

import { IconArrowRight, IconClose, IconSearch } from '@/components/brand/Icons'
import type { AssistantReply } from '@/app/api/assistant/route'
import { FALLBACK, OPENING, TOPICS } from '@/constants/assistant'
import { WHATSAPP, dialable } from '@/constants/site'
import { formatPrice } from '@/lib/format'

/**
 * Bod, the counter assistant.
 *
 * WHAT IT IS. A search box with manners and a memory of the last few questions.
 * It reads the catalogue through `/api/assistant` and reads the shop's operating
 * facts out of `constants/assistant.ts`. There is no model behind it, and the
 * opening line says so in the first sentence, because a widget shaped like a
 * chatbot that has not told you what it can do will be asked things it cannot
 * answer and will look broken for refusing.
 *
 * WHY IT EXISTS AT ALL, NEXT TO A SEARCH FIELD. The masthead search takes a
 * product name. Half of what a customer wants to ask this shop is not a product
 * name: "vous livrez à Bafoussam", "je paie comment", "c'est garanti combien de
 * temps". Those questions have exact answers that already live in the codebase
 * and were, until now, reachable only by finding the right page. This is that
 * shortcut, and everything it cannot answer goes to a human on WhatsApp with the
 * question already typed.
 *
 * IT IS QUIET. No unread badge on a conversation nobody started, no bubble that
 * opens itself after eight seconds, no pulsing ring. The one moving thing is the
 * panel arriving, on the same spring the basket drawer uses, so the site keeps
 * one motion vocabulary.
 */
interface Turn {
  readonly id: number
  readonly from: 'you' | 'bod'
  readonly text: string
  readonly reply?: AssistantReply
}

const SPRING = { type: 'spring', stiffness: 320, damping: 32 } as const

export function Assistant() {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([
    { id: 0, from: 'bod', text: OPENING },
  ])

  const counter = useRef(1)
  const launcher = useRef<HTMLButtonElement>(null)
  const field = useRef<HTMLInputElement>(null)
  const thread = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  /**
   * How many pixels the on-screen keyboard is eating, or 0 when there is none.
   *
   * THE PANEL IS FIXED 88 PIXELS OFF THE BOTTOM OF THE LAYOUT VIEWPORT, AND A
   * KEYBOARD DOES NOT MOVE THAT. Android Chrome shrinks the visual viewport and
   * leaves the layout alone, so at 360 x 640 the composer sat at y=509 with the
   * keys starting around y=370: the panel opened, the field took focus by
   * design, and the field was behind the keyboard. The one control this thing
   * exists for was unreachable the moment it was used.
   *
   * `visualViewport` is the only thing that knows. Under 80 pixels of inset
   * there is no keyboard, the state stays 0 and no inline geometry is written
   * at all, so a desktop panel measures the same 368 x 544 it always did.
   */
  const [keyboard, setKeyboard] = useState(0)
  const [visible, setVisible] = useState(0)

  useEffect(() => {
    const view = window.visualViewport
    if (!open || !view) return

    const read = () => {
      const eaten = window.innerHeight - view.height - view.offsetTop
      setKeyboard(eaten < 80 ? 0 : Math.round(eaten))
      setVisible(Math.round(view.height))
    }

    read()
    view.addEventListener('resize', read)
    view.addEventListener('scroll', read)
    return () => {
      view.removeEventListener('resize', read)
      view.removeEventListener('scroll', read)
      setKeyboard(0)
    }
  }, [open])

  // The newest turn, not the top of the thread: a reader who just asked
  // something wants to see the answer, not the greeting they read on opening.
  useEffect(() => {
    if (!open) return
    thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: 'smooth' })
  }, [turns, open])

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

  const ask = async (question: string) => {
    const asked = question.trim()
    if (!asked || busy) return
    setDraft('')
    setBusy(true)
    const mine = counter.current++
    setTurns((current) => [...current, { id: mine, from: 'you', text: asked }])

    try {
      const response = await fetch(`/api/assistant?q=${encodeURIComponent(asked)}`)
      const reply = (await response.json()) as AssistantReply
      setTurns((current) => [
        ...current,
        { id: counter.current++, from: 'bod', text: reply.text, reply },
      ])
    } catch {
      // A dropped connection is not the customer's problem to diagnose. Say what
      // happened in one line and leave the WhatsApp door open.
      setTurns((current) => [
        ...current,
        { id: counter.current++, from: 'bod', text: FALLBACK, reply: { kind: 'none', text: FALLBACK } },
      ])
    } finally {
      setBusy(false)
    }
  }

  const lastQuestion = [...turns].reverse().find((turn) => turn.from === 'you')?.text ?? ''

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="panel"
            role="dialog"
            aria-label="Bod, assistant du comptoir"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={reduced ? { duration: 0 } : SPRING}
            style={{
              transformOrigin: 'bottom right',
              // Written only while a keyboard is up. See `keyboard` above.
              ...(keyboard > 0
                ? { bottom: `${keyboard + 8}px`, maxHeight: `${Math.max(200, visible - 24)}px` }
                : null),
            }}
            /* `dvh` and not `vh`: on iOS the address bar is counted into `vh`,
               so a panel capped at 78vh opened 60 pixels taller than the screen
               it was drawn on and its composer was under the bar. At 900 the
               34rem cap bites first and the desktop is unchanged either way. */
            className="fixed right-4 bottom-[5.5rem] z-[var(--z-assistant)] flex max-h-[min(78dvh,34rem)] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-well border border-rule bg-paper shadow-[var(--shadow-panel)] sm:right-6 sm:w-[23rem] md:bottom-24"
          >
            <header className="flex items-center gap-3 border-b border-rule px-5 py-4">
              <span className="relative block size-9 shrink-0">
                <Image src="/logo/bod.png" alt="" fill sizes="36px" className="object-contain" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-small font-bold tracking-[-0.01em]">Bod</span>
                <span className="block text-micro text-ink-3">Assistant du comptoir</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  launcher.current?.focus()
                }}
                aria-label="Fermer l’assistant"
                className="press -mr-2 grid size-11 place-items-center rounded-control text-ink-3 transition-colors duration-[var(--t-fast)] hover:text-ink"
              >
                <IconClose className="text-[1.125rem]" />
              </button>
            </header>

            <div ref={thread} className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              {turns.map((turn) => (
                <div key={turn.id}>
                  {turn.from === 'you' ? (
                    <p className="ml-auto w-fit max-w-[85%] rounded-control rounded-br-[4px] bg-accent px-3.5 py-2.5 text-small leading-[1.55] text-paper">
                      {turn.text}
                    </p>
                  ) : (
                    <div className="max-w-[92%]">
                      <p className="w-fit rounded-control rounded-bl-[4px] bg-space px-3.5 py-2.5 text-small leading-[1.55] text-ink-2">
                        {turn.text}
                      </p>
                      <Answer reply={turn.reply} question={lastQuestion} />
                    </div>
                  )}
                </div>
              ))}

              {busy ? (
                <p className="text-micro text-ink-3" role="status">
                  Bod cherche…
                </p>
              ) : null}

              {/* The chips stay for the whole conversation rather than only the
                  first turn: they are the honest statement of what this thing
                  knows, and hiding them after one question makes a reader guess
                  at its range for every question after that. */}
              <div className="flex flex-wrap gap-2 pt-1">
                {TOPICS.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => ask(topic.label)}
                    /* 44 on a phone, 32 from `md` up, which is what they
                       measured before. A chip is a suggestion and not a
                       decision, but eight of them at 32 pixels on a touch
                       screen is eight ways to open the wrong one. */
                    className="press inline-flex min-h-11 items-center rounded-pill border border-rule px-3.5 text-micro text-ink-2 transition-colors duration-[var(--t-fast)] hover:border-ink hover:text-ink md:min-h-8 md:px-3 md:py-1.5"
                  >
                    {topic.label}
                  </button>
                ))}
              </div>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault()
                ask(draft)
              }}
              className="field flex items-center gap-2 border-t border-rule px-3 py-3"
            >
              <label htmlFor="bod-field" className="sr-only">
                Votre question
              </label>
              <input
                ref={field}
                id="bod-field"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Onduleur 1500 VA, livraison, garantie…"
                autoComplete="off"
                /* 16px on a phone: under that, Safari zooms the whole page when
                   the field takes focus, and this field takes focus by itself
                   the moment the panel opens. */
                className="min-h-11 min-w-0 flex-1 bg-transparent px-2 text-[1rem] outline-none placeholder:text-ink-3 md:min-h-0 md:text-small"
              />
              <button
                type="submit"
                disabled={busy || draft.trim().length === 0}
                aria-label="Envoyer"
                className="press grid size-11 shrink-0 place-items-center rounded-control bg-accent text-paper transition-colors duration-[var(--t-fast)] hover:bg-accent-ink disabled:pointer-events-none disabled:opacity-30 md:size-10"
              >
                <IconArrowRight className="text-[1.125rem]" />
              </button>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        ref={launcher}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? 'Fermer l’assistant' : 'Ouvrir l’assistant du comptoir'}
        // White disc, not a green one: the artwork is a green bot, and set on
        // the brand green it disappears into its own background.
        className="press fixed right-4 bottom-4 z-[var(--z-assistant)] grid size-14 place-items-center overflow-hidden rounded-full bg-paper ring-1 ring-rule shadow-[var(--shadow-panel)] transition-transform duration-[var(--t-base)] ease-brand hover:scale-105 sm:right-6 sm:bottom-6"
      >
        <span className="relative block size-11">
          <Image src="/logo/bod.png" alt="" fill sizes="44px" className="object-contain" />
        </span>
      </button>
    </>
  )
}

/**
 * Whatever the reply carried beyond its sentence.
 *
 * Products are drawn as rows and not as cards. A card is for a grid a reader is
 * comparing across; this is a list of four answers inside a 368-pixel panel, and
 * a row with a thumbnail, a name and a price is the most that fits without any
 * of the three becoming unreadable.
 */
function Answer({ reply, question }: { reply?: AssistantReply; question: string }) {
  if (!reply) return null

  if (reply.kind === 'products' && reply.products) {
    return (
      <ul className="mt-3 space-y-2.5">
        {reply.products.map((hit) => (
          <li key={hit.slug}>
            <Link
              href={`/produit/${hit.slug}`}
              className="group flex items-center gap-3 rounded-control border border-rule p-2 transition-colors duration-[var(--t-fast)] hover:border-ink"
            >
              <span className="relative block size-11 shrink-0 overflow-hidden rounded-[7px] bg-surface">
                {hit.image ? (
                  <Image src={hit.image} alt="" fill sizes="44px" className="object-contain p-1" />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="clamp-2 block text-micro leading-[1.4] group-hover:text-accent">
                  {hit.name}
                </span>
                <span className="t-num mt-1 block text-micro font-bold">
                  {formatPrice(hit.price)}
                  {hit.inStock ? '' : ' · sur commande'}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    )
  }

  if (reply.kind === 'families' && reply.families) {
    return (
      <ul className="mt-3 space-y-2">
        {reply.families.map((family) => (
          <li key={family.slug}>
            <Link
              href={`/categorie/${family.slug}`}
              className="flex min-h-11 items-center gap-2 text-micro text-accent hover:text-accent-ink md:min-h-0"
            >
              <IconSearch className="text-[0.9375rem]" />
              <span className="draw-under">{family.name}</span>
              <span className="t-num text-ink-3">{family.totalCount}</span>
            </Link>
          </li>
        ))}
      </ul>
    )
  }

  if (reply.kind === 'topic' && reply.link) {
    return (
      <Link
        href={reply.link.href}
        className="draw-under mt-3 inline-flex min-h-11 items-center text-micro font-semibold text-accent hover:text-accent-ink md:inline-block md:min-h-0"
      >
        {reply.link.label}
      </Link>
    )
  }

  if (reply.kind === 'none') {
    return (
      <a
        href={`https://wa.me/${dialable(WHATSAPP)}${
          question ? `?text=${encodeURIComponent(question)}` : ''
        }`}
        target="_blank"
        rel="noopener noreferrer"
        className="press mt-3 inline-flex min-h-11 items-center gap-2 rounded-control bg-accent px-4 text-micro font-bold text-paper transition-colors duration-[var(--t-fast)] hover:bg-accent-ink md:min-h-10"
      >
        Poser la question sur WhatsApp
      </a>
    )
  }

  return null
}
