import { describe, expect, it } from 'vitest';
import { buildShareLink, checkRoomCode, readJoinParam } from '../src/lib/room.ts';

describe('room code', () => {
  it('accepts TNR742', () => expect(checkRoomCode('TNR742')).toEqual({ ok: true, code: 'TNR742' }));
  it('tidies lowercase and outer spaces', () => expect(checkRoomCode(' tnr742 ')).toEqual({ ok: true, code: 'TNR742' }));
  it('rejects a dashed code with a clear message', () => {
    const r = checkRoomCode('TNR-742');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/no dash/i);
  });
  it('rejects the wrong length', () => {
    expect(checkRoomCode('TNR74').ok).toBe(false);
    expect(checkRoomCode('TNR7421').ok).toBe(false);
    expect(checkRoomCode('').ok).toBe(false);
  });
  it('rejects symbols', () => expect(checkRoomCode('TNR74!').ok).toBe(false));
});

describe('share link', () => {
  it('is the site address plus ?join=CODE', () => {
    expect(buildShareLink('TNR742', 'https://example.org', '/')).toBe('https://example.org/?join=TNR742');
    expect(buildShareLink('TNR742', 'https://example.org', '/app/')).toBe('https://example.org/app/?join=TNR742');
  });
  it('reads ?join= back', () => {
    expect(readJoinParam('?join=TNR742')).toBe('TNR742');
    expect(readJoinParam('?x=1&join=tnr742')).toBe('TNR742');
  });
  it('returns null when missing or invalid', () => {
    expect(readJoinParam('')).toBeNull();
    expect(readJoinParam('?join=TNR-742')).toBeNull();
    expect(readJoinParam('?join=ABC')).toBeNull();
  });
});
