'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useId, useMemo } from 'react'

import { IconPhone } from '@/components/brand/Icons'
import { Action } from '@/components/ui/Action'
import { PHONES, dialable } from '@/constants/site'
import { counterLabel, useAccount } from '@/lib/account'
import { useCart } from '@/lib/cart'
import { formatCount, formatPrice } from '@/lib/format'

import { QuoteEmpty } from './QuoteEmpty'
import { VAT_LABEL, buildQuoteMessage, totalsOf } from './quote'

/**
 * The quote. This is the end of the journey on this site, not a degraded cart.
 *
 * THERE IS NO CHECKOUT BEHIND THIS PAGE AND THERE WILL NOT BE ONE. The shop is
 * settled in cash at the counter, on delivery, or by Mobile Money against a
 * proforma, which is the doctrine already written at the head of `CartDrawer`.
 * So the page's job is not to take money, it is to turn a basket into the one
 * document this business runs on and hand it to a human. Every control below
 * either edits that list or opens a channel a person answers.
 *
 * WHAT THIS PAGE DOES NOT DO, STATED HERE SO NOBODY ADDS IT LATER. It does not
 * send an e-mail, it does not generate a PDF, it does not save a quote anywhere,
 * and it never says a quote was "sent" or "registered". Nothing leaves this
 * browser except a WhatsApp link the customer opens themselves and a telephone
 * number they dial themselves. A confirmation screen here would be a lie with a
 * green tick on it, and it is exactly the lie a storefront of this shape is
 * tempted into.
 *
 * THE LIST IS EDITABLE HERE AND NOT ONLY IN THE DRAWER, because the drawer is
 * 26rem wide and a company buying eleven references cannot audit eleven rows
 * through a letterbox. Same operations, same slugs, same store; more room, and
 * 44-pixel targets instead of the drawer's 32.
 *
 * THE EMPTY STATE IS THE COMMON CASE. Six surfaces link here and only one of
 * them is the basket, so most arrivals have nothing in the list. See
 * `QuoteEmpty`.
 *
 * HYDRATION. `useCart` and `useAccount` both report empty on the server by
 * design, so the first paint is the empty screen and the real list replaces it
 * on hydration. That is the store's contract, not an accident: it is what keeps
 * the basket count in the masthead from flashing.
 */
