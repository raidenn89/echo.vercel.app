import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Input } from '@project/components/ui/input';
import { Textarea } from '@project/components/ui/textarea';
import { Button } from '@project/components/ui/button';
import { toast } from 'sonner';
import { logout } from 'zitejs/auth';
import { profile, type ProfileOutputType } from 'zitejs/api';
import { applyTheme } from '../lib/util';
import { WALLPAPERS, getWallpaper } from '../lib/wallpapers';
import { getReminders, cancelReminder } from '../lib/reminders';
import type { Loc } from '../lib/useLocation';
import { Bell, Brush, Check, CircleUserRound, Compass, LogOut, MapPin, Moon, Palette, Save, Sun, Sparkles } from 'lucide-react';
import Logo from './Logo';

type Props = { open: boolean; onOpenChange: (o: boolean) => void; data: ProfileOutputType | null; onSaved: (p: ProfileOutputType) => void; loc: Loc; requestLoc: () => void };

function Section({ icon: Icon, title, subtitle, children }: { icon: React.ElementType; title: string; subtitle?: string; children: React.ReactNode }) {
  return <section className="rounded-[22px] border border-white/[.08] bg-white/[.025] p-4 sm:p-5"><div className="mb-4 flex items-start gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.055]"><Icon className="h-4 w-4 text-white/75" /></div><div><h3 className="text-sm font-semibold">{title}</h3>{subtitle && <p className="mt-1 text-xs leading-5 text-muted-foreground">{subtitle}</p>}</div></div>{children}</section>;
}

