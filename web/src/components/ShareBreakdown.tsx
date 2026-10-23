import { rupees, splitRuleName } from '../lib/format.ts';
import type { Group, GroupMember } from '../lib/types.ts';
import { statusBadge } from '../ui/kit.tsx';

const Line = ({ label, value, strong, hint }: { label: string; value: number; strong?: boolean; hint?: string }) => (
  <div className={`flex items-baseline justify-between gap-4 py-2 ${strong ? 'text-lg font-extrabold border-t border-[#F0D7E2] mt-1 pt-3' : ''}`}>
    <span className={strong ? '' : 'text-[#576177]'}>{label}{hint && <span className="block text-xs text-[#8A93A5] font-normal">{hint}</span>}</span>
    <span className="tabular-nums font-bold" data-amount>{rupees(value)}</span>
  </div>
);

/** Rapido's charges for the order as three plain lines, as the host entered them. Each is split equally. */
export function ChargesLines({ group }: { group: Group }) {
  const n = group.members.length;
  return (
    <div className="rounded-2xl bg-[#FFF9FC] border border-[#F0D7E2] px-4 py-2">
      <p className="text-xs font-bold text-[#576177] pt-1">Rapido's charges for this order, split equally across {n} {n === 1 ? 'person' : 'people'}</p>
      <Line label="Delivery" value={group.delivery_fee ?? 0} />
      <Line label="Packaging" value={group.packaging_fee ?? 0} />
      <Line label="Taxes" value={group.taxes ?? 0} />
    </div>
  );
}

/** One person's share, exactly as the database worked it out. Nothing is recalculated here. */
export function ShareBreakdown({ group, member }: { group: Group; member: GroupMember }) {
  const p = member.payment;
  if (!p) return <p className="text-[#576177]">Shares appear here once the host places the order.</p>;
  return (
    <div data-testid="share-breakdown">
      <p className="text-sm text-[#576177] mb-2">Split rule: <strong className="text-[#111D35]">{splitRuleName(group.split_rule)}</strong></p>
      {group.split_rule === 'equal'
        ? <Line label="Your equal share of the food" value={p.food} />
        : <>
            <Line label="Your own dishes" value={p.food} />
            <Line label="Your share of shared dishes" value={p.shared_share} hint="Shared dishes are split equally" />
          </>}
      <Line label="Your share of Rapido's charges" value={p.charges_share} />
      {p.tax_share > 0 && <Line label="Your share of taxes" value={p.tax_share} />}
      <Line label="You pay" value={p.total} strong />
    </div>
  );
}

/** Everyone's food and share with Paid or Pending, from the database. */
export function MemberShareRow({ member }: { member: GroupMember }) {
  const p = member.payment;
  return (
    <li className="border border-[#F0D7E2] rounded-2xl p-4 bg-white" data-testid="member-share">
      <div className="flex items-center justify-between gap-3">
        <p className="font-extrabold">{member.name}{member.is_me && ' (you)'}{member.role === 'host' && <span className="ml-2 text-xs font-bold text-[#C40054]">Host</span>}</p>
        {p ? statusBadge(p.status) : null}
      </div>
      <ul className="text-sm text-[#576177] mt-2 space-y-0.5">
        {member.items.length === 0 && <li>No dishes</li>}
        {member.items.map(i => <li key={i.id}>{i.qty} × {i.dish}{i.is_shared ? ' (shared)' : ''}</li>)}
      </ul>
      {p && (
        <dl className="grid grid-cols-3 gap-2 text-sm mt-3 tabular-nums">
          <div><dt className="text-xs text-[#576177]">Food</dt><dd className="font-bold" data-field="food">{rupees(p.food)}</dd></div>
          <div><dt className="text-xs text-[#576177]">Shared</dt><dd className="font-bold" data-field="shared">{rupees(p.shared_share)}</dd></div>
          <div><dt className="text-xs text-[#576177]">Charges</dt><dd className="font-bold" data-field="charges">{rupees(p.charges_share)}</dd></div>
          <div className="col-span-3 flex justify-between border-t border-[#F0D7E2] pt-2"><dt className="font-bold">Total</dt><dd className="font-extrabold" data-field="total">{rupees(p.total)}</dd></div>
        </dl>)}
    </li>
  );
}
