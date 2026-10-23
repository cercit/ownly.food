/** Saved payment methods show masked labels only. Full card numbers, CVVs and UPI PINs are never asked for or stored. */
export type MaskResult = { ok: true; label: string } | { ok: false; message: string };

export function maskUpi(id: string): MaskResult {
  const v = id.trim();
  const m = v.match(/^([A-Za-z0-9._-]{2,})@([A-Za-z0-9]{2,})$/);
  if (!m) return { ok: false, message: 'Enter a UPI ID like name@bank.' };
  return { ok: true, label: `${m[1].slice(0, 3)}•••@${m[2]}` };
}

export function maskCard(brand: string, last4: string): MaskResult {
  const d = last4.trim();
  if (!/^\d{4}$/.test(d)) return { ok: false, message: 'Enter only the last 4 digits of the card. Never the full number.' };
  return { ok: true, label: `${brand} •••• ${d}` };
}

export function maskBank(name: string): MaskResult {
  const v = name.trim();
  if (v.length < 2) return { ok: false, message: 'Enter the bank name.' };
  if (/\d{5,}/.test(v)) return { ok: false, message: 'Do not enter account or card numbers. Just the bank name.' };
  return { ok: true, label: `${v} netbanking` };
}
