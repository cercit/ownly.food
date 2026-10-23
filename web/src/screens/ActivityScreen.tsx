import { groupActivity } from '../api/ownly-api.ts';
import { useAuth } from '../lib/auth.tsx';
import { dateTime } from '../lib/format.ts';
import { hrefFor } from '../lib/router.ts';
import type { ActivityRow } from '../lib/types.ts';
import { Card, Empty, ErrorNote, Spinner, useLoad } from '../ui/kit.tsx';

type Change = { from?: unknown; to?: unknown };

/** Turns an audit-log row into a plain sentence. */
export function describe(a: ActivityRow): string {
  const c = (a.changes ?? {}) as Record<string, unknown>;
  const ch = (k: string) => c[k] as Change | undefined;
  switch (a.table_name) {
    case 'group_orders':
      if (a.action === 'insert') return 'started the group order';
      if (ch('status')) return `changed the order status to ${String(ch('status')!.to)}`;
      return 'updated the order';
    case 'group_members':
      if (a.action === 'insert') return 'joined the group';
      if (ch('status')?.to === 'left') return 'left the group';
      if (ch('status')?.to === 'joined') return 'rejoined the group';
      return 'updated a member';
    case 'order_items':
      if (a.action === 'insert') return `added a dish (quantity ${String(c.qty ?? 1)}${c.is_shared ? ', shared' : ''})`;
      if (a.action === 'delete') return 'removed a dish';
      return 'changed a dish';
    case 'payments':
      if (a.action === 'insert') return 'shares were worked out';
      if (ch('status')?.to === 'paid') return 'paid a share';
      return 'updated a payment';
    default: return `${a.action} ${a.table_name}`;
  }
}

export function ActivityScreen({ gid }: { gid: string }) {
  const { profile } = useAuth();
  const { data, error, loading, reload } = useLoad(() => groupActivity(gid), [gid]);
  if (loading) return <Spinner />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  const rows = data ?? [];
  return (
    <div className="max-w-2xl mx-auto">
      <a href={hrefFor({ name: 'cart', gid })} className="text-sm font-bold text-[#C40054]">Back to the group order</a>
      <h1 className="text-3xl font-extrabold mt-2 mb-1">Group activity</h1>
      <p className="text-[#576177] mb-5">Everything that happened in this group order, oldest first. Only members can see it.</p>
      {rows.length === 0 ? <Empty title="Nothing recorded yet" /> : (
        <Card><ol className="divide-y divide-[#F5E6ED]">
          {rows.map((a, i) => (
            <li key={i} className="py-3 flex gap-3 justify-between"><span><strong>{a.actor_id && a.actor_id === profile?.id ? 'You' : a.actor_id ? 'A group member' : 'The system'}</strong> {describe(a)}</span>
              <time dateTime={a.at} className="text-xs text-[#576177] shrink-0 tabular-nums">{dateTime(a.at)}</time></li>))}
        </ol></Card>)}
    </div>
  );
}
