import { useEffect, useState } from 'react';

export type Route =
  | { name: 'explore' }
  | { name: 'menu'; rid: string }
  | { name: 'start'; rid?: string }
  | { name: 'join'; code?: string }
  | { name: 'cart' | 'checkout' | 'confirmed' | 'pay' | 'track' | 'activity'; gid: string }
  | { name: 'orders' }
  | { name: 'profile' }
  | { name: 'signin'; next?: string };

const GROUP_SCREENS = ['cart', 'checkout', 'confirmed', 'pay', 'track', 'activity'] as const;

/** Parses "#/g/<id>/cart" style hashes. Unknown hashes go to Explore. */
export function parseHash(hash: string): Route {
  const [pathPart, query = ''] = hash.replace(/^#/, '').split('?');
  const seg = pathPart.split('/').filter(Boolean);
  switch (seg[0]) {
    case 'menu': return seg[1] ? { name: 'menu', rid: seg[1] } : { name: 'explore' };
    case 'start': return { name: 'start', rid: seg[1] };
    case 'join': return { name: 'join', code: seg[1] ? decodeURIComponent(seg[1]) : undefined };
    case 'g': {
      const screen = seg[2] as (typeof GROUP_SCREENS)[number];
      if (seg[1] && GROUP_SCREENS.includes(screen)) return { name: screen, gid: seg[1] };
      return seg[1] ? { name: 'cart', gid: seg[1] } : { name: 'explore' };
    }
    case 'orders': return { name: 'orders' };
    case 'profile': return { name: 'profile' };
    case 'signin': return { name: 'signin', next: new URLSearchParams(query).get('next') ?? undefined };
    default: return { name: 'explore' };
  }
}

export function hrefFor(r: Route): string {
  switch (r.name) {
    case 'explore': return '#/';
    case 'menu': return `#/menu/${r.rid}`;
    case 'start': return r.rid ? `#/start/${r.rid}` : '#/start';
    case 'join': return r.code ? `#/join/${encodeURIComponent(r.code)}` : '#/join';
    case 'orders': return '#/orders';
    case 'profile': return '#/profile';
    case 'signin': return r.next ? `#/signin?next=${encodeURIComponent(r.next)}` : '#/signin';
    default: return `#/g/${r.gid}/${r.name}`;
  }
}

export const navigate = (r: Route) => { window.location.hash = hrefFor(r); };
export const navigateHash = (hash: string) => { window.location.hash = hash; };

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => { setRoute(parseHash(window.location.hash)); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

/** Where a group order belongs, by status. */
export function screenForStatus(status: string): 'cart' | 'confirmed' | 'track' {
  if (status === 'placed') return 'confirmed';
  if (status === 'delivered') return 'track';
  return 'cart';
}