export default function SettingsDialog({ open, onOpenChange, data, onSaved, loc, requestLoc }: Props) {
  const [f, setF] = useState<ProfileOutputType | null>(data);
  const [theme, setTheme] = useState(localStorage.getItem('echo-theme') || 'dark');
  const [saving, setSaving] = useState(false);
  const [wall, setWall] = useState(getWallpaper);
  const [rems, setRems] = useState(getReminders);
  useEffect(() => setRems(getReminders()), [open]);
  useEffect(() => setF(data), [data, open]);
  const pickWall = (id: string) => { setWall(id); localStorage.setItem('echo-wall', id); dispatchEvent(new Event('echo-wall')); };
  if (!f) return null;
  const save = async () => {
    setSaving(true);
    try { onSaved(await profile({ update: f })); toast.success('Your settings are saved'); onOpenChange(false); }
    catch { toast.error('Could not save settings'); }
    finally { setSaving(false); }
  };
  const row = (label: string, k: keyof ProfileOutputType, ph: string, long = false) => (
    <label className="block min-w-0 space-y-1.5"><span className="text-xs font-medium text-muted-foreground">{label}</span>
      {long ? <Textarea rows={3} value={String(f[k] ?? '')} placeholder={ph} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="resize-y rounded-xl border-white/10 bg-white/[.035] focus-visible:ring-white/20" />
        : <Input value={String(f[k] ?? '')} placeholder={ph} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="h-11 rounded-xl border-white/10 bg-white/[.035] focus-visible:ring-white/20" />}
    </label>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="m-sheet glass scroll-y max-h-[92dvh] overflow-y-auto rounded-[28px] border-white/10 bg-[#090909]/95 p-4 text-white shadow-[0_30px_100px_-30px_rgba(0,0,0,.9)] backdrop-blur-2xl sm:max-w-2xl sm:p-6">
        <DialogHeader className="border-b border-white/[.08] pb-5 text-left">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.22em] text-white/40"><Logo className="h-5 w-5" /> Echo workspace</div>
          <DialogTitle className="text-2xl font-semibold tracking-tight">Settings<span className="text-white/35">.</span></DialogTitle>
          <p className="mt-1 text-sm text-white/45">Shape your workspace, appearance and how Echo works with you.</p>
        </DialogHeader>
        <div className="space-y-3.5 py-4">
          <Section icon={Palette} title="Appearance" subtitle="Choose the look and atmosphere of your workspace.">
            <div className="grid grid-cols-3 gap-2">
              {([{id:'dark',label:'Dark',Icon:Moon},{id:'light',label:'Light',Icon:Sun},{id:'system',label:'System',Icon:Brush}] as const).map(({id,label,Icon}) => <button key={id} onClick={() => { setTheme(id); applyTheme(id); }} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-medium transition ${theme === id ? 'border-white/35 bg-white text-black' : 'border-white/10 bg-white/[.035] text-white/55 hover:bg-white/[.07]'}`}><Icon className="h-4 w-4" />{label}{theme === id && <Check className="h-3.5 w-3.5" />}</button>)}
            </div>
            <div className="mt-5"><div className="mb-2 text-xs font-medium text-white/65">Workspace backgrounds</div><div className="grid grid-cols-4 gap-2 sm:grid-cols-6">{WALLPAPERS.map((w) => <button key={w.id} aria-label={w.label} onClick={() => pickWall(w.id)} className={`group relative aspect-[4/5] overflow-hidden rounded-xl border-2 transition ${wall === w.id ? 'border-white shadow-[0_0_0_2px_rgba(255,255,255,.12)]' : 'border-transparent hover:border-white/25'}`}><div className="absolute inset-0" style={{background:w.css}}/><div className="absolute inset-0 bg-black/10"/><span className="absolute inset-x-0 bottom-2 truncate px-1 text-center text-[9px] font-medium text-white drop-shadow">{w.label}</span>{wall === w.id && <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-white text-black"><Check className="h-3 w-3"/></span>}</button>)}</div></div>
          </Section>
          <Section icon={Sparkles} title="Image Studio" subtitle="Separate image engines for Free and Echo Pro.">
            <div className="rounded-2xl border border-white/[.09] bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,.07),transparent_65%),#090909] p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[.12] bg-white/[.06]"><Sparkles className="h-4 w-4 text-white/85"/></div>
                <div className="min-w-0 flex-1"><div className="text-sm font-semibold">Free · Cloudflare FLUX Schnell / Pro · FLUX.2 Dev</div><div className="mt-0.5 text-[11px] text-white/40">Cloudflare Worker with Pollinations Pro fallback</div></div>
                <span className="rounded-full border border-white/10 bg-white/[.05] px-2.5 py-1 text-[9px] font-semibold tracking-wider text-white/55">SERVER API</span>
              </div>
              <p className="mt-3 text-xs leading-5 text-white/50">Free uses Cloudflare FLUX Schnell for fast standard images. Echo Pro uses FLUX.2 Dev for higher-detail creation and automatically falls back to Pollinations Flux if the primary provider fails. Provider keys remain server-side.</p>
              <div className="mt-3 rounded-xl border border-white/[.07] bg-white/[.035] p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-white/55">Private provider credentials</div>
                <p className="mt-1.5 text-xs leading-5 text-white/45">Image provider credentials are stored as Worker secrets and are never sent to the browser.</p>
              </div>
            </div>
          </Section>
          <Section icon={CircleUserRound} title="Profile" subtitle="The details Echo uses to personalise conversations.">
            <div className="grid gap-3 sm:grid-cols-2">{row('Display name','displayName','Your name')}{row('Home city','homeCity','Dubai')}</div>
            <div className="mt-3 space-y-3">{row('Conversation style','persona','e.g. concise, friendly and direct',true)}{row('Food preferences','foodPreferences','Foods you enjoy or avoid',true)}{row('Goals','goals','Things you are working towards',true)}{row('Memory','memory','Useful context Echo should remember',true)}</div>
          </Section>
          <Section icon={MapPin} title="Location" subtitle="Used for nearby places and local recommendations.">
            <div className="flex flex-col gap-3 rounded-xl border border-white/[.07] bg-white/[.025] p-3 sm:flex-row sm:items-center"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[.06]"><Compass className="h-4 w-4 text-white/65"/></div><div className="min-w-0 flex-1"><div className="text-sm font-medium">{loc.status === 'ok' ? loc.label : loc.status === 'denied' ? 'Location access is off' : 'Location not shared'}</div><div className="mt-0.5 text-xs text-white/40">{loc.status === 'denied' ? 'You can enable it in your browser settings.' : 'Your location is only used when a local answer needs it.'}</div></div><Button size="sm" variant="outline" onClick={requestLoc} className="h-9 rounded-xl border-white/15 bg-white/[.04] text-white hover:bg-white/[.09]">{loc.status === 'loading' ? 'Locating…' : 'Update location'}</Button></div>
          </Section>
          <Section icon={Bell} title="Reminders" subtitle="Manage reminders stored on this device.">
            <div className="space-y-2">{rems.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-white/40">No reminders yet. Ask Echo to remind you about something.</div>}{rems.map((r) => <div key={r.id} className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-white/[.025] p-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-white/[.06]"><Bell className="h-4 w-4 text-white/65"/></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{r.title}</div><div className="text-xs text-white/40">{new Date(r.at).toLocaleString([], {weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</div></div><button onClick={() => {cancelReminder(r.id);setRems(getReminders());}} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/55 transition hover:border-red-300/30 hover:text-red-200">Remove</button></div>)}</div>
          </Section>
        </div>
        <div className="sticky bottom-0 flex items-center gap-2 border-t border-white/[.08] bg-[#090909]/90 pt-4 backdrop-blur-xl">
          <Button variant="outline" className="h-11 rounded-xl border-white/10 bg-white/[.035] text-white hover:bg-white/[.08]" onClick={() => logout()}><LogOut className="mr-2 h-4 w-4"/>Sign out</Button>
          <Button className="h-11 flex-1 rounded-xl bg-white font-semibold text-black hover:bg-white/85" onClick={save} disabled={saving}>{saving ? 'Saving…' : <><Save className="mr-2 h-4 w-4"/>Save changes</>}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
