import { PartyPopper } from 'lucide-react';
import { labelName, rupees } from '../lib/format.ts';
import { hrefFor } from '../lib/router.ts';
import { Card, Empty, ErrorNote, Spinner } from '../ui/kit.tsx';
import { ChargesLines, MemberShareRow } from '../components/ShareBreakdown.tsx';
import { SharePanel, useGroup } from '../ui/group.tsx';

export function ConfirmationScreen({ gid }: { gid: string }) {
  const { member: g, preview, error, loading, refresh } = useGroup(gid);
  if (loading && !g) return <Spinner />;
  if (error && !g) return <ErrorNote message={error} onRetry={refresh} />;
  if (preview || !g) return <Empty title="Join this group first" />;
  if (g.status === 'open' || g.status === 'locked') return <Empty title="This order is not placed yet" action={<a href={hrefFor({ name: 'cart', gid })} className="font-bold">Back to the cart</a>} />;
  if (g.status === 'cancelled') return <Empty title="This order was cancelled" />;
  const total = g.members.reduce((s, m) => s + (m.payment?.total ?? 0), 0);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="text-center rounded-3xl p-8 border border-[#F0D7E2] bg-[radial-gradient(circle_at_50%_0,#FFD3E3_0,transparent_60%),#fff]">
        <PartyPopper className="size-12 mx-auto text-[#C40054] motion-safe:animate-bounce" aria-hidden />
        <h1 className="text-3xl sm:text-4xl font-extrabold mt-3">Order placed!</h1>
        <p className="text-[#576177] mt-2">{g.restaurant.name}{g.deliver_to && ` · Deliver to ${labelName(g.deliver_to.label, g.deliver_to.label_name)}, ${g.deliver_to.area}`}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <a href={hrefFor({ name: 'pay', gid })} className="inline-flex min-h-12 px-6 items-center rounded-full bg-[#C40054] text-white font-bold no-underline hover:bg-[#A80047]">Pay my share</a>
          <a href={hrefFor({ name: 'track', gid })} className="inline-flex min-h-12 px-6 items-center rounded-full border-[1.5px] border-[#F0D7E2] bg-white font-bold no-underline text-[#111D35] hover:bg-[#FFF1F6]">Track the order</a>
        </div>
      </div>

      <Card>
        <h2 className="text-xl font-extrabold mb-3">Who ordered what</h2>
        <ul className="grid gap-3 md:grid-cols-2">{g.members.map(m => <MemberShareRow key={m.member_id} member={m} />)}</ul>
        <div className="mt-4"><ChargesLines group={g} /></div>
        <div className="flex justify-between border-t border-[#F0D7E2] mt-4 pt-3 font-extrabold text-lg"><span>Whole bill</span><span className="tabular-nums" data-testid="bill-total">{rupees(total)}</span></div>
      </Card>

      <Card>
        <h2 className="text-xl font-extrabold mb-1">Tracking link</h2>
        <p className="text-sm text-[#576177] mb-4">Anyone in the group can open this link to see the order and track it.</p>
        <SharePanel code={g.share_code} restaurant={g.restaurant.name} />
      </Card>
    </div>
  );
}
