import { useState, type FormEvent } from 'react';
import { getProfile, signOut, sendCode, updateProfile, verifyCode } from '../api/ownly-api.ts';
import { needsDetails, needsName, useAuth } from '../lib/auth.tsx';
import { phoneError } from '../lib/phone.ts';
import { navigateHash } from '../lib/router.ts';
import { Button, Card, ErrorNote, Field, inputCls } from '../ui/kit.tsx';

type Step = 'email' | 'code' | 'name';

export function SignInScreen({ next }: { next?: string }) {
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState(profile && !needsName(profile) ? profile.full_name ?? '' : '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentNote, setSentNote] = useState<string | null>(null);
  const done = () => navigateHash(next || '#/');

  const wrap = (fn: () => Promise<void>) => async (e?: FormEvent) => {
    e?.preventDefault(); setBusy(true); setError(null);
    try { await fn(); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  const send = wrap(async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error('Enter a valid email address.');
    await sendCode(email);
    setSentNote(`We sent a 6-digit code to ${email.trim()}.`); setCode(''); setStep('code');
  });
  const verify = wrap(async () => {
    if (!/^\d{6}$/.test(code.trim())) throw new Error('The code is 6 digits.');
    await verifyCode(email, code);
    const p = await getProfile();
    await refreshProfile();
    if (needsDetails(p)) { if (p && !needsName(p)) setName(p.full_name ?? ''); setStep('name'); } else done();
  });
  const saveName = wrap(async () => {
    if (name.trim().length < 2) throw new Error('Enter your name so the group can see who you are.');
    const bad = phoneError(phone);
    if (bad) throw new Error(bad);
    await updateProfile({ full_name: name, phone });
    await refreshProfile();
    done();
  });

  // Already signed in (for example returned to this page): offer to continue.
  const showName = step === 'name' || (!!user && needsDetails(profile) && step === 'email');
  if (user && !showName) {
    return (
      <Card className="max-w-md mx-auto text-center">
        <h1 className="text-2xl font-extrabold">You are signed in</h1>
        <p className="text-[#576177] mt-2">{profile?.full_name} · {user.email}</p>
        <div className="mt-5 flex flex-col gap-3">
          <Button onClick={done}>Continue</Button>
          <Button variant="secondary" onClick={async () => { await signOut(); }}>Sign out</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <h1 className="text-2xl sm:text-3xl font-extrabold">{showName ? 'Your name and mobile' : 'Sign in to Ownly Together'}</h1>
      {step === 'email' && !showName && <>
        <p className="text-[#576177] mt-2">Enter your email. We send you a 6-digit code. No password, and new people sign up the same way.</p>
        <form onSubmit={send} className="mt-5 space-y-4" noValidate>
          <Field label="Email"><input type="email" inputMode="email" autoComplete="email" autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls} /></Field>
          {error && <ErrorNote message={error} />}
          <Button type="submit" busy={busy} className="w-full">Send me a code</Button>
        </form></>}
      {step === 'code' && <>
        <p className="text-[#576177] mt-2">{sentNote} It may take a minute. Check spam too.</p>
        <form onSubmit={verify} className="mt-5 space-y-4" noValidate>
          <Field label="6-digit code"><input inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="123456" className={`${inputCls} text-2xl tracking-[0.4em] text-center tabular-nums`} /></Field>
          {error && <ErrorNote message={error} />}
          <Button type="submit" busy={busy} className="w-full">Verify and continue</Button>
          <div className="flex justify-between text-sm font-bold">
            <button type="button" onClick={() => { setStep('email'); setError(null); }} className="text-[#C40054] cursor-pointer">Use a different email</button>
            <button type="button" onClick={() => send()} className="text-[#C40054] cursor-pointer">Send a new code</button>
          </div>
        </form></>}
      {showName && <>
        <p className="text-[#576177] mt-2">Your group sees your name next to your dishes. Your mobile number is not shown to anyone.</p>
        <form onSubmit={saveName} className="mt-5 space-y-4" noValidate>
          <Field label="Your name"><input autoComplete="name" autoFocus value={name} onChange={e => setName(e.target.value)} className={inputCls} /></Field>
          <Field label="Mobile number" hint="10 digits, for example 98765 43210"><input type="tel" inputMode="tel" autoComplete="tel-national" value={phone} onChange={e => setPhone(e.target.value)} placeholder="98765 43210" className={`${inputCls} tabular-nums`} /></Field>
          {error && <ErrorNote message={error} />}
          <Button type="submit" busy={busy} className="w-full">Save and continue</Button>
        </form></>}
    </Card>
  );
}
