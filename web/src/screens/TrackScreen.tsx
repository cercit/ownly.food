import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { markDelivered } from '../api/ownly-api.ts';
import { labelName, mmss, timeOnly } from '../lib/format.ts';
import { hrefFor } from '../lib/router.ts';
import { TRACKING_STAGES, STAGE_START_SECONDS, isDeliveredStage, onceReporter, secondsToNextStage, stageIndex } from '../lib/tracking.ts';
import { Card, Empty, ErrorNote, Spinner, useNow } from '../ui/kit.tsx';
import { SharePanel, useGroup } from '../ui/group.tsx';
import { RouteMap } from '../components/RouteMap.tsx';
import { GroupLinks } from '../components/GroupLinks.tsx';

const NOTES = ['The restaurant has your order.', 'Your food is being prepared.', 'Your order has been picked up.', 'Your Rapido Captain is on the way.', 'Delivered. Enjoy your meal!'];

export function TrackScreen({ gid }: { gid: string }) {
  const { member: g, preview, error, loading, refresh } = useGroup(gid);
  const now = useNow();
  const report = useRef<ReturnType<typeof onceReporter> | null>(null);

  const placedAt = g?.placed_at ?? null;
  const idx = placedAt ? stageIndex(placedAt, now) : 0;
  const finished = placedAt ? isDeliveredStage(idx) : false;

  // When the timer reaches Delivered, tell the database once. Any member's phone may do this; it is safe to repeat.
  useEffect(() => {
    if (!g || g.status !== 'placed' || !finished) return;
    report.current ??= onceReporter(() => markDelivered(gid));
    report.current().then(ok => { if (ok) refresh(); });
  }, [g, finished, gid, refresh]);

  if (loading && !g) return <Spinner />;
  if (error && !g) return <ErrorNote message={error} onRetry={refresh} />;
  if (preview || !g) return <Empty title="Join this group first" />;
  if (g.status === 'cancelled') return <Empty title="This order was cancelled" />;
  if (!placedAt) return <Empty title="Tracking starts when the host places the order" action={<a href={hrefFor({ name: 'cart', gid })} className="font-bold">Back to the cart</a>} />;

  const shownIdx = g.status === 'delivered' ? TRACKING_STAGES.length - 1 : idx;
  const next = secondsToNextStage(placedAt, now);
  const progress = Math.min(1, (now - new Date(placedAt).getTime()) / (STAGE_START_SECONDS[STAGE_START_SECONDS.length - 1] * 1000));
  const p = g.status === 'delivered' ? 1 : progress;
  const dotX = 50 + p * 300; const dotY = 120 - Math.sin(p * Math.PI) * 55;
  const from = g.restaurant.lat != null && g.restaurant.lng != null ? { lat: +g.restaurant.lat, lng: +g.restaurant.lng } : null;
  const to = g.deliver_to?.lat != null && g.deliver_to?.lng != null ? { lat: +g.deliver_to.lat, lng: +g.deliver_to.lng } : null;
  const toLabel = g.deliver_to ? `${labelName(g.deliver_to.label, g.deliver_to.label_name)}, ${g.deliver_to.area}` : 'You';

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <h1 className="text-3xl font-extrabold">Live tracking</h1>
      <Card>
        <p className="text-sm text-[#576177]">{g.restaurant.name}{g.deliver_to && ` → ${labelName(g.deliver_to.label, g.deliver_to.label_name)}, ${g.deliver_to.area}`}</p>
        <p className="text-2xl font-extrabold mt-1" aria-live="polite" data-testid="stage-note">{NOTES[shownIdx]}</p>
        {next !== null && g.status !== 'delivered' && <p className="text-sm text-[#576177] mt-1 tabular-nums">Next step in {mmss(next)}</p>}

        {from && to ? <div className="mt-4"><RouteMap from={from} to={to} progress={p} fromLabel={g.restaurant.name.split(' - ')[0]} toLabel={toLabel} />
          <p className="text-xs text-[#576177] mt-1">The delivery pin shows the middle of the area, not the exact address.</p></div> :
        <svg viewBox="0 0 400 160" role="img" aria-label="Simple map from the restaurant to the delivery address" className="w-full mt-4 rounded-2xl bg-[#FFF1F6] border border-[#F0D7E2]">
          <path d="M50 120 Q200 -10 350 120" fill="none" stroke="#F0B4CC" strokeWidth="4" strokeDasharray="8 8" strokeLinecap="round" />
          <circle cx="50" cy="120" r="10" fill="#C40054" /><circle cx="50" cy="120" r="4" fill="#fff" />
          <circle cx="350" cy="120" r="11" fill="#16845A" /><circle cx="350" cy="120" r="5" fill="#fff" />
          <circle cx={dotX} cy={dotY} r="9" fill="#111D35" /><circle cx={dotX} cy={dotY} r="4" fill="#fff" />
          <text x="50" y="148" textAnchor="middle" fontSize="11" fill="#576177">Restaurant</text>
          <text x="350" y="148" textAnchor="middle" fontSize="11" fill="#576177">You</text>
        </svg>}

        <ol className="mt-5 space-y-3" aria-label="Order stages">
          {TRACKING_STAGES.map((s, i) => {
            const done = i < shownIdx || (i === shownIdx && shownIdx === TRACKING_STAGES.length - 1); const cur = i === shownIdx;
            return (
              <li key={s} aria-current={cur ? 'step' : undefined} className="flex items-center gap-3">
                <span className={`size-8 rounded-full grid place-items-center text-sm font-bold ${done ? 'bg-[#16845A] text-white' : cur ? 'bg-[#C40054] text-white motion-safe:animate-pulse' : 'bg-[#F4EEF1] text-[#576177]'}`}>{done ? <Check className="size-4" aria-label="done" /> : i + 1}</span>
                <span className={`font-bold flex-1 ${cur || done ? '' : 'text-[#576177]'}`}>{s}</span>
                <time className="text-sm text-[#576177] tabular-nums">{timeOnly(new Date(new Date(placedAt).getTime() + STAGE_START_SECONDS[i] * 1000).toISOString())}</time>
              </li>);
          })}
        </ol>
        <p className="text-xs text-[#576177] mt-5">In this prototype the stages move on a timer counted from when the order was placed, so every phone in the group shows the same stage.</p>
        <div className="mt-5"><GroupLinks gid={gid} show={['pay', 'confirmed', 'activity', 'orders']} /></div>
      </Card>
      <Card><h2 className="text-lg font-extrabold mb-3">Share this tracking link</h2><SharePanel code={g.share_code} restaurant={g.restaurant.name} /></Card>
    </div>
  );
}
