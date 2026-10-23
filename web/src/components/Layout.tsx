import type { ReactNode } from 'react';
import { Compass, Hash, Receipt, UsersRound, UserRound } from 'lucide-react';
import { ConceptStrip } from './ConceptStrip.tsx';
import { useAuth } from '../lib/auth.tsx';
import { hrefFor, type Route } from '../lib/router.ts';
import { Button, Card, Spinner } from '../ui/kit.tsx';

const NAV = [
  { key: 'explore', label: 'Explore', icon: Compass, route: { name: 'explore' } as Route, match: ['explore', 'menu'] },
  { key: 'start', label: 'Start group order', short: 'Start', icon: UsersRound, route: { name: 'start' } as Route, match: ['start', 'cart', 'checkout', 'confirmed', 'pay', 'track', 'activity'] },
  { key: 'join', label: 'Join', icon: Hash, route: { name: 'join' } as Route, match: ['join'] },
  { key: 'orders', label: 'Orders', icon: Receipt, route: { name: 'orders' } as Route, match: ['orders'] },
  { key: 'profile', label: 'Profile', icon: UserRound, route: { name: 'profile' } as Route, match: ['profile', 'signin'] },
];

export function Layout({ route, children }: { route: Route; children: ReactNode }) {
  const { user, profile } = useAuth();
  const initial = (profile?.full_name || user?.email || '?').charAt(0).toUpperCase();
  return (
    <div className="min-h-screen flex flex-col bg-[#FFF9FC] text-[#111D35]">
      <ConceptStrip />
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#F0D7E2]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <a href={hrefFor({ name: 'explore' })} className="flex items-center gap-3 no-underline">
            <img src="/ownly-logo.jpg" alt="Ownly" className="size-10 rounded-2xl border border-[#F0D7E2] object-cover" />
            <span className="leading-tight">
              <span className="block text-lg font-black tracking-tight"><span className="text-[#C40054]">ownly</span> together</span>
              <span className="block text-[11px] font-bold text-[#576177]">Chennai</span>
            </span>
          </a>
          <nav aria-label="Main" className="hidden lg:flex items-center gap-1 bg-[#FFF9FC] p-1.5 rounded-full border border-[#F0D7E2]">
            {NAV.map(n => (
              <a key={n.key} href={hrefFor(n.route)} aria-current={n.match.includes(route.name) ? 'page' : undefined}
                className={`px-4 py-2 rounded-full text-sm font-bold no-underline ${n.match.includes(route.name) ? 'bg-[#C40054] text-white' : 'text-[#576177] hover:bg-white hover:text-[#111D35]'}`}>{n.label}</a>
            ))}
          </nav>
          {user
            ? <a href={hrefFor({ name: 'profile' })} className="flex items-center gap-2 no-underline text-[#111D35]" aria-label="Your profile">
                <span className="size-9 rounded-full bg-[#111D35] text-white grid place-items-center text-sm font-bold">{initial}</span>
                <span className="hidden sm:inline text-sm font-bold max-w-[120px] truncate">{profile?.full_name}</span></a>
            : <a href={hrefFor({ name: 'signin' })} className="px-4 py-2 rounded-full bg-[#C40054] text-white text-sm font-bold no-underline">Sign in</a>}
        </div>
      </header>
      <main className="flex-1 w-full max-w-[1240px] mx-auto px-4 sm:px-6 py-6 pb-28 lg:pb-10">{children}</main>
      <nav aria-label="Main" className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#F0D7E2] pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 h-16">
          {NAV.map(n => {
            const on = n.match.includes(route.name); const Icon = n.icon;
            return <a key={n.key} href={hrefFor(n.route)} aria-current={on ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold no-underline ${on ? 'text-[#C40054]' : 'text-[#576177]'}`}>
              <Icon className="size-6" aria-hidden />{n.short ?? n.label}</a>;
          })}
        </div>
      </nav>
    </div>
  );
}

/** Wraps a screen that needs a signed-in person. */
export function RequireSignIn({ children, why = 'Sign in to continue.' }: { children: ReactNode; why?: string }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return (
    <Card className="max-w-md mx-auto text-center">
      <h1 className="text-2xl font-extrabold">Sign in first</h1>
      <p className="text-[#576177] mt-2">{why} We email you a 6-digit code. No password.</p>
      <div className="mt-5 flex justify-center">
        <a href={hrefFor({ name: 'signin', next: window.location.hash || '#/' })} className="no-underline"><Button>Sign in with email</Button></a>
      </div>
    </Card>
  );
  return <>{children}</>;
}
