export const rupees = (n: number | string | null | undefined): string =>
  '₹' + Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const splitRuleName = (r: 'itemised' | 'equal') =>
  r === 'equal' ? 'Split everything equally' : 'Pay for what you ordered';

export const labelName = (label: string, labelName?: string | null) =>
  labelName?.trim() || ({ home: 'Home', office: 'Office', friend: "Friend's place", other: 'Other' } as Record<string, string>)[label] || label;

export const timeOnly = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export const mmss = (secs: number) => {
  const s = Math.max(0, Math.floor(secs));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
