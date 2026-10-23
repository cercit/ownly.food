import { describe, expect, it } from 'vitest';
import { maskBank, maskCard, maskUpi } from '../src/lib/mask.ts';
import { needsName } from '../src/lib/auth.tsx';

describe('masked payment labels', () => {
  it('masks a UPI id', () => expect(maskUpi('sameer@okaxis')).toEqual({ ok: true, label: 'sam•••@okaxis' }));
  it('rejects a bad UPI id', () => expect(maskUpi('nope').ok).toBe(false));
  it('keeps only the last 4 digits of a card', () => expect(maskCard('Visa', '4242')).toEqual({ ok: true, label: 'Visa •••• 4242' }));
  it('rejects a full card number', () => {
    expect(maskCard('Visa', '4242424242424242').ok).toBe(false);
    expect(maskCard('Visa', '42').ok).toBe(false);
  });
  it('rejects account numbers in the bank name', () => {
    expect(maskBank('State bank 123456789012').ok).toBe(false);
    expect(maskBank('State bank')).toEqual({ ok: true, label: 'State bank netbanking' });
  });
});

describe('first-time name step', () => {
  const p = (full_name: string | null) => ({ id: '1', email: 'priya@example.org', full_name, phone: null, default_address_id: null, consent_location_at: null });
  it('asks when the name is the email prefix or empty', () => {
    expect(needsName(p('priya'))).toBe(true);
    expect(needsName(p(null))).toBe(true);
  });
  it('does not ask once a name is set', () => expect(needsName(p('Priya Raman'))).toBe(false));
  it('does not ask when signed out', () => expect(needsName(null)).toBe(false));
});
