'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import { IconChevronLeft, IconClose, IconPhone } from '@/components/brand/Icons'
import { SHOWROOMS } from '@/constants/site'
import { formatCount } from '@/lib/format'
import { hasBeenGreeted, normalisePhone, useAccount, type Account } from '@/lib/account'
import { lockScroll } from '@/lib/scroll-lock'

/**
 * The counter card, as a dialog.
 *
 * WHY IT IS NOT A LOGIN BOX. There is no server, so there is nothing to log
 * into: see the head of `lib/account.tsx`. A centred white rectangle with an
 * e-mail and a password would be a picture of a feature this site does not have,
 * and the password would be a real secret held in plain text on what is often a
 * shared machine. What this shop actually needs from a customer is the card its
 * counter already fills in by hand: the name that goes on the proforma, the
 * WhatsApp number it is sent to, and the counter they collect from. That is the
 * whole form, and there is no fourth field: the e-mail box that used to sit
 * under "Pour recevoir la proforma en PDF" collected a real address against a
 * PDF that is never produced and a mail that is never sent, so it is gone.
 *
 * THE COMPOSITION IS THE SHOP, IN TWO PANELS. Left is the counter: the one
 * saturated green on the site, the three real addresses, the real size of the
 * catalogue, and three numbered lines stating exactly what the card carries.
 * Right is the card itself, on paper, with fields drawn like the search field,
 * which is the only other place on this site a customer types.
 *
 * ON A PHONE THE GREEN IS A HEADER BAR AND NOTHING MORE, WHICH IS WHAT MAKES
 * THE EXIT REACHABLE. Measured on the version before this one at 390 x 844: the
 * cross sat 280px down the screen because it lived in the second panel, and both
 * the save button and "Plus tard" were below the fold of a panel that scrolled
 * as one piece. A customer could not see a single way out without scrolling a
 * thing they never asked to open. So the phone layout is three parts, not two:
 * the green band is a fixed head holding the title and the cross, the card is
 * the only part that scrolls, and its two controls are pinned to the foot of
 * that scroller. The way out is on screen at every scroll position, twice.
 *
 * THE ARRIVAL BOUNCES, AND ONLY THE PANEL DOES. A spring at 380 / 18 overshoots
 * by a few per cent and settles, which is the one place on this site allowed to
 * overshoot: this is an invitation, not a rack rail. The scrim behind it is a
 * flat fade, because a backdrop that springs reads as the page itself wobbling,
 * and the exit is a short tween, because the overshoot is an arrival gesture and
 * nothing else. Under `prefers-reduced-motion` nothing transforms at all.
 *
 * IT ARRIVES ON THE DOORSTEP ONLY, AND IT GIVES UP THE MOMENT THE CUSTOMER IS
 * BUSY. See {@link ARRIVAL_DELAY} and the effect under it: the invitation is a
 * greeting, and a greeting belongs at the door. Escape, the scrim, the cross and
 * a plain "Plus tard" all close it, focus is trapped while it is open and handed
 * back to whatever opened it, and the page underneath is locked by the shared
 * lease in `lib/scroll-lock`, not by a write to `document.body` that this
 * stylesheet makes inert.
 */

/** The site's own decelerating curve, for the scrim and for the exit. */
const EASE_OUT = [0.22, 1, 0.36, 1] as const

/**
 * Long enough for the masthead, the opening headline and its first photographs
 * to be on screen. Anything under a second lands on a page that is still white.
 */
const ARRIVAL_DELAY = 1600

/** Past this, the customer is reading the page rather than arriving on it. */
const ARRIVAL_SCROLL = 200

/* The field is the search field's frame, at the same height and with the same
   inward focus ring, because those two are the only places a customer types. */
const FIELD =
  'field mt-2 flex h-12 items-stretch rounded-control border border-rule-2 bg-space ' +
  'transition-[border-color,box-shadow] duration-[var(--t-fast)]'
/* 16px on a phone, 13 from `md` up.
   SAFARI ZOOMS THE PAGE WHEN A FIELD UNDER 16px TAKES FOCUS, and this dialog is
   three fields long: a customer filling in their name watched the modal grow
   past both edges of the screen and had to pinch back before they could reach
   the number. Nothing is gained by the small size here, since the phone layout
   gives the card the full width of the panel anyway. */
