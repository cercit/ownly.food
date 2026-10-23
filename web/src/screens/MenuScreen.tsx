import { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { getMenu, listRestaurants } from '../api/ownly-api.ts';
import { rupees } from '../lib/format.ts';
import { hrefFor } from '../lib/router.ts';
import { Badge, Card, Empty, ErrorNote, Spinner, VegDot, useLoad } from '../ui/kit.tsx';

export function MenuScreen({ rid }: { rid: string }) {
  const rest = useLoad(() => listRestaurants('Chennai'), []);
  const menu = useLoad(() => getMenu(rid), [rid]);
  const restaurant = rest.data?.find(r => r.id === rid);
  const groups = useMemo(() => {
    const m = new Map<string, NonNullable<typeof menu.data>>();
    (menu.data ?? []).forEach(i => m.set(i.category, [...(m.get(i.category) ?? []), i]));
    return [...m.entries()];
  }, [menu.data]);

  if (rest.loading || menu.loading) return <Spinner label="Loading menu" />;
  const err = rest.error ?? menu.error;
  if (err) return <ErrorNote message={err} onRetry={() => { rest.reload(); menu.reload(); }} />;
  if (!restaurant) return <Empty title="Restaurant not found" action={<a href={hrefFor({ name: 'explore' })}>Back to restaurants</a>} />;

  return (
    <div>
      <a href={hrefFor({ name: 'explore' })} className="inline-flex items-center gap-1 text-sm font-bold text-[#C40054] mb-4"><ArrowLeft className="size-4" aria-hidden />All restaurants</a>
      <Card className="!p-0 overflow-hidden mb-6">
        <div className="sm:flex">
          <div className="sm:w-72 aspect-[16/9] sm:aspect-auto bg-[#FFE3ED]">{restaurant.image_url && <img src={restaurant.image_url} alt={restaurant.name} className="w-full h-full object-cover" />}</div>
          <div className="p-5 flex-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold">{restaurant.name}</h1>
            <p className="text-[#576177] mt-1">{restaurant.cuisine} · {restaurant.area}</p>
            {restaurant.veg_only && <div className="mt-2"><Badge tone="paid">Veg only</Badge></div>}
            <a href={hrefFor({ name: 'start', rid })} className="inline-flex mt-4 min-h-12 px-6 items-center rounded-full bg-[#C40054] text-white font-bold no-underline hover:bg-[#A80047]">Start a group order here</a>
          </div>
        </div>
      </Card>
      {groups.length === 0 && <Empty title="No dishes yet" />}
      {groups.map(([cat, items]) => (
        <section key={cat} className="mb-8">
          <h2 className="text-xl font-extrabold mb-3">{cat}</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {items.map(i => (
              <li key={i.id} className={`flex gap-3 bg-white border border-[#F0D7E2] rounded-2xl p-3 ${i.is_available ? '' : 'opacity-60'}`}>
                <div className="size-20 rounded-xl overflow-hidden bg-[#FFE3ED] shrink-0">{i.image_url && <img src={i.image_url} alt="" loading="lazy" className="w-full h-full object-cover" />}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><VegDot veg={i.is_veg} /><h3 className="font-bold leading-snug">{i.name}</h3></div>
                  <p className="font-extrabold mt-1 tabular-nums">{rupees(i.price)}</p>
                  {!i.is_available && <p className="text-xs font-bold text-[#A32234] mt-1">Not available right now</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
