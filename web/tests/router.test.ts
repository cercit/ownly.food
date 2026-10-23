import { describe, expect, it } from 'vitest';
import { hrefFor, parseHash, screenForStatus } from '../src/lib/router.ts';

describe('router', () => {
  it('round-trips group screens', () => {
    for (const name of ['cart', 'checkout', 'confirmed', 'pay', 'track', 'activity'] as const) {
      expect(parseHash(hrefFor({ name, gid: 'abc' }))).toEqual({ name, gid: 'abc' });
    }
  });
  it('reads join, menu and start', () => {
    expect(parseHash('#/join/TNR742')).toEqual({ name: 'join', code: 'TNR742' });
    expect(parseHash('#/menu/r1')).toEqual({ name: 'menu', rid: 'r1' });
    expect(parseHash('#/start/r1')).toEqual({ name: 'start', rid: 'r1' });
  });
  it('sends unknown hashes to explore', () => expect(parseHash('#/nope')).toEqual({ name: 'explore' }));
  it('keeps the sign-in return address', () => {
    expect(parseHash(hrefFor({ name: 'signin', next: '#/join/TNR742' }))).toEqual({ name: 'signin', next: '#/join/TNR742' });
  });
  it('picks the screen by status', () => {
    expect(screenForStatus('open')).toBe('cart');
    expect(screenForStatus('placed')).toBe('confirmed');
    expect(screenForStatus('delivered')).toBe('track');
  });
});
