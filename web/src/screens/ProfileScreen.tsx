import { useState, type FormEvent } from 'react';
import { MapPin, Trash2 } from 'lucide-react';
import {
  addAddress, deleteAddress, deletePaymentMethod, getGps, listAddresses, listPaymentMethods, recordLocationConsent,
  savePaymentMethod, setDefaultAddress, signOut, updateProfile, type Gps,
} from '../api/ownly-api.ts';
import { useAuth } from '../lib/auth.tsx';
import { CHENNAI_AREAS } from '../lib/config.ts';
import { labelName } from '../lib/format.ts';
import { phoneError } from '../lib/phone.ts';
import { maskBank, maskCard, maskUpi, type MaskResult } from '../lib/mask.ts';
import { navigateHash } from '../lib/router.ts';
import type { Address, AddressLabel, PayMethod } from '../lib/types.ts';
import { Badge, Button, Card, ErrorNote, Field, Modal, Spinner, inputCls, useLoad, useToast } from '../ui/kit.tsx';

const mapEmbed = (lat: number, lng: number) => {
  const d = 0.004;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`;
};

export function ProfileScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const toast = useToast();
  const addrs = useLoad(listAddresses, []);
  const methods = useLoad(listPaymentMethods, []);
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      if (name.trim().length < 2) throw new Error('Enter your name.');
      const bad = phoneError(phone);
      if (bad) throw new Error(bad);
      await updateProfile({ full_name: name, phone }); await refreshProfile(); toast.show('Profile saved');
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold">Profile</h1>

      <Card>
        <h2 className="text-xl font-extrabold mb-4">You</h2>
        <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="Name"><input value={name} onChange={e => setName(e.target.value)} className={inputCls} /></Field>
          <Field label="Mobile number" hint="Required. 10 digits, not shown to your group."><input type="tel" inputMode="tel" autoComplete="tel-national" value={phone} onChange={e => setPhone(e.target.value)} className={`${inputCls} tabular-nums`} /></Field>
          <Field label="Email" hint="Your email is how you sign in. It cannot be changed here."><input value={user?.email ?? ''} readOnly className={`${inputCls} bg-[#FFF9FC]`} /></Field>
          <div className="sm:col-span-2 space-y-3">{error && <ErrorNote message={error} />}
            <div className="flex flex-wrap gap-3"><Button type="submit" busy={busy}>Save</Button>
              <Button type="button" variant="secondary" onClick={async () => { await signOut(); navigateHash('#/'); }}>Sign out</Button></div></div>
        </form>
      </Card>

      <AddressSection addrs={addrs} onChanged={() => { addrs.reload(); refreshProfile(); }} toast={toast.show} hasConsent={!!profile?.consent_location_at} onConsent={refreshProfile} />
      <MethodsSection methods={methods} toast={toast.show} />
      {toast.node}
    </div>
  );
}

