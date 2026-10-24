import { describe, expect, it } from 'vitest';
import { normalisePhone, phoneError } from '../src/lib/phone.ts';

describe('mobile number check (pattern only, no OTP)', () => {
  it('accepts 10-digit Indian mobiles in common formats', () => {
    ['9876543210', '98765 43210', '+91 98765 43210', '098765-43210', '6123456789'].forEach(p => expect(phoneError(p)).toBeNull());
    expect(normalisePhone('+91 98765 43210')).toBe('9876543210');
  });
  it('refuses empty, short and numbers that cannot be Indian mobiles', () => {
    expect(phoneError('')).toMatch(/Enter your mobile/);
    expect(phoneError('12345')).toMatch(/10-digit/);
    expect(phoneError('5876543210')).toMatch(/starts with 6, 7, 8 or 9/);
  });
});
