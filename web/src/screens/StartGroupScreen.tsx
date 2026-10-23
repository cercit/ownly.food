import { useEffect, useState } from 'react';
import { listAddresses, listRestaurants, startGroupOrder } from '../api/ownly-api.ts';
import { labelName, splitRuleName } from '../lib/format.ts';
import { hrefFor } from '../lib/router.ts';
import type { SplitRule, StartedGroup } from '../lib/types.ts';
import { Button, Card, ErrorNote, Field, Spinner, inputCls, useLoad } from '../ui/kit.tsx';
import { SharePanel } from '../ui/group.tsx';

const RULES: { value: SplitRule; desc: string }[] = [
  { value: 'itemised', desc: 'Your own dishes at full price, plus an equal share of any dish marked Shared and of Rapido\'s charges.' },
  { value: 'equal', desc: 'The whole bill (food and charges) divided equally by the number of people.' },
];

const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export function StartGroupScreen({ rid }: { rid?: string }) {
  const rests = useLoad(() => listRestaurants('Chennai'), []);
  const addrs = useLoad(listAddresses, []);
  const [restaurantId, setRestaurantId] = useState(rid ?? '');
  const [addressId, setAddressId] = useState('');
  const [cut, setCut] = useState<'15' | '30' | 'custom'>('30');
  const [custom, setCustom] = useState(toLocalInput(new Date(Date.now() + 60 * 60000)));
  const [rule, setRule] = useState<SplitRule>('itemised');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StartedGroup | null>(null);

  useEffect(() => { if (rid) setRestaurantId(rid); }, [rid]);
  useEffect(() => { if (!addressId && addrs.data?.length) setAddressId((addrs.data.find(a => a.is_default) ?? addrs.data[0]).id); }, [addrs.data, addressId]);

  if (rests.loading || addrs.loading) return <Spinner />;
  const loadError = rests.error ?? addrs.error;
  if (loadError) return <ErrorNote message={loadError} onRetry={() => { rests.reload(); addrs.reload(); }} />;
  const restaurant = rests.data?.find(r => r.id === restaurantId);

  if (result) return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Card>
        <h1 className="text-3xl font-extrabold">{result.existing ? 'You already have an open group order here' : 'Your group order is open'}</h1>
        <p className="text-[#576177] mt-2">
          {result.existing
            ? `We opened your existing order at ${restaurant?.name ?? 'this restaurant'} instead of making a second one. It uses the rule: ${splitRuleName(result.split_rule)}.`
            : `Share the code, the link or the QR code. Everyone who joins adds their own dishes. Split rule: ${splitRuleName(result.split_rule)}.`}
        </p>
        <div className="mt-6"><SharePanel code={result.share_code} restaurant={restaurant?.name} /></div>
        <div className="mt-6"><a href={hrefFor({ name: 'cart', gid: result.id })} className="inline-flex min-h-12 px-6 items-center rounded-full bg-[#C40054] text-white font-bold no-underline hover:bg-[#A80047]">Open the shared cart</a></div>
      </Card>
    </div>
  );

  const start = async () => {
    setError(null);
    if (!restaurantId) return setError('Choose a restaurant.');
    if (!addressId) return setError('Choose a delivery address.');
    const when = cut === 'custom' ? new Date(custom) : new Date(Date.now() + Number(cut) * 60000);
    if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) return setError('The cut-off time has to be in the future.');
    setBusy(true);
    try { setResult(await startGroupOrder(restaurantId, addressId, when, rule)); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-1">Start a group order</h1>
      <p className="text-[#576177] mb-6">You are the host. You lock the order, place it and can cancel it.</p>
      <Card className="space-y-5">
        <Field label="Restaurant">
          <select value={restaurantId} onChange={e => setRestaurantId(e.target.value)} className={inputCls}>
            <option value="">Choose a restaurant</option>
            {rests.data?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>

        <Field label="Deliver to">
          {addrs.data?.length
            ? <select value={addressId} onChange={e => setAddressId(e.target.value)} className={inputCls}>
                {addrs.data.map(a => <option key={a.id} value={a.id}>{labelName(a.label, a.label_name)} · {a.line1}, {a.area}</option>)}</select>
            : <p className="text-sm bg-[#FFF1D9] text-[#855000] rounded-2xl p-4">You have no saved address yet. <a href={hrefFor({ name: 'profile' })} className="font-bold">Add an address in your profile</a>, then come back.</p>}
        </Field>

        <fieldset>
          <legend className="text-sm font-bold mb-1.5">Cut-off time</legend>
          <div className="flex flex-wrap gap-2">
            {([['15', '15 minutes'], ['30', '30 minutes'], ['custom', 'Custom']] as const).map(([v, l]) => (
              <button key={v} type="button" onClick={() => setCut(v)} aria-pressed={cut === v}
                className={`px-5 min-h-11 rounded-full font-bold text-sm border cursor-pointer ${cut === v ? 'bg-[#C40054] text-white border-[#C40054]' : 'bg-white border-[#F0D7E2] text-[#576177]'}`}>{l}</button>))}
          </div>
          {cut === 'custom' && <input type="datetime-local" aria-label="Custom cut-off time" value={custom} min={toLocalInput(new Date())} onChange={e => setCustom(e.target.value)} className={`${inputCls} mt-3`} />}
          <p className="text-xs text-[#576177] mt-2">Friends can join and add dishes until this time, or until you lock the cart.</p>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-bold mb-1.5">How should the bill be split?</legend>
          <div className="space-y-3">
            {RULES.map(r => (
              <label key={r.value} className={`flex gap-3 p-4 rounded-2xl border-[1.5px] cursor-pointer ${rule === r.value ? 'border-[#C40054] bg-[#FFF1F6]' : 'border-[#F0D7E2]'}`}>
                <input type="radio" name="rule" checked={rule === r.value} onChange={() => setRule(r.value)} className="mt-1 size-5 accent-[#C40054]" />
                <span><span className="font-extrabold block">{splitRuleName(r.value)}{r.value === 'itemised' && <span className="ml-2 text-xs font-bold text-[#C40054]">Default</span>}</span>
                  <span className="text-sm text-[#576177]">{r.desc}</span></span>
              </label>))}
          </div>
        </fieldset>

        {error && <ErrorNote message={error} />}
        <Button onClick={start} busy={busy} disabled={!addrs.data?.length} className="w-full sm:w-auto">Start group order</Button>
      </Card>
    </div>
  );
}