export function Devis() {
  const { lines, count, setQty, remove } = useCart()
  const { account, open: openAccount } = useAccount()

  const totals = useMemo(() => totalsOf(lines), [lines])
  const message = useMemo(() => buildQuoteMessage(lines, account), [lines, account])

  const listId = useId()
  const sumId = useId()

  if (lines.length === 0) return <QuoteEmpty />

  return (
    <div className="shell grid items-start gap-x-16 gap-y-14 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section aria-labelledby={listId}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-b border-rule pb-4">
          <h2 id={listId} className="text-sub font-semibold tracking-[-0.02em]">
            Votre liste
          </h2>
          <p className="t-num text-small text-ink-3">
            {formatCount(lines.length, 'référence')}, {formatCount(count, 'article')}
          </p>
        </div>

        <ul>
          {lines.map((line) => (
            <li
              key={line.slug}
              className="flex flex-wrap items-start gap-x-6 gap-y-5 border-b border-rule py-6 sm:flex-nowrap"
            >
              <Link
                href={`/produit/${line.slug}`}
                tabIndex={-1}
                aria-hidden
                className="relative block size-20 shrink-0 overflow-hidden rounded-well border border-rule bg-surface"
              >
                {line.image ? (
                  <Image src={line.image} alt="" fill sizes="80px" className="object-contain p-1.5" />
                ) : null}
              </Link>

              <div className="min-w-0 flex-1 basis-[13rem]">
                <Link
                  href={`/produit/${line.slug}`}
                  /* `block py-1` rather than a bare inline link: measured at
                     390 the two-line name was a 43-pixel target, and this row is
                     aimed at with a thumb. */
                  className="block py-1 text-small leading-[1.5] text-pretty transition-colors duration-[var(--t-fast)] hover:text-accent"
                >
                  <span className="draw-under">{line.name}</span>
                </Link>
                <p className="t-num mt-2 text-micro text-ink-3">{formatPrice(line.price)} l’unité</p>
              </div>

              <div className="flex w-full items-center justify-between gap-6 sm:w-auto sm:shrink-0 sm:justify-end">
                {/* A group rather than three loose controls: without it a screen
                    reader hears "minus, 2, plus" with no idea which of eleven
                    rows it is standing in. */}
                <div
                  role="group"
                  aria-label={`Quantité, ${line.name}`}
                  className="flex items-center rounded-control border border-rule"
                >
                  <button
                    type="button"
                    onClick={() => setQty(line.slug, line.qty - 1)}
                    aria-label={`Une unité de moins de ${line.name}`}
                    className="press grid size-11 place-items-center text-ink-2 transition-colors duration-[var(--t-fast)] hover:text-ink"
                  >
                    <span aria-hidden>-</span>
                  </button>
                  <span className="t-num w-8 text-center text-small">{line.qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty(line.slug, line.qty + 1)}
                    aria-label={`Une unité de plus de ${line.name}`}
                    className="press grid size-11 place-items-center text-ink-2 transition-colors duration-[var(--t-fast)] hover:text-ink"
                  >
                    <span aria-hidden>+</span>
                  </button>
                </div>

                {/* A floor on the width, or the steppers of eleven rows sit at
                    eleven different left edges: the line total is right-aligned
                    and 26 000 FCFA is thirty pixels narrower than 105 000. */}
                <div className="text-right sm:min-w-[7.5rem]">
                  <p className="t-num text-body font-bold tracking-[-0.015em]">
                    {formatPrice(line.price * line.qty)}
                  </p>
                  <button
                    type="button"
                    onClick={() => remove(line.slug)}
                    className="press mt-1 min-h-11 text-micro text-ink-3 transition-colors duration-[var(--t-fast)] hover:text-warn sm:min-h-0"
                  >
                    Retirer
                    <span className="sr-only"> {line.name} de la liste</span>
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-7 max-w-[68ch] text-micro leading-[1.6] text-ink-3">
          Cette liste vit dans ce navigateur, sur cet appareil. Elle n’est enregistrée sur aucun
          serveur et le magasin ne la voit pas tant que vous ne la lui avez pas envoyée.
        </p>
      </section>

      <aside aria-labelledby={sumId} className="lg:sticky lg:top-[8.5rem]">
        {/* `aria-live` on the figures and nowhere else: a reader changing a
            quantity is asking about the total, and it is the only thing on the
            page that answers without moving the focus. */}
        <section className="rounded-space border border-rule p-7">
          <h2 id={sumId} className="text-sub font-semibold tracking-[-0.02em]">
            Le chiffrage
          </h2>

          <dl aria-live="polite" className="mt-6 text-small">
            <div className="flex items-baseline justify-between gap-6 py-2">
              <dt className="text-ink-2">Base HT</dt>
              <dd className="t-num">{formatPrice(totals.ht)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-6 py-2">
              <dt className="text-ink-2">TVA {VAT_LABEL}</dt>
              <dd className="t-num">{formatPrice(totals.vat)}</dd>
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-6 border-t border-rule pt-4">
              <dt className="font-semibold">Total TTC</dt>
              <dd className="t-num text-sub font-bold tracking-[-0.02em]">
                {formatPrice(totals.ttc)}
              </dd>
            </div>
          </dl>

          <p className="mt-5 text-micro leading-[1.6] text-ink-3">
            Les prix du catalogue sont TTC. La base HT et la TVA ci-dessus en sont déduites au taux
            de {VAT_LABEL}, elles ne s’y ajoutent pas. Livraison et installation ne sont pas
            comprises : la proforma les chiffre.
          </p>
        </section>

        <section className="mt-6 rounded-space border border-rule p-7">
          <h2 className="t-label text-ink-3">Vos coordonnées</h2>

          {account ? (
            <>
              <p className="mt-4 text-small font-semibold">{account.name}</p>
              <p className="t-num mt-1 text-small text-ink-2">{account.phone}</p>
              {account.counter ? (
                <p className="mt-1 text-small text-ink-2">
                  Retrait à {counterLabel(account.counter)}
                </p>
              ) : null}
              <p className="mt-4 text-micro leading-[1.6] text-ink-3">
                Ces trois lignes partent avec la liste, pour que le comptoir sache à qui adresser la
                proforma.
              </p>
              <button
                type="button"
                onClick={openAccount}
                className="press mt-4 inline-flex min-h-11 items-center text-small font-semibold text-accent transition-colors duration-[var(--t-fast)] hover:text-accent-ink"
              >
                <span className="draw-under">Modifier ma fiche</span>
              </button>
            </>
          ) : (
            <>
              <p className="mt-4 text-small leading-[1.65] text-ink-2">
                Sans fiche, le message part sans votre nom ni votre comptoir de retrait, et le
                conseiller vous les demandera. Trois champs suffisent, et ils ne quittent pas cet
                appareil.
              </p>
              <button
                type="button"
                onClick={openAccount}
                className="press mt-4 inline-flex min-h-11 items-center text-small font-semibold text-accent transition-colors duration-[var(--t-fast)] hover:text-accent-ink"
              >
                <span className="draw-under">Remplir ma fiche</span>
              </button>
            </>
          )}
        </section>

        <section className="on-rail mt-6 rounded-space bg-rail p-7 text-rail-ink">
          <h2 className="text-sub font-semibold leading-[1.2] tracking-[-0.02em]">
            Envoyer la liste au comptoir
          </h2>
          <p className="mt-3 text-small leading-[1.6] text-pretty text-rail-ink-2">
            WhatsApp s’ouvre dans un nouvel onglet avec la liste, les quantités et le total déjà
            écrits. Vous relisez, vous appuyez sur envoyer, et le comptoir répond avec la proforma.
            Rien ne part de cette page toute seule.
          </p>

          <Action
            href={message.href}
            variant="on-rail"
            target="_blank"
            rel="noreferrer"
            className="mt-6 w-full"
          >
            Ouvrir WhatsApp
          </Action>

          {message.omitted > 0 ? (
            <p className="mt-5 border-t border-rail-rule pt-5 text-micro leading-[1.6] text-rail-ink-2">
              Un message WhatsApp trop long est coupé, donc les {message.detailed} premières
              références partent en détail et les {message.omitted} autres sont annoncées en nombre.
              Le total ci-dessus reste celui de la liste entière. Pour le détail complet, appelez le
              comptoir : le conseiller reprend la liste ligne par ligne.
            </p>
          ) : null}

          <div className="mt-6 border-t border-rail-rule pt-5">
            <p className="text-micro text-rail-ink-2">Ou appelez le comptoir</p>
            <ul className="mt-3 space-y-1">
              {PHONES.map((phone) => (
                <li key={phone}>
                  <a
                    href={`tel:${dialable(phone)}`}
                    className="t-num flex min-h-11 items-center gap-2.5 text-small text-rail-ink transition-colors duration-[var(--t-fast)] hover:text-rail-ink-2"
                  >
                    <IconPhone className="text-[1rem]" />
                    {phone}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </aside>
    </div>
  )
}
