// Phone: a 10-digit Indian mobile starting with 6, 7, 8 or 9. Checked by pattern only (no OTP).
// The database enforces the same pattern (profiles_phone_check).
export const PHONE_PATTERN = /^[6-9][0-9]{9}$/;

/** Keeps the last 10 digits, so "+91 98765 43210" and "098765-43210" both become "9876543210". */
export const normalisePhone = (raw: string): string => raw.replace(/\D/g, '').slice(-10);

/** Returns a message to show, or null when the number is fine. */
export const phoneError = (raw: string): string | null => {
  const n = normalisePhone(raw);
  if (!n) return 'Enter your mobile number.';
  if (n.length !== 10) return 'Enter a 10-digit mobile number.';
  if (!PHONE_PATTERN.test(n)) return 'An Indian mobile number starts with 6, 7, 8 or 9.';
  return null;
};