function AddressSection({ addrs, onChanged, toast, hasConsent, onConsent }: {
  addrs: ReturnType<typeof useLoad<Address[]>>; onChanged: () => void; toast: (m: string) => void; hasConsent: boolean; onConsent: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [openMap, setOpenMap] = useState<string | null>(null);
  const [label, setLabel] = useState<AddressLabel>('home');
  const [lname, setLname] = useState('');
  const [line1, setLine1] = useState(''); const [line2, setLine2] = useState(''); const [landmark, setLandmark] = useState('');
  const [area, setArea] = useState<string>(CHENNAI_AREAS[0]); const [pin, setPin] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [gps, setGps] = useState<Gps | null>(null);
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);

  const reset = () => { setOpen(false); setLname(''); setLine1(''); setLine2(''); setLandmark(''); setPin(''); setGps(null); setIsDefault(false); setError(null); };

  const locate = async () => {
    setAsk(false); setError(null);
    try { if (!hasConsent) { await recordLocationConsent(); onConsent(); } setGps(await getGps()); }
    catch (e) { setError((e as Error).message); }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      if (!line1.trim()) throw new Error('Enter address line 1.');
      if (!/^\d{6}$/.test(pin.trim())) throw new Error('The pincode is 6 digits.');
      await addAddress({ label, label_name: lname || null, line1: line1.trim(), line2: line2.trim() || null, landmark: landmark.trim() || null, area, city: 'Chennai', pincode: pin.trim(), gps, is_default: isDefault || (addrs.data?.length ?? 0) === 0 });
      toast('Address saved'); reset(); onChanged();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-extrabold">Saved addresses</h2>
        {!open && <Button variant="secondary" onClick={() => setOpen(true)}>Add address</Button>}</div>
      {addrs.loading && <Spinner />}
      {addrs.error && <ErrorNote message={addrs.error} onRetry={addrs.reload} />}
      {!addrs.loading && !addrs.error && addrs.data?.length === 0 && !open && <p className="text-[#576177]">No saved addresses yet. You need one to start a group order.</p>}
      <ul className="space-y-3">
        {addrs.data?.map(a => (
          <li key={a.id} className="border border-[#F0D7E2] rounded-2xl p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><p className="font-bold">{labelName(a.label, a.label_name)} {a.is_default && <Badge tone="pink">Default</Badge>}</p>
                <p className="text-sm text-[#576177] mt-1">{[a.line1, a.line2, a.landmark && `Near ${a.landmark}`, a.area, `${a.city} ${a.pincode}`].filter(Boolean).join(', ')}</p></div>
              <div className="flex gap-2">
                {!a.is_default && <button className="text-sm font-bold text-[#C40054] min-h-11 px-2 cursor-pointer" onClick={async () => { try { await setDefaultAddress(a.id); toast('Default address set'); onChanged(); } catch (e) { toast((e as Error).message); } }}>Make default</button>}
                <button aria-label={`Delete ${labelName(a.label, a.label_name)}`} className="size-11 grid place-items-center rounded-full hover:bg-[#FFE7E9] text-[#A32234] cursor-pointer"
                  onClick={async () => { try { await deleteAddress(a.id); toast('Address deleted'); onChanged(); } catch (e) { toast((e as Error).message); } }}><Trash2 className="size-5" /></button>
              </div>
            </div>
            {a.lat != null && a.lng != null && <div className="mt-2">
              <button className="text-sm font-bold text-[#C40054] inline-flex items-center gap-1 cursor-pointer" onClick={() => setOpenMap(openMap === a.id ? null : a.id)}><MapPin className="size-4" aria-hidden />{openMap === a.id ? 'Hide map pin' : 'Show map pin'}</button>
              {openMap === a.id && <iframe title={`Map pin for ${labelName(a.label, a.label_name)}`} src={mapEmbed(a.lat, a.lng)} className="w-full h-48 rounded-2xl border border-[#F0D7E2] mt-2" loading="lazy" />}
            </div>}
          </li>))}
      </ul>

      {open && (
        <form onSubmit={save} className="mt-5 grid gap-4 sm:grid-cols-2 border-t border-[#F0D7E2] pt-5" noValidate>
          <Field label="Label"><select value={label} onChange={e => setLabel(e.target.value as AddressLabel)} className={inputCls}>
            <option value="home">Home</option><option value="office">Office</option><option value="friend">Friend's place</option><option value="other">Other</option></select></Field>
          <Field label="Name for this place (optional)" hint="For example: Rahul's flat"><input value={lname} onChange={e => setLname(e.target.value)} className={inputCls} /></Field>
          <div className="sm:col-span-2"><Field label="Address line 1"><input value={line1} onChange={e => setLine1(e.target.value)} className={inputCls} autoComplete="address-line1" /></Field></div>
          <Field label="Address line 2 (optional)"><input value={line2} onChange={e => setLine2(e.target.value)} className={inputCls} /></Field>
          <Field label="Landmark (optional)"><input value={landmark} onChange={e => setLandmark(e.target.value)} className={inputCls} /></Field>
          <Field label="Area"><select value={area} onChange={e => setArea(e.target.value)} className={inputCls}>{CHENNAI_AREAS.map(a => <option key={a}>{a}</option>)}</select></Field>
          <Field label="City"><input value="Chennai" readOnly className={`${inputCls} bg-[#FFF9FC]`} /></Field>
          <Field label="Pincode"><input inputMode="numeric" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} className={`${inputCls} tabular-nums`} autoComplete="postal-code" /></Field>
          <label className="flex items-center gap-2 min-h-12 font-bold text-sm cursor-pointer"><input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} className="size-5 accent-[#C40054]" />Make this my default address</label>
          <div className="sm:col-span-2">
            {gps ? <div><p className="text-sm font-bold text-[#125F43]">Map pin saved: {gps.lat}, {gps.lng} (about {gps.accuracy} m)</p>
              <iframe title="Map pin" src={mapEmbed(gps.lat, gps.lng)} className="w-full h-44 rounded-2xl border border-[#F0D7E2] mt-2" /></div>
              : <Button type="button" variant="secondary" onClick={() => (hasConsent ? locate() : setAsk(true))}><MapPin className="size-4" aria-hidden />Add a map pin from my location</Button>}
          </div>
          <div className="sm:col-span-2 space-y-3">{error && <ErrorNote message={error} />}
            <div className="flex gap-3"><Button type="submit" busy={busy}>Save address</Button><Button type="button" variant="secondary" onClick={reset}>Cancel</Button></div></div>
        </form>)}

      {ask && <Modal title="Use your location?" onClose={() => setAsk(false)}>
        <p className="text-[#576177]">We use your location only to save a map pin with this address. Your browser will ask you to allow it. We store when you agreed, and you can still type the address by hand.</p>
        <div className="mt-5 flex gap-3"><Button onClick={locate}>Allow</Button><Button variant="secondary" onClick={() => setAsk(false)}>Not now</Button></div>
      </Modal>}
    </Card>
  );
}

