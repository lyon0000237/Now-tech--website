import Link from 'next/link'

import { IconPhone, IconPin } from '@/components/brand/Icons'
import { Action } from '@/components/ui/Action'
import { PHONES, SHOWROOMS, WHATSAPP, dialable } from '@/constants/site'

/**
 * Where the shop physically is.
 *
 * This is the slot a storefront template gives to a newsletter sign-up, and the
 * swap is deliberate. Nobody in this market is deciding whether to buy a 900 000
 * FCFA NVR on the strength of a monthly email; they are deciding whether the
 * seller exists. Three streets you can drive to, with the landmarks addresses
 * actually use here, answer that question. An email field does not.
 *
 * WhatsApp sits beside the phone numbers rather than behind a form for the same
 * reason: it is how a buyer sends a photograph of the broken part and receives
 * the proforma back.
 */
export function ShowroomBand() {
  return (
    <section className="bg-space py-14 sm:py-20 md:py-28">
      <div className="shell grid gap-x-16 gap-y-10 sm:gap-y-12 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="enter text-title font-semibold leading-[1.1] tracking-[-0.025em] text-balance">
            <span className="-mb-[0.14em] block overflow-hidden pb-[0.14em]">
              <span className="e-line">Trois comptoirs, deux villes.</span>
            </span>
          </h2>
          <p className="enter e-text mt-4 max-w-[48ch] text-small leading-[1.65] text-pretty text-ink-2">
            Le stock est visible en magasin et se retire le jour même. Pour tout le reste,
            écrivez sur WhatsApp : une photo de la référence suffit.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-5">
            <Action href={`https://wa.me/${dialable(WHATSAPP)}`}>Écrire sur WhatsApp</Action>
            {/* The two numbers travel together: split across a wrap they read as
                one number and one orphan.

                On a phone a telephone number is the shortest path to this shop
                and it was a 19.5px target. Below sm each line takes 44 pixels
                and the pair keeps the 8px gap it already had; the desktop rows
                are unchanged. */}
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {PHONES.map((phone) => (
                <a
                  key={phone}
                  href={`tel:${dialable(phone)}`}
                  className="t-num flex min-h-11 items-center gap-2 text-small text-ink-2 transition-colors duration-[var(--t-fast)] hover:text-ink sm:min-h-0"
                >
                  <IconPhone className="text-[1rem] text-ink-3" />
                  {phone}
                </a>
              ))}
            </div>
          </div>
        </div>

        <ul className="grid gap-x-10 gap-y-10 sm:grid-cols-3">
          {SHOWROOMS.map((showroom, index) => (
            <li
              key={`${showroom.city}-${showroom.district}`}
              style={{ '--enter-index': index } as React.CSSProperties}
              className="enter e-item"
            >
              <p className="flex items-baseline gap-2.5 text-body font-semibold tracking-[-0.01em]">
                <IconPin className="translate-y-0.5 text-[1rem] text-accent" />
                {showroom.district}
              </p>
              <p className="mt-1 text-small text-ink-3">{showroom.city}</p>
              <p className="mt-3 text-small leading-[1.6] text-pretty text-ink-2">{showroom.directions}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="shell mt-10 border-t border-rule pt-4 sm:mt-14 sm:pt-6">
        <Link
          href="/contact"
          className="draw-under inline-flex min-h-11 items-center text-small font-semibold text-accent hover:text-accent-ink sm:min-h-0"
        >
          Horaires, plan d’accès et formulaire
        </Link>
      </div>
    </section>
  )
}
