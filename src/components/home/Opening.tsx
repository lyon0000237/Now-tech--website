import { Action } from '@/components/ui/Action'
import { formatAmount } from '@/lib/format'

/**
 * The opening.
 *
 * Not a hero image. The audience arrives on a mid-range Android over a metered
 * connection, where a full-screen atmospheric opener spends the customer's own
 * money to communicate nothing purchasable and pushes the catalog below the
 * fold. What the first screen owes them is orientation: what this shop is, how
 * big it is, where to start, and how to reach a human.
 *
 * The four figures are read from the catalog at build time rather than written
 * by hand, so they are true and they move when the stock does.
 */
export function Opening({
  productCount,
  brandCount,
}: {
  productCount: number
  brandCount: number
}) {
  return (
    <section className="shell grid items-end gap-8 pt-13 pb-10 lg:grid-cols-[1.5fr_1fr] lg:gap-14">
      <div>
        <h1 className="max-w-[16ch] text-[clamp(2.125rem,4.6vw,3.625rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-balance">
          Tout l’équipement technique, rangé comme dans l’atelier.
        </h1>
        <p className="mt-4.5 max-w-[52ch] text-[1.0625rem] text-ink-2">
          Réseau, sécurité, énergie, informatique. Douze rayons, {formatAmount(productCount)}{' '}
          références en stock à Douala et Yaoundé, avec garantie et retrait le jour même.
        </p>
        <div className="mt-6.5 flex flex-wrap gap-3">
          <Action href="/catalogue">Explorer le catalogue</Action>
          <Action href="/devis" variant="secondary">
            Demander un devis
          </Action>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-well border border-rule bg-rule">
        <Fact value={formatAmount(productCount)} label="Références" />
        <Fact value={formatAmount(brandCount)} label="Marques" />
        <Fact value="24 h" label="Livraison Douala" />
        <Fact value="3" label="Showrooms" />
      </dl>
    </section>
  )
}

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-paper px-4 py-4">
      <dd className="t-num text-[1.3125rem] font-bold tracking-[-0.02em]">{value}</dd>
      <dt className="text-[0.78125rem] text-ink-3">{label}</dt>
    </div>
  )
}