function MethodsSection({ methods, toast }: { methods: ReturnType<typeof useLoad<import('../lib/types.ts').PaymentMethodRow[]>>; toast: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<Exclude<PayMethod, 'cash'>>('upi');
  const [upi, setUpi] = useState(''); const [brand, setBrand] = useState('Visa'); const [last4, setLast4] = useState(''); const [bank, setBank] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);

  const save = async (e: FormEvent) => {
    e.preventDefault(); setError(null);
    const m: MaskResult = type === 'upi' ? maskUpi(upi) : type === 'card' ? maskCard(brand, last4) : maskBank(bank);
    if (!m.ok) return setError(m.message);
    setBusy(true);
    try { await savePaymentMethod(type, m.label, (methods.data?.length ?? 0) === 0); toast('Saved'); setOpen(false); setUpi(''); setLast4(''); setBank(''); methods.reload(); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-2"><h2 className="text-xl font-extrabold">Saved payment methods</h2>{!open && <Button variant="secondary" onClick={() => setOpen(true)}>Add</Button>}</div>
      <p className="text-sm text-[#576177] mb-4">Only a masked label is saved. We never ask for or store full card numbers, CVVs or UPI PINs. Payments here are a demo.</p>
      {methods.loading && <Spinner />}
      {methods.error && <ErrorNote message={methods.error} onRetry={methods.reload} />}
      {!methods.loading && !methods.error && methods.data?.length === 0 && !open && <p className="text-[#576177]">Nothing saved yet.</p>}
      <ul className="space-y-2">{methods.data?.map(m => (
        <li key={m.id} className="flex items-center justify-between border border-[#F0D7E2] rounded-2xl px-4 py-3">
          <span className="font-bold">{m.display_label} <span className="text-xs font-bold text-[#576177] uppercase ml-1">{m.type}</span></span>
          <button aria-label={`Remove ${m.display_label}`} className="size-11 grid place-items-center rounded-full hover:bg-[#FFE7E9] text-[#A32234] cursor-pointer"
            onClick={async () => { try { await deletePaymentMethod(m.id); methods.reload(); } catch (e) { toast((e as Error).message); } }}><Trash2 className="size-5" /></button></li>))}</ul>
      {open && <form onSubmit={save} className="mt-4 space-y-4 border-t border-[#F0D7E2] pt-4" noValidate>
        <Field label="Type"><select value={type} onChange={e => setType(e.target.value as typeof type)} className={inputCls}><option value="upi">UPI</option><option value="card">Card</option><option value="netbanking">Netbanking</option></select></Field>
        {type === 'upi' && <Field label="UPI ID" hint="Saved as a masked label, like sam•••@okaxis"><input value={upi} onChange={e => setUpi(e.target.value)} className={inputCls} autoComplete="off" /></Field>}
        {type === 'card' && <div className="grid grid-cols-2 gap-4">
          <Field label="Card"><select value={brand} onChange={e => setBrand(e.target.value)} className={inputCls}><option>Visa</option><option>Mastercard</option><option>RuPay</option></select></Field>
          <Field label="Last 4 digits only"><input inputMode="numeric" maxLength={4} value={last4} onChange={e => setLast4(e.target.value.replace(/\D/g, ''))} className={`${inputCls} tabular-nums`} autoComplete="off" /></Field></div>}
        {type === 'netbanking' && <Field label="Bank name"><input value={bank} onChange={e => setBank(e.target.value)} className={inputCls} autoComplete="off" /></Field>}
        {error && <ErrorNote message={error} />}
        <div className="flex gap-3"><Button type="submit" busy={busy}>Save</Button><Button type="button" variant="secondary" onClick={() => { setOpen(false); setError(null); }}>Cancel</Button></div>
      </form>}
    </Card>
  );
}
