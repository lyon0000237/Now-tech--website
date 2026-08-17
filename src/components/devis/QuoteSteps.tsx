/**
 * How this shop actually works, in three moves.
 *
 * WHAT IT REPLACES AND WHY THAT WAS NOT WORKING. The page opened with a
 * fifty-word paragraph carrying four separate facts: nothing is paid online, the
 * site sends nothing by itself, you build a list here, you open it in WhatsApp or
 * you telephone, and the counter returns a proforma with confirmed prices, lead
 * times and VAT. Every one of those is true and load-bearing, and set as prose
 * they arrived as a wall in front of the one page where a customer is deciding to
 * spend money. Nobody reads a paragraph to find out whether they can trust a
 * shop; they scan for the shape of the transaction.
 *
 * So the same facts are set as the sequence they describe. Three steps is not a
 * decoration on the copy, it IS the copy: the page's whole subject is that this
 * is a three-move process ending in a document rather than a one-move process
 * ending in a payment, and the layout can say that before a single word is read.
 *
 * NO ICONS, AND THAT IS THE DECISION MOST LIKELY TO BE QUESTIONED. The house
 * icon family exists and a basket, a chat bubble and a document would sit here
 * comfortably. They would also be three drawings that say what three headings
 * already say, on a page whose credibility rests on not overselling. The
 * numerals do the sequencing work an icon cannot: they say WHICH ORDER, which is
 * the only thing about these three facts that is not obvious.
 *
 * THE ACCENT APPEARS ONCE. On the third numeral, because the third step is the
 * one the customer came for and the only one the shop performs. One green mark in
 * the block, at the end, reading as an arrival.
 *
 * A SERVER COMPONENT. Nothing here moves, nothing here reads the basket, and this
 * block sits above the one part of the page that must hydrate. Making it a client
 * component would put the first thing the reader sees behind the JavaScript.
 */
const STEPS = [
  {
    title: 'Vous constituez la liste',
    detail: 'Ajoutez vos références, corrigez les quantités. Elle reste sur cet appareil.',
  },
  {
    title: 'Vous l’envoyez au comptoir',
    detail: 'Par WhatsApp ou par téléphone, quand vous êtes prêt. Rien ne part tout seul.',
  },
  {
    title: 'Le comptoir renvoie la proforma',
    detail: 'Prix confirmés, délais et TVA. Le règlement se fait au comptoir, à la livraison ou par Mobile Money.',
  },
] as const

export function QuoteSteps() {
  return (
    <section aria-label="Comment se passe une commande" className="shell pb-12 sm:pb-16">
      {/* A rule above and dividers between, which is how this site draws
          structure everywhere else. No card, no fill: a panel here would make
          three sentences look like a feature and lift them off a page that is
          otherwise a working document. */}
      <ol className="grid border-t border-rule sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            /* The divider is a left border from `sm` and a top border below it,
               so the same three items read as a row on a desktop and as a stack
               on a phone without either state carrying a stray line. */
            className="border-rule pt-5 pb-1 first:border-t-0 not-first:border-t sm:border-t-0 sm:px-6 sm:not-first:border-l sm:first:pl-0 sm:last:pr-0"
          >
            <p
              className={`t-num text-sub font-bold tabular-nums ${
                index === STEPS.length - 1 ? 'text-accent' : 'text-ink-3'
              }`}
            >
              {index + 1}
            </p>
            <h3 className="mt-2 text-body font-semibold leading-[1.3] tracking-[-0.015em] text-pretty">
              {step.title}
            </h3>
            <p className="mt-1.5 max-w-[38ch] text-small leading-[1.6] text-pretty text-ink-2">
              {step.detail}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}
