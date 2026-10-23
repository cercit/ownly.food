import { useState } from 'react';
import { Banknote, Building2, CreditCard, QrCode, Smartphone } from 'lucide-react';
import { payMyShare } from '../api/ownly-api.ts';
import { DEMO_PAYMENT_NOTE } from '../lib/config.ts';
import { rupees } from '../lib/format.ts';
import type { PayMethod, PaymentMethodRow } from '../lib/types.ts';
import { Button, ErrorNote, Modal } from '../ui/kit.tsx';

const TABS: { key: PayMethod | 'qr'; label: string; icon: typeof Smartphone }[] = [
  { key: 'upi', label: 'UPI apps', icon: Smartphone }, { key: 'qr', label: 'QR', icon: QrCode },
  { key: 'card', label: 'Card', icon: CreditCard }, { key: 'netbanking', label: 'Netbanking', icon: Building2 },
  { key: 'cash', label: 'Paid the host in cash', icon: Banknote },
];

type Phase = 'choose' | 'failed' | 'paid';

/** Razorpay-style demo payment. Only a method type goes to the database. No card number, CVV or UPI PIN is ever asked for. */
export function PayModal({ groupId, amount, saved, onClose, onPaid }: { groupId: string; amount: number; saved: PaymentMethodRow[]; onClose: () => void; onPaid: () => void }) {
  const [tab, setTab] = useState<PayMethod | 'qr'>('upi');
  const [phase, setPhase] = useState<Phase>('choose');
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const method: PayMethod = tab === 'qr' ? 'upi' : tab;
  const mine = saved.filter(s => s.type === method);

  const succeed = async () => {
    setBusy(true); setError(null);
    try { const r = await payMyShare(groupId, method); setRef(r.reference); setPhase('paid'); onPaid(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Modal title={phase === 'paid' ? 'Payment successful' : 'Pay your share'} onClose={onClose}>
      <p className="text-sm bg-[#FFF1D9] text-[#855000] rounded-xl px-3 py-2 font-bold" data-testid="demo-note">{DEMO_PAYMENT_NOTE}</p>
      <p className="mt-4 text-3xl font-extrabold tabular-nums">{rupees(amount)}</p>

      {phase === 'paid' && <div className="mt-4">
        <p className="text-[#125F43] font-bold">Paid. Reference <span className="tabular-nums">{ref}</span></p>
        <div className="mt-5"><Button onClick={onClose}>Done</Button></div></div>}

      {phase === 'failed' && <div className="mt-4 space-y-4">
        <ErrorNote message="The payment failed. Your share is still Pending. Nothing was charged." />
        <div className="flex gap-3"><Button onClick={() => setPhase('choose')}>Retry</Button><Button variant="secondary" onClick={onClose}>Close</Button></div></div>}

      {phase === 'choose' && <>
        <div role="tablist" aria-label="Payment method" className="mt-4 flex flex-wrap gap-2">
          {TABS.map(t => { const I = t.icon; return (
            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-3.5 min-h-11 rounded-full text-sm font-bold border cursor-pointer ${tab === t.key ? 'bg-[#C40054] text-white border-[#C40054]' : 'bg-white border-[#F0D7E2] text-[#576177]'}`}><I className="size-4" aria-hidden />{t.label}</button>); })}
        </div>
        <div className="mt-4 rounded-2xl bg-[#FFF9FC] border border-[#F0D7E2] p-4 text-sm text-[#576177] min-h-24">
          {tab === 'upi' && <p>Pretend to approve this payment in your UPI app. You do not enter a PIN here.</p>}
          {tab === 'qr' && <p>Pretend to scan a QR code with any UPI app. No real code is shown in this demo.</p>}
          {tab === 'card' && <p>Pretend to pay with a card. No card number, expiry or CVV is asked for here.</p>}
          {tab === 'netbanking' && <p>Pretend to approve this in your bank's page. No login is asked for here.</p>}
          {tab === 'cash' && <p>Choose this if you handed the host cash, outside the app. It marks your share as Paid.</p>}
          {mine.length > 0 && tab !== 'cash' && tab !== 'qr' && <p className="mt-2">Saved: {mine.map(m => m.display_label).join(', ')}</p>}
        </div>
        {error && <div className="mt-4"><ErrorNote message={error} /></div>}
        <div className="mt-5 flex flex-wrap gap-3">
          <Button busy={busy} onClick={succeed}>Simulate success</Button>
          <Button variant="danger" disabled={busy} onClick={() => setPhase('failed')}>Simulate failure</Button>
        </div>
      </>}
    </Modal>
  );
}
