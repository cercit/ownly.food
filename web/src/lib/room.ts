/** Room codes: exactly 6 capital letters or numbers, no dash (for example TNR742). */
export const ROOM_CODE_RE = /^[A-Z0-9]{6}$/;

export type CodeCheck = { ok: true; code: string } | { ok: false; message: string };

/** Accepts "TNR742", "tnr742 " (tidied) and rejects dashed or wrong-length codes with a plain message. */
export function checkRoomCode(input: string): CodeCheck {
  const raw = (input ?? '').trim();
  if (/[-\s]/.test(raw)) return { ok: false, message: 'Room codes have no dash or spaces. Type just the 6 letters and numbers, like TNR742.' };
  const code = raw.toUpperCase();
  if (!ROOM_CODE_RE.test(code)) return { ok: false, message: 'A room code is exactly 6 letters or numbers, like TNR742.' };
  return { ok: true, code };
}

/** Share link: the site address + ?join=CODE. */
export function buildShareLink(code: string, origin: string, pathname = '/'): string {
  return `${origin}${pathname}?join=${code}`;
}

/** Reads ?join=CODE from a search string. Returns the tidied code, or null when absent or invalid. */
export function readJoinParam(search: string): string | null {
  const v = new URLSearchParams(search).get('join');
  if (v === null) return null;
  const c = checkRoomCode(v);
  return c.ok ? c.code : null;
}

export function whatsappLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
