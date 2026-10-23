import { useEffect, useState, type FormEvent } from 'react';
import { joinGroup, previewGroup } from '../api/ownly-api.ts';
import { useAuth } from '../lib/auth.tsx';
import { MAX_MEMBERS } from '../lib/config.ts';
import { splitRuleName, timeOnly } from '../lib/format.ts';
import { checkRoomCode } from '../lib/room.ts';
import { hrefFor, navigate, navigateHash, screenForStatus } from '../lib/router.ts';
import type { Group, GroupPreview } from '../lib/types.ts';
import { Badge, Button, Card, ErrorNote, Field, Spinner, inputCls } from '../ui/kit.tsx';

export function JoinScreen({ code: initial }: { code?: string }) {
  const { user, loading: authLoading } = useAuth();
  const [input, setInput] = useState(initial ?? '');
  const [code, setCode] = useState<string | null>(null);
  const [preview, setPreview] = useState<GroupPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = async (raw: string) => {
    setError(null); setPreview(null);
    const c = checkRoomCode(raw);
    if (!c.ok) { setCode(null); return setError(c.message); }
    setCode(c.code);
    if (!user) return;
    setBusy(true);
    try {
      const g = await previewGroup(c.code);
      if (g.is_member) return navigate({ name: screenForStatus((g as Group).status), gid: (g as Group).id });
      setPreview(g as GroupPreview);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  useEffect(() => { if (initial && !authLoading) { setInput(initial); lookup(initial); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [initial, authLoading, user?.id]);

  const submit = (e: FormEvent) => { e.preventDefault(); lookup(input); };
  const join = async () => {
    if (!code) return; setJoining(true); setError(null);
    try { const r = await joinGroup(code); navigate({ name: 'cart', gid: r.group_order_id }); }
    catch (e) { setError((e as Error).message); } finally { setJoining(false); }
  };

  const full = preview ? preview.members >= MAX_MEMBERS : false;
  const closed = preview ? preview.status !== 'open' || new Date(preview.cut_off_at).getTime() <= Date.now() : false;

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <h1 className="text-3xl font-extrabold">Join a group order</h1>
      <Card>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Room code" hint="6 letters or numbers, like TNR742. Or open the link your friend sent you.">
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="TNR742" autoCapitalize="characters" autoComplete="off" spellCheck={false}
              className={`${inputCls} text-xl tracking-[0.2em] uppercase`} aria-label="Room code" />
          </Field>
          <Button type="submit" busy={busy} variant="secondary" className="w-full">Find this group</Button>
        </form>
      </Card>

      {error && <ErrorNote message={error} />}
      {authLoading && <Spinner />}

      {code && !authLoading && !user && (
        <Card className="text-center">
          <p className="font-extrabold text-lg">Sign in to see and join group {code}</p>
          <p className="text-[#576177] mt-1">We email you a 6-digit code. No password.</p>
          <div className="mt-4"><a href={hrefFor({ name: 'signin', next: `#/join/${code}` })} className="inline-flex min-h-12 px-6 items-center rounded-full bg-[#C40054] text-white font-bold no-underline">Sign in with email</a></div>
        </Card>)}

      {preview && (
        <Card className="!p-0 overflow-hidden">
          <div className="aspect-[16/7] bg-[#FFE3ED]">{preview.image_url && <img src={preview.image_url} alt="" className="w-full h-full object-cover" />}</div>
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2 mb-2"><Badge tone="pink">Room {preview.share_code}</Badge>{full && <Badge tone="failed">Full</Badge>}{closed && !full && <Badge tone="pending">Closed</Badge>}</div>
            <h2 className="text-2xl font-extrabold">{preview.restaurant}</h2>
            <p className="text-[#576177]">{preview.area}</p>
            <dl className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div><dt className="text-[#576177]">Host</dt><dd className="font-bold">{preview.host}</dd></div>
              <div><dt className="text-[#576177]">People</dt><dd className="font-bold tabular-nums">{preview.members} of {MAX_MEMBERS}</dd></div>
              <div><dt className="text-[#576177]">Cut-off</dt><dd className="font-bold">{timeOnly(preview.cut_off_at)}</dd></div>
              <div><dt className="text-[#576177]">Split rule</dt><dd className="font-bold">{splitRuleName(preview.split_rule)}</dd></div>
            </dl>
            {full && <div className="mt-4"><ErrorNote message={`This group is full (${MAX_MEMBERS} people).`} /></div>}
            {closed && !full && <div className="mt-4"><ErrorNote message="This group order is closed. Ask the host for a new link." /></div>}
            <div className="mt-5 flex gap-3">
              <Button onClick={join} busy={joining} disabled={full || closed}>Join this group</Button>
              <Button variant="secondary" onClick={() => navigateHash('#/')}>Not now</Button>
            </div>
          </div>
        </Card>)}
    </div>
  );
}
