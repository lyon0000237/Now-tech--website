"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { IconClose, IconPhone } from "@/components/brand/Icons";
import { Action } from "@/components/ui/Action";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { PHONES, dialable } from "@/constants/site";

/**
 * The basket, as a drawer.
 *
 * A drawer rather than a page, because losing your place in a grid of four
 * thousand references to confirm one addition is a real cost. It slides from the
 * right, traps focus while open, closes on Escape and on the backdrop, and gives
 * focus back to whatever opened it.
 *
 * WHAT IT IS FOR. This basket does not check out, and it does not pretend to:
 * there is no payment gateway behind it and there will not be one, because the
 * shop is paid in cash at the counter, on delivery, or by mobile money against a
 * proforma. So the drawer's own call to action is the proforma, and its second
 * is the phone. A "Payer" button that led nowhere would be the one dishonest
 * control on the site.
 *
 * THE MOTION IS E-SHOP'S, TO THE NUMBER. Scrim 300ms on opacity, panel 460ms on
 * x from 100%, both on [0.22, 1, 0.36, 1], and both wrapped in `AnimatePresence`
 * so the panel travels back out instead of vanishing. That exit is the whole
 * difference: a drawer that slides in and then disappears on close reads as two
 * different objects, and the CSS version here could not animate an element it
 * had already unmounted.
 *
 * The empty state is a designed screen rather than a message, since it is the
 * one most first-time visitors will actually see.
 *
 * EVERY CONTROL IN HERE WAS DRAWN FOR A POINTER AND MEASURED FOR ONE. At 360
 * the audit read the cross at 36 x 36, the two quantity steppers at 32 x 32
 * eight pixels apart, "Retirer" at 38 x 18 and the telephone number at 312 x 20:
 * five targets under the 44 a finger needs, on the one panel where a customer
 * changes their mind about money. All five are floored below `md` and left
 * exactly as they were from `md` up, where the aiming is done with a mouse:
 * measured at 1440 the cross is 36, the steppers 32 and the number 20, before
 * and after.
 */

