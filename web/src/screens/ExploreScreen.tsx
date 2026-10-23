import { useMemo, useState } from 'react';
import { Leaf } from 'lucide-react';
import { listRestaurants } from '../api/ownly-api.ts';
import { CHENNAI_AREAS } from '../lib/config.ts';
import { hrefFor } from '../lib/router.ts';
import { Badge, Empty, ErrorNote, Spinner, useLoad } from '../ui/kit.tsx';

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : '');

export function ExploreScreen() {
  const { data, error, loading, reload } = useLoad(() => listRestaurants('Chennai'), []);
  const [area, setArea] = useState<string>('All');
  const [cuisine, setCuisine] = useState<string>('All');
  const [vegOnly, setVegOnly] = useState(false);

  const cuisines = useMemo(() => ['All', ...new Set((data ?? []).flatMap(r => r.cuisine.split('/').map(c => c.trim())))].sort((a, b) => (a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b))), [data]);
  const shown = (data ?? []).filter(r =>
    (area === 'All' || r.area === area) &&
    (cuisine === 'All' || r.cuisine.split('/').map(c => c.trim()).includes(cuisine)) &&
    (!vegOnly || r.veg_only));

  return (
    <div>
      <div className="rounded-3xl p-6 sm:p-10 mb-6 border border-[#F0D7E2] bg-[radial-gradient(circle_at_85%_28%,#FFD3E3_0,transparent_40%),linear-gradient(160deg,#FFFFFF,#FFF1F6)]">
        <p className="text-xs font-extrabold tracking-widest uppercase text-[#C40054]">A new way to order together · Chennai concept</p>
        <h1 className="text-3xl sm:text-5xl font-extrabold mt-2 leading-tight"><span className="text-[#C40054]">Order together.</span> Pay your share.</h1>
        <p className="text-[#576177] mt-3 max-w-xl">Pick a restaurant, start a group order and share the code. Everyone adds their own food and pays their own share.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3" role="group" aria-label="Filter by area">
        {['All', ...CHENNAI_AREAS].map(a => (
          <button key={a} onClick={() => setArea(a)} aria-pressed={area === a}
            className={`px-4 min-h-11 rounded-full text-sm font-bold border cursor-pointer ${area === a ? 'bg-[#C40054] text-white border-[#C40054]' : 'bg-white border-[#F0D7E2] text-[#576177] hover:bg-[#FFF1F6]'}`}>{a === 'All' ? 'All areas' : a}</button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <label className="text-sm font-bold flex items-center gap-2">Cuisine
          <select value={cuisine} onChange={e => setCuisine(e.target.value)} className="min-h-11 px-3 rounded-xl border-[1.5px] border-[#F0D7E2] bg-white font-normal">
            {cuisines.map(c => <option key={c}>{c}</option>)}</select></label>
        <label className="text-sm font-bold flex items-center gap-2 cursor-pointer min-h-11">
          <input type="checkbox" checked={vegOnly} onChange={e => setVegOnly(e.target.checked)} className="size-5 accent-[#16845A]" />
          <Leaf className="size-4 text-[#16845A]" aria-hidden /> Veg only</label>
      </div>

      {loading && <Spinner label="Loading restaurants" />}
      {error && <ErrorNote message={error} onRetry={reload} />}
      {!loading && !error && shown.length === 0 && <Empty title="No restaurants match" hint="Try another area or cuisine." />}
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map(r => (
          <li key={r.id} className="bg-white border border-[#F0D7E2] rounded-3xl overflow-hidden shadow-[0_6px_18px_rgba(17,29,53,0.06)] flex flex-col">
            <div className="aspect-[16/10] bg-[#FFE3ED]">
              {r.image_url && <img src={r.image_url} alt={r.name} loading="lazy" className="w-full h-full object-cover" />}
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-extrabold leading-snug">{r.name}</h2>
                {r.veg_only && <Badge tone="paid">Veg only</Badge>}
              </div>
              <p className="text-sm text-[#576177] mt-1">{r.cuisine} · {r.area}</p>
              {r.opens_at && r.closes_at && <p className="text-xs text-[#576177] mt-1">Open {hhmm(r.opens_at)} to {hhmm(r.closes_at)}</p>}
              <div className="mt-4 grid grid-cols-2 gap-2 pt-1 mt-auto">
                <a href={hrefFor({ name: 'menu', rid: r.id })} className="min-h-11 rounded-full border-[1.5px] border-[#F0D7E2] grid place-items-center text-sm font-bold text-[#111D35] no-underline hover:bg-[#FFF1F6]">View menu</a>
                <a href={hrefFor({ name: 'start', rid: r.id })} className="min-h-11 rounded-full bg-[#C40054] grid place-items-center text-sm font-bold text-white no-underline hover:bg-[#A80047]">Start group order</a>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