const INPUT =
  'min-w-0 flex-1 bg-transparent px-4 text-[1rem] text-ink outline-none placeholder:text-ink-3 md:text-small'
const LABEL = 'text-micro font-semibold tracking-[0.02em] text-ink-2'
const ERROR = 'mt-2 text-micro leading-[1.5] text-warn'

/** Anything with a caret in it. A customer mid-word is not to be interrupted. */
const TYPING = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

interface Errors {
  name?: string
  phone?: string
  counter?: string
}

export function AuthDialog({ referenceCount }: { referenceCount: number }) {
  const { account, isOpen, open, close, signIn } = useAccount()
  const panel = useRef<HTMLDivElement>(null)
  const exit = useRef<HTMLButtonElement>(null)
  const restoreTo = useRef<HTMLElement | null>(null)
  const reduced = useReducedMotion()
  const pathname = usePathname()
  const titleId = useId()
  const noteId = useId()

  const editing = account !== null

  /* -- The invitation ------------------------------------------------------
     THE DOORSTEP IS `/`, AND IT IS THE `/` THE CUSTOMER ARRIVED ON. The brief
     asked for a greeting on arrival; the version before this one read "arrival"
     as "any page load", which is how it came to open itself over a 404, over a
     product page opened from a search engine, and over the twenty-fourth page
     of a session that was going perfectly well. A greeting on page twenty-four
     is not a greeting.

     So there are two conditions, not one. `pathname === '/'` rules out every
     other route. `landing` holds the route this dialog was mounted on, which is
     the route the browser actually loaded: this component lives in the layout
     and is never unmounted, so a customer who came in through `/catalogue` and
     later clicked the wordmark home carries `landing === '/catalogue'` for the
     whole session and is never greeted. Being handed a popup on the way back to
     the front page is the same interruption the audit measured, arriving by a
     different door.

     AND IT LOSES EVERY RACE IT IS IN. The delay exists so the invitation lands
     on a painted shop, but a second and a half is long enough for a customer to
     have started using the site, and taking the focus off somebody who is
     already typing is the worst thing a dialog can do. So a key, a pointer, a
     scroll of more than 200px, or a caret already sitting in a field at the
     moment the timer fires all cancel it outright — cancel, not postpone: a
     customer who has begun to serve themselves has answered the question the
     invitation was going to ask. It is not marked as greeted either, so the
     door is still open on their next visit.

     THE SCROLL IS MEASURED RATHER THAN COUNTED, AND `wheel` IS DELIBERATELY NOT
     IN THAT LIST. An earlier pass cancelled on the first `wheel` event, which
     made the 200px threshold underneath it unreachable: one notch of a mouse
     wheel, some 100px, killed the invitation, and the number in the brief was
     dead code. A wheel is only how a scroll is asked for; `scroll` is the page
     answering, it is the event a touch drag and a keyboard PageDown fire too,
     and the distance is what tells a reader who has moved on from a phone that
     landed two pixels off zero by existing.

     THE POSITION IS READ ONCE BEFORE ANY LISTENER IS BOUND, BECAUSE THE PAGE IS
     READABLE BEFORE IT IS INTERACTIVE. Nothing in this effect exists until React
     has hydrated, and hydration is not instant: measured against the dev server
     at 1440, the first paint stood a full second ahead of it. A customer who
     read the headline and flicked the wheel in that second would have had every
     event of that flick land in a document with no listeners on it, and the
     invitation would have opened over a page they had already moved past. So
     the scroll position at mount is itself a verdict: past the same 200px, the
     reader has gone on without us, whenever they did it. */
  const landing = useRef(pathname)

  useEffect(() => {
    if (account || pathname !== '/' || landing.current !== '/' || hasBeenGreeted()) return
    if (window.scrollY > ARRIVAL_SCROLL) return

    const from = window.scrollY
    let timer = 0

    const stop = () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', stop)
      window.removeEventListener('pointerdown', stop)
      window.removeEventListener('scroll', onScroll)
    }

    const onScroll = () => {
      if (Math.abs(window.scrollY - from) > ARRIVAL_SCROLL) stop()
    }

    window.addEventListener('keydown', stop, { passive: true })
    window.addEventListener('pointerdown', stop, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })

    timer = window.setTimeout(() => {
      stop()
      // Checked again on firing: the customer may have opened and dismissed the
      // dialog themselves during the delay, and reopening it then would be the
      // site arguing with them.
      if (hasBeenGreeted()) return
      if (document.activeElement?.matches(TYPING)) return
      open()
    }, ARRIVAL_DELAY)

    return stop
  }, [account, pathname, open])

  /* -- Focus, restoration, and the page underneath -------------------------
     THE FOCUS GOES TO THE WAY OUT, NOT TO THE FIRST FIELD. A caret blinking in
     a name box is an instruction to start typing, and this is the one dialog on
     the site the customer did not ask for. The cross is a real control, so it
     carries a real focus ring, and reading order from there is the title, the
     three lines, the form.

     The panel itself is no longer focused and no longer carries a `tabindex`,
     which is the whole of the green hairline the audit saw: the document's
     focus rule matches `[tabindex]:focus-visible` and drew its 2px accent
     outline around all 928 pixels of the panel every time it opened. A ring
     belongs on a control a key can reach, and nothing here is one. */
  useEffect(() => {
    if (!isOpen) return

    restoreTo.current = document.activeElement as HTMLElement
    const release = lockScroll()
    exit.current?.focus({ preventScroll: true })

    return () => {
      release()
      const back = restoreTo.current
      restoreTo.current = null
      // Guarded because this cleanup also runs when the route changes under an
      // open dialog, and the control that opened it is gone by then.
      if (back?.isConnected) back.focus?.()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
        return
      }
      if (event.key !== 'Tab' || !panel.current) return
      // Without the trap, tabbing walks the page behind a modal that has just
      // covered it, which is a reader typing into a form they cannot see. The
      // rectangle test drops anything the responsive layout has taken out with
      // `display: none`, since a hidden control cannot take the focus and would
      // otherwise be handed the end of the cycle.
      const focusable = Array.from(
        panel.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getClientRects().length > 0)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, close])

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-3 sm:p-6">
          <motion.button
            type="button"
            aria-label="Fermer"
            onClick={close}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.24, ease: EASE_OUT as never }}
            className="absolute inset-0 cursor-pointer bg-[rgb(20_23_21_/_0.5)] backdrop-blur-[2px]"
          />

          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={noteId}
            initial={reduced ? false : { opacity: 0, scale: 0.9, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              reduced
                ? undefined
                : {
                    opacity: 0,
                    scale: 0.97,
                    y: 10,
                    transition: { duration: 0.16, ease: EASE_OUT as never },
                  }
            }
            transition={
              reduced
                ? { duration: 0 }
                : {
                    type: 'spring',
                    stiffness: 380,
                    damping: 18,
                    mass: 0.9,
                    opacity: { duration: 0.18 },
                  }
            }
            /* The panel clips instead of scrolling, and each part manages its
               own overflow. That is what lets the green band stay put on a phone
               while the card moves under it. */
            className="relative flex max-h-[92dvh] w-full max-w-[58rem] flex-col overflow-hidden rounded-space bg-paper shadow-[0_40px_90px_-40px_rgb(20_23_21_/_0.55)] outline-none md:grid md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]"
          >
            {/* The one cross, placed against the panel rather than against
                either half of it, because the top right corner of the panel is
                green on a phone and paper from `md` up. The focus ring follows
                the ground it lands on: the document rule draws it in --accent,
                which is deep pine on the rail's deep pine, so the phone case
                takes --rail-accent instead. Both are marked important, since the
                document's rule is unlayered and would otherwise outrank any
                utility whatever its specificity. */}
            <button
              ref={exit}
              type="button"
              onClick={close}
              aria-label="Fermer"
              className="press absolute top-2 right-2 z-10 grid size-11 place-items-center rounded-control text-rail-ink transition-colors duration-[var(--t-fast)] hover:text-rail-ink-2 focus-visible:outline-rail-accent! md:top-3 md:right-3 md:text-ink-2 md:hover:text-ink md:focus-visible:outline-accent!"
            >
              <IconClose className="text-[1.25rem]" />
            </button>

            {/* -- The counter ------------------------------------------- */}
            <div className="on-rail flex shrink-0 flex-col bg-rail px-5 py-4 pr-16 text-rail-ink md:overflow-y-auto md:px-8 md:py-9 md:pr-8">
              <p className="t-label text-rail-ink-2">Le comptoir</p>
              <h2
                id={titleId}
                className="mt-1.5 text-sub font-extrabold tracking-[-0.025em] text-balance md:mt-3 md:text-title"
              >
                {editing ? 'Vos coordonnées' : 'Votre fiche client'}
              </h2>

              {/* Two lines on a phone and the full paragraph from `md` up: the
                  same fact, sized to the band it has to fit inside. The long
                  version below would be five lines at 390 and would push the
                  card's first field off the screen. */}
              {/* Two lines at 360, where it was three. The band is a head, not
                  a column: every line it takes is a line the card underneath
                  loses, and at 360 x 640 the card had room for one field and
                  half of the next. */}
              <p className="mt-2 max-w-[38ch] text-small leading-[1.6] text-pretty text-rail-ink-2 md:hidden">
                Rien ne se paie en ligne. Votre fiche prépare la proforma.
              </p>
              <p className="mt-4 hidden max-w-[34ch] text-small leading-[1.65] text-pretty text-rail-ink-2 md:block">
                Rien ne se paie en ligne ici : on règle au comptoir, à la livraison ou par
                Mobile Money contre proforma. Votre fiche prépare ce moment, et elle porte
                trois choses.
              </p>

              {/* Three lines and no paragraphs. The list is a legend, not an
                  argument: the sentence above has already made the case, and a
                  second block of prose under it would only push the three real
                  addresses off the bottom of the panel.

                  The numerals are set in --rail-ink-2 rather than in the rail's
                  accent: the accent measures 4.41:1 on this green, which clears
                  the 3:1 a focus ring or an underline owes but not the 4.5:1
                  owed by 12px text. --rail-ink-2 measures 4.54:1. */}
              <ol className="mt-7 hidden md:block">
                {[
                  'La liste de matériel à chiffrer',
                  'Le nom et le numéro de la proforma',
                  'Le comptoir de retrait habituel',
                ].map((row, index) => (
                  <li
                    key={row}
                    className="flex gap-4 border-t border-rail-rule py-3 text-small last:border-b"
                  >
                    <span className="t-num text-micro text-rail-ink-2">0{index + 1}</span>
                    <span className="min-w-0 font-semibold">{row}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-auto hidden pt-8 md:block">
                <p className="t-label text-rail-ink-2">Nos trois comptoirs</p>
                <ul className="mt-4 space-y-3.5">
                  {SHOWROOMS.map((showroom) => (
                    <li key={`${showroom.city}-${showroom.district}`}>
                      <p className="text-small font-semibold">
                        {showroom.city}, {showroom.district}
                      </p>
                      <p className="mt-0.5 text-micro leading-[1.5] text-rail-ink-2">
                        {showroom.directions}
                      </p>
                    </li>
                  ))}
                </ul>
                <p className="t-num mt-6 border-t border-rail-rule pt-5 text-micro text-rail-ink-2">
                  {formatCount(referenceCount, 'référence')} au catalogue
                </p>
              </div>
            </div>

            {/* -- The card ----------------------------------------------
                The only scrolling part, and the only one that needs to be: the
                foot padding is spent by the pinned control row inside the form
                instead, so nothing is left showing under it. */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pt-4 md:px-9 md:pt-9 md:pb-9">
              <p className="t-label text-ink-3 md:pr-12">
                {editing ? 'Mettre à jour' : 'Trois informations, une seule fois'}
              </p>
              {/* The sentence is the same one on both grounds; only its size
                  changes. At 13px on a 360 screen it took three lines and 62
                  pixels off a card that has three fields to show. */}
              <p
                id={noteId}
                className="mt-2 max-w-[46ch] text-micro leading-[1.55] text-ink-2 md:mt-2.5 md:text-small md:leading-[1.6]"
              >
                Cette fiche reste dans ce navigateur, sur cet appareil. Elle ne crée pas de
                compte en ligne et ne demande aucun mot de passe.
              </p>

              {/* Mounted only while the dialog is open, which is what lets the
                  fields be initialised from the stored card at mount instead of
                  being pushed into state by an effect on every open. */}
              <CardForm account={account} onSubmit={signIn} onCancel={close} />
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}

/**
 * The card.
 *
 * VALIDATION HAPPENS AT SUBMISSION, NEVER WHILE TYPING. A number is wrong for
 * every keystroke but the last, so validating as you type means telling the
 * customer they are wrong eight times in a row before they are right. Nothing
 * here blocks or reformats the keys either: the store normalises the number
 * afterwards, and a field that rearranges what you typed under your cursor is
 * how a form loses a phone number.
 *
 * THE CONTROL ROW IS PINNED TO THE FOOT OF THE SCROLLER, AND THAT IS AN
 * ACCESSIBILITY FIX RATHER THAN A FLOURISH. At 390 x 844 the card is taller than
 * the space it has, so on the old layout "Enregistrer ma fiche" and "Plus tard"
 * both sat below the fold of a dialog the customer never opened. Sticky at the
 * foot, they are on screen at every scroll position, and the negative margin is
 * the pane's own gutter given back so the bar covers the full width of what
 * passes under it.
 */
function CardForm({
  account,
  onSubmit,
  onCancel,
}: {
  account: Account | null
  onSubmit: (fields: Account) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(account?.name ?? '')
  const [phone, setPhone] = useState(account?.phone ?? '')
  const [counter, setCounter] = useState(account?.counter ?? '')
  const [errors, setErrors] = useState<Errors>({})
  // TWO STEPS, BECAUSE THE FIRST QUESTION IS NOT A FIELD. A reader who opens
  // this on arrival is being asked to fill a form before being told what it is
  // for. Asking how they want to be reached first is one tap, it is the only
  // choice this shop actually has to offer, and it turns the second screen from
  // an interrogation into the consequence of an answer they already gave.
  const [step, setStep] = useState<'choix' | 'fiche'>(account ? 'fiche' : 'choix')
  const form = useRef<HTMLFormElement>(null)
  const ids = useId()

  const editing = account !== null

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    const dialled = normalisePhone(phone)
    const next: Errors = {}

    if (trimmed.length < 2) {
      next.name = 'Indiquez le nom qui doit figurer sur la proforma.'
    }
    if (!phone.trim()) {
      next.phone = 'Indiquez le numéro qui reçoit la proforma sur WhatsApp.'
    } else if (!dialled) {
      next.phone =
        'Un mobile camerounais s’écrit +237 6XX XX XX XX, soit neuf chiffres commençant par 6.'
    }
    if (!counter) {
      next.counter = 'Choisissez le comptoir où vous retirez le plus souvent.'
    }

    setErrors(next)
    if (!dialled || Object.keys(next).length > 0) {
      // The reader is taken to the first field that needs them, rather than left
      // to hunt for the line that changed in a form they cannot see all of.
      const field = next.name ? 'name' : next.phone ? 'phone' : 'counter'
      form.current?.querySelector<HTMLElement>(`[data-field="${field}"]`)?.focus()
      return
    }

    onSubmit({ name: trimmed, phone: dialled, counter })
  }

  if (step === 'choix') {
    return (
      <div className="mt-5 flex flex-1 flex-col md:mt-8">
        <p className="text-small leading-[1.6] text-ink-2">
          Comment préférez-vous qu’on vous réponde ? Le comptoir renvoie la facture
          proforma par le canal que vous choisissez ici.
        </p>

        <div className="mt-6 grid gap-3">
          <button
            type="button"
            onClick={() => setStep('fiche')}
            className="press fill inline-flex min-h-12 items-center justify-center gap-2.5 rounded-control bg-accent px-7 text-[0.875rem] font-bold text-paper transition-colors duration-[var(--t-fast)] ease-brand [--fill-to:var(--accent-ink)]"
          >
            <IconPhone className="text-[1.125rem]" />
            Par WhatsApp
          </button>
          <button
            type="button"
            onClick={() => setStep('fiche')}
            className="press inline-flex min-h-12 items-center justify-center gap-2.5 rounded-control border border-rule-2 px-7 text-[0.875rem] font-bold text-ink transition-colors duration-[var(--t-fast)] hover:border-ink"
          >
            Par téléphone
          </button>
        </div>

        {/* WHY THERE IS NO "CONTINUER AVEC GOOGLE" HERE, AND IT IS NOT AN
            OVERSIGHT. Google sign-in needs an OAuth client, a secret, a library
            and a server session. This project has no authentication dependency,
            no environment file, and two API routes that both do nothing but read
            the catalogue. A button carrying Google's name that signs nobody in is
            the one kind of control this site refuses: it asks for a credential
            and it cannot honour it. The day there is a provider it drops into
            this exact slot, above the two below, and nothing else here changes. */}
        <p className="mt-6 text-micro leading-[1.6] text-ink-3">
          Aucun mot de passe, aucun compte à créer. La fiche reste dans ce
          navigateur et sert à remplir vos devis.
        </p>
      </div>
    )
  }

  return (
    <form ref={form} onSubmit={submit} noValidate className="mt-5 flex flex-1 flex-col md:mt-8">
      <button
        type="button"
        onClick={() => setStep('choix')}
        className="press mb-5 inline-flex min-h-11 items-center gap-2 self-start text-small text-ink-3 transition-colors duration-[var(--t-fast)] hover:text-ink"
      >
        <IconChevronLeft className="text-[1rem]" />
        Retour
      </button>

      <label className="block">
        <span className={LABEL}>Nom et prénom</span>
        <span className={FIELD}>
          <input
            data-field="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            placeholder="Comme sur la proforma"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? `${ids}-name` : undefined}
            className={INPUT}
          />
        </span>
      </label>
      {errors.name ? (
        <p id={`${ids}-name`} className={ERROR}>
          {errors.name}
        </p>
      ) : null}

      <label className="mt-5 block md:mt-6">
        <span className={LABEL}>Téléphone WhatsApp</span>
        <span className={FIELD}>
          <span className="t-num grid place-items-center border-r border-rule-2 px-3.5 text-small text-ink-3">
            +237
          </span>
          <input
            data-field="phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            inputMode="tel"
            autoComplete="tel"
            placeholder="6XX XX XX XX"
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={errors.phone ? `${ids}-phone` : undefined}
            className={`${INPUT} t-num`}
          />
        </span>
      </label>
      {errors.phone ? (
        <p id={`${ids}-phone`} className={ERROR}>
          {errors.phone}
        </p>
      ) : null}

      <fieldset className="mt-5 md:mt-6">
        <legend className={LABEL}>Comptoir de retrait</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {SHOWROOMS.map((showroom, index) => {
            const selected = counter === showroom.district
            return (
              <label
                key={showroom.district}
                className={`press flex min-h-11 cursor-pointer flex-row items-center justify-between gap-3 rounded-control border px-3.5 py-2 transition-colors duration-[var(--t-fast)] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent sm:flex-col sm:items-start sm:justify-center sm:gap-0 sm:py-2.5 ${
                  selected ? 'border-accent bg-accent-wash' : 'border-rule-2 hover:border-ink-3'
                }`}
              >
                {/* The control is hidden and not removed: it is still a radio
                    group to the keyboard and to the screen reader, and the label
                    around it is what gets drawn. */}
                <input
                  type="radio"
                  name="comptoir"
                  value={showroom.district}
                  checked={selected}
                  onChange={() => setCounter(showroom.district)}
                  data-field={index === 0 ? 'counter' : undefined}
                  aria-describedby={errors.counter ? `${ids}-counter` : undefined}
                  className="sr-only"
                />
                <span
                  className={`text-small font-semibold ${selected ? 'text-accent-ink' : 'text-ink'}`}
                >
                  {showroom.district}
                </span>
                <span className="text-micro text-ink-3">{showroom.city}</span>
              </label>
            )
          })}
        </div>
      </fieldset>
      {errors.counter ? (
        <p id={`${ids}-counter`} className={ERROR}>
          {errors.counter}
        </p>
      ) : null}

      <div className="sticky bottom-0 -mx-5 mt-auto flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-rule bg-paper px-5 pt-4 pb-5 md:static md:mx-0 md:border-0 md:px-0 md:pt-9 md:pb-0">
        {/* `Action` renders a link and this submits a form, so the primary
            variant's classes are repeated here rather than the control being
            turned into a link that navigates nowhere. */}
        <button
          type="submit"
          className="press fill inline-flex min-h-11 items-center justify-center gap-2.5 rounded-control bg-accent px-7 py-3 text-[0.875rem] font-bold text-paper transition-colors duration-[var(--t-fast)] ease-brand [--fill-to:var(--accent-ink)]"
        >
          {editing ? 'Enregistrer les modifications' : 'Enregistrer ma fiche'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="press min-h-11 text-small text-ink-2 transition-colors duration-[var(--t-fast)] hover:text-ink"
        >
          <span className="draw-under">{editing ? 'Annuler' : 'Plus tard'}</span>
        </button>
      </div>
    </form>
  )
}