/** NENGi's workhorse curve: everything decelerates into place, nothing overshoots. */
const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export function CartDrawer() {
  const { isOpen, close, lines, subtotal, count, setQty, remove, lastAdded } =
    useCart();
  const panel = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (isOpen) {
      restoreTo.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      // The heading, not the close button: a reader arriving in the panel should
      // hear what it is before they hear how to leave it.
      panel.current?.focus();
    } else {
      document.body.style.overflow = "";
      restoreTo.current?.focus?.();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Tab" || !panel.current) return;
      // Without the trap, tabbing walks the page behind the drawer, which on a
      // catalogue this long is a reader lost for good.
      const focusable = panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-[var(--z-drawer)]">
          <motion.button
            type="button"
            aria-label="Fermer le panier"
            onClick={close}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT as never }}
            className="absolute inset-0 cursor-pointer bg-[rgb(20_23_21_/_0.45)] backdrop-blur-[2px]"
          />

          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="Votre panier"
            tabIndex={-1}
            initial={reduced ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={reduced ? undefined : { x: "100%" }}
            transition={{ duration: 0.46, ease: EASE_OUT as never }}
            className="absolute inset-y-0 right-0 flex w-full max-w-[26rem] flex-col bg-paper shadow-[-24px_0_60px_-30px_rgb(20_23_21_/_0.45)] outline-none"
          >
            <div className="flex items-center justify-between gap-4 border-b border-rule px-6 py-5">
              <h2 className="text-sub font-semibold tracking-[-0.02em]">
                Panier
                {count > 0 ? (
                  <span className="t-num ml-2 text-small text-ink-3">
                    {count}
                  </span>
                ) : null}
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Fermer le panier"
                className="press -mr-2 grid size-11 place-items-center rounded-control text-ink-2 transition-colors duration-[var(--t-fast)] hover:text-ink md:mr-0 md:size-9"
              >
                <IconClose className="text-[1.25rem]" />
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col justify-center px-6 py-12 text-center">
                <p className="text-body font-semibold">
                  Votre panier est vide.
                </p>
                <p className="mx-auto mt-3 max-w-[34ch] text-small leading-[1.6] text-pretty text-ink-2">
                  Ajoutez les références qui vous intéressent, puis demandez la
                  proforma. Rien n’est payé en ligne : le règlement se fait au
                  comptoir, à la livraison ou par Mobile Money.
                </p>
                <Action
                  href="/catalogue"
                  className="mx-auto mt-8"
                  onClick={close}
                >
                  Ouvrir le catalogue
                </Action>
              </div>
            ) : (
              <>
                <ul className="flex-1 divide-y divide-rule overflow-y-auto px-6">
                  {lines.map((line) => (
                    <li
                      key={line.slug}
                      className={`flex gap-4 py-5 ${
                        line.slug === lastAdded
                          ? "motion-safe:animate-[line-in_520ms_var(--ease-draw)_both]"
                          : ""
                      }`}
                    >
                      <Link
                        href={`/produit/${line.slug}`}
                        onClick={close}
                        className="relative block size-[72px] shrink-0 overflow-hidden rounded-well bg-surface"
                      >
                        {line.image ? (
                          <Image
                            src={line.image}
                            alt=""
                            fill
                            sizes="72px"
                            className="object-contain p-1"
                          />
                        ) : null}
                      </Link>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/produit/${line.slug}`}
                          onClick={close}
                          /* `clamp-2` is `-webkit-box`, so the floor is a
                             min-height and not a flex centring: the utility
                             would lose to the unlayered class and the row would
                             read as centred while being drawn from the top. */
                          className="clamp-2 block min-h-11 text-small leading-[1.4] hover:text-accent md:min-h-0"
                        >
                          {line.name}
                        </Link>
                        <p className="t-num mt-1.5 text-small font-bold">
                          {formatPrice(line.price)}
                        </p>

                        <div className="mt-3 flex items-center gap-3 md:gap-4">
                          <div className="flex items-center rounded-control border border-rule">
                            <button
                              type="button"
                              onClick={() => setQty(line.slug, line.qty - 1)}
                              aria-label={`Retirer un ${line.name}`}
                              className="press grid size-11 place-items-center text-ink-2 hover:text-ink md:size-8"
                            >
                              <span aria-hidden>−</span>
                            </button>
                            <span className="t-num w-7 text-center text-small">
                              {line.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQty(line.slug, line.qty + 1)}
                              aria-label={`Ajouter un ${line.name}`}
                              className="press grid size-11 place-items-center text-ink-2 hover:text-ink md:size-8"
                            >
                              <span aria-hidden>+</span>
                            </button>
                          </div>
                          {/* The padding is what makes the width, since the
                              word is 38 pixels long and a target is 44. It is
                              given back as a negative margin so the label still
                              sits where it was drawn. */}
                          <button
                            type="button"
                            onClick={() => remove(line.slug)}
                            className="press -mr-2 flex min-h-11 items-center px-2 text-micro text-ink-3 transition-colors duration-[var(--t-fast)] hover:text-warn md:mr-0 md:min-h-0 md:px-0"
                          >
                            Retirer
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-rule px-6 py-6">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-small text-ink-2">Sous-total</span>
                    <span className="t-num text-sub font-bold">
                      {formatPrice(subtotal)}
                    </span>
                  </div>
                  <p className="mt-2 text-micro leading-[1.5] text-ink-3">
                    Hors livraison. La proforma confirme les prix, les délais et
                    la TVA.
                  </p>

                  <Action href="/devis" onClick={close} className="mt-6 w-full">
                    Demander la proforma
                  </Action>
                  <a
                    href={`tel:${dialable(PHONES[0])}`}
                    className="t-num mt-2 flex min-h-11 items-center justify-center gap-2.5 text-small text-ink-2 transition-colors duration-[var(--t-fast)] hover:text-ink md:mt-4 md:min-h-0"
                  >
                    <IconPhone className="text-[1rem] text-ink-3" />
                    {PHONES[0]}
                  </a>
                </div>
              </>
            )}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
