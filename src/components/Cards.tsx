import { useEffect, useState } from 'react';
import { useUpload } from 'zitejs/upload';
import { motion } from 'framer-motion';
import { Download, Maximize2, RefreshCw, Shuffle, WandSparkles, Navigation, ExternalLink, Play, Pause, Send, CalendarPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { sendEmail, generateImage } from 'zitejs/api';
import { resolveGeneratedImage } from '../lib/imageGeneration';
import { addReminder } from '../lib/reminders';

const card = 'glass my-3 overflow-hidden rounded-2xl';

type ImageRatio = '1:1' | '3:2' | '2:3' | '4:3' | '3:4' | '16:9' | '9:16' | '4:5' | '5:4' | '21:9';

function ImageSlot({ prompt, k, variant, onVary, aspectRatio = '1:1', location, lat, lon, onModel }: { prompt: string; k: string; variant: number; onVary: () => void; aspectRatio?: ImageRatio; location?: string; lat?: number; lon?: number; onModel?: (m: string) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [n, setN] = useState(0);
  const [busy, setBusy] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const { upload } = useUpload();
  useEffect(() => {
    if (url || busy) return;
    let off = false;
    setBusy(true); setErr(''); setLoaded(false);
    generateImage({ prompt, variant: variant + n, aspectRatio, imageSize: '1K', location, lat, lon })
      .then(async (result) => {
        if (!result.allowed) {
          dispatchEvent(new CustomEvent('echo-limit', { detail: result.resetAt }));
          throw new Error('You’ve used today’s Free image allowance (5/day). Upgrade to Pro for unlimited EchoI1 PRO images.');
        }
        dispatchEvent(new CustomEvent('echo-plan', { detail: result }));
        const imageUrl = await resolveGeneratedImage(result, () => off);
        if (!off && imageUrl) {
          setUrl(imageUrl);
          if (result.model) onModel?.(result.model);
        }
      })
      .catch((e) => !off && setErr(e instanceof Error ? e.message : 'Image generation failed. Try again.'))
      .finally(() => !off && setBusy(false));
    return () => { off = true; };
  }, [url, n, aspectRatio]);
  const redo = () => {
    try { localStorage.removeItem(k); } catch { /* ignore */ }
    setLoaded(false); setErr(''); setUrl(null); setN((x) => x + 1);
  };
  const applyEdit = async () => {
    if (!url || !editPrompt.trim() || busy) return;
    setBusy(true); setErr(''); setLoaded(false);
    try {
      const result = await generateImage({ prompt: editPrompt.trim(), referenceImage: url, variant: n + 1, aspectRatio, imageSize: '1K' });
      if (!result.allowed) {
        dispatchEvent(new CustomEvent('echo-limit', { detail: result.resetAt }));
        throw new Error('You’ve used today’s Free image allowance. Echo Pro unlocks the advanced image engine.');
      }
      dispatchEvent(new CustomEvent('echo-plan', { detail: result }));
      let next = await resolveGeneratedImage(result);
      if (!next) throw new Error('The image job was cancelled before it returned a result.');
      if (next.startsWith('data:')) {
        try { next = (await upload(next, `echo-edit-${Date.now()}.png`)).url; } catch { /* keep the generated image in memory */ }
      }
      if (/^https?:/.test(next)) { try { localStorage.setItem(k, next); } catch { /* storage may be full */ } }
      setUrl(next); setEditPrompt(''); setEditOpen(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not edit this image.');
    } finally { setBusy(false); }
  };
  const ratio = aspectRatio.replace(':', ' / ');
  return (
    <div className="group relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/[.08] bg-black shadow-[0_16px_40px_-28px_rgba(0,0,0,.95)]" style={{ aspectRatio: ratio }}>
      {(!url || !loaded) && !err && (
        <div aria-live="polite" className="absolute inset-0 grid place-items-center bg-black">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-white/45" />
        </div>
      )}
      {err && (
        <div role="alert" className="absolute inset-0 grid place-items-center bg-black p-4 text-center">
          <div className="max-w-[15rem]">
            <div className="mx-auto mb-2.5 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[.04]">
              <RefreshCw className="h-4 w-4 text-white/50" />
            </div>
            <div className="text-[12px] font-semibold text-white/85">Image generation paused</div>
            <p className="mt-1.5 text-[11px] leading-5 text-white/45">{err}</p>
            <button onClick={redo} disabled={busy} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[11px] font-semibold text-black transition hover:bg-white/85 disabled:opacity-50">
              <RefreshCw className="h-3 w-3" />Try again
            </button>
          </div>
        </div>
      )}
      {url && <img src={url} alt={prompt} onLoad={() => setLoaded(true)} onError={() => setErr('This image could not be displayed. Please try again.')} className={`h-full w-full object-contain ${loaded ? 'reveal' : 'opacity-0'}`} />}
      {url && loaded && editOpen && (
        <div className="glass absolute inset-x-2 bottom-14 rounded-2xl p-2.5">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-white/75"><WandSparkles className="h-3.5 w-3.5"/>Describe an edit</div>
          <div className="flex gap-2"><input value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyEdit()} placeholder="Change the lighting, add details…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/55 px-3 py-2 text-xs text-white outline-none placeholder:text-white/35 focus:border-white/30"/><button onClick={applyEdit} disabled={!editPrompt.trim() || busy} className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black disabled:opacity-40">{busy ? '…' : 'Apply'}</button></div>
        </div>
      )}
      {url && loaded && (
        <div className="glass absolute inset-x-2 bottom-2 flex justify-around rounded-2xl py-2 text-[11px] opacity-0 transition-opacity duration-150 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5"><Maximize2 className="h-3.5 w-3.5" />Open</a>
          <button onClick={() => setEditOpen((v) => !v)} className="flex items-center gap-1.5"><WandSparkles className="h-3.5 w-3.5" />Edit</button>
          <button onClick={onVary} className="flex items-center gap-1.5"><Shuffle className="h-3.5 w-3.5" />Variation</button>
          <button onClick={redo} disabled={busy} className="flex items-center gap-1.5 disabled:opacity-40"><RefreshCw className="h-3.5 w-3.5" />Redo</button>
          <a href={url} download="echo-image.png" target="_blank" rel="noreferrer" className="flex items-center gap-1.5"><Download className="h-3.5 w-3.5" />Save</a>
        </div>
      )}
    </div>
  );
}

export function ImageCard({ prompt, count = 1, aspectRatio = '1:1', location, lat, lon }: { prompt: string; count?: number; aspectRatio?: ImageRatio; location?: string; lat?: number; lon?: number }) {
  const [slots, setSlots] = useState(() => Math.min(Math.max(count, 1), 4));
  const [modelLabel, setModelLabel] = useState('EchoI1');
  return (
    <div className="my-3 max-w-sm">
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <div className="text-[9px] font-semibold uppercase tracking-[.18em] text-foreground/40">Image</div>
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{prompt}</div>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold tracking-wide ${
          modelLabel.includes('PRO')
            ? 'border-white/20 bg-gradient-to-r from-violet-500/20 via-fuchsia-400/15 to-cyan-400/20 text-white/90'
            : 'border-white/10 bg-black text-white/45'
        }`}>{modelLabel}</span>
      </div>
      <div className={`grid gap-2 ${slots > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {Array.from({ length: slots }, (_, i) => (
          <ImageSlot key={i} prompt={prompt} k={`echo-img:${prompt}:${i}:${location || ''}`} variant={i} aspectRatio={aspectRatio} location={location} lat={lat} lon={lon} onModel={setModelLabel} onVary={() => setSlots((s) => Math.min(s + 1, 4))} />
        ))}
      </div>
    </div>
  );
}

type Place = { name: string; note?: string; url?: string; lat?: number; lon?: number; kind?: string; image?: string; distance?: string };

function hue(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
function placeImg(p: Place, _q: string) {
  // Prefer a real image tagged on the place; otherwise use a category illustration.
  return p.image || placeFallback(p);
}
function placeFallback(p: Place) {
  const kw = (p.kind || 'restaurant').toLowerCase().replace(/[^a-z ]/g, '').split(' ')[0] || 'restaurant';
  return `https://loremflickr.com/480/320/${kw}?lock=${hue(p.name)}`;
}

export function MapCard({ query, title, places = [] }: { query: string; title?: string; places?: Place[] }) {
  const [sel, setSel] = useState(0);
  const p = places[sel];
  const where = p?.lat ? `${p.lat},${p.lon}` : p ? `${p.name} ${query}` : query;
  const g = (x: Place) => encodeURIComponent(x.lat ? `${x.name} ${x.lat},${x.lon}` : `${x.name} ${query}`);
  return (
    <div className="my-3 overflow-hidden rounded-3xl border border-white/[.07] bg-white/[.02]">
      <div className="relative h-56 sm:h-64">
        <iframe title="map" loading="lazy" className="absolute inset-0 h-full w-full border-0 [filter:invert(.92)_hue-rotate(180deg)_saturate(.5)_brightness(.9)]"
          src={`https://www.google.com/maps?q=${encodeURIComponent(where)}&z=15&output=embed`} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent" />
        <div className="glass absolute left-3 top-3 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"><Navigation className="h-3 w-3" />{title || query}</div>
      </div>
      <div className="scrollbar-none -mt-10 flex snap-x gap-3 overflow-x-auto px-3 pb-3">
        {places.map((x, i) => (
          <motion.div role="button" key={x.name + i} whileTap={{ scale: 0.97 }} onClick={() => setSel(i)}
            className={`relative w-52 shrink-0 cursor-pointer snap-start overflow-hidden rounded-2xl border text-left transition-colors ${i === sel ? 'border-white/30' : 'border-white/[.06]'} bg-card`}>
            <div className="relative h-36 overflow-hidden bg-muted">
              <img src={placeImg(x, query)} alt="" loading="lazy" className="reveal h-full w-full object-cover" onError={(e) => { const t = e.target as HTMLImageElement; if (t.dataset.fb) t.style.display = 'none'; else { t.dataset.fb = '1'; t.src = placeFallback(x); } }} />
              {x.distance && <span className="glass absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium">{x.distance}</span>}
            </div>
            <div className="p-3">
              <div className="truncate text-sm font-semibold">{x.name}</div>
              <div className="truncate text-xs text-muted-foreground">{x.note || x.kind}</div>
              <div className="mt-2.5 flex gap-1.5 text-[11px]">
                <a onClick={(e) => e.stopPropagation()} href={`https://www.google.com/maps/dir/?api=1&destination=${g(x)}`} target="_blank" rel="noreferrer" className="rounded-full bg-white px-2.5 py-1 font-semibold text-black">Directions</a>
                <a onClick={(e) => e.stopPropagation()} href={`https://www.google.com/maps/search/?api=1&query=${g(x)}`} target="_blank" rel="noreferrer" className="rounded-full bg-white/90 px-2.5 py-1 font-medium text-black">Reviews</a>
                <a onClick={(e) => e.stopPropagation()} href={x.url || `https://www.google.com/search?q=${encodeURIComponent(x.name + ' ' + query)}`} target="_blank" rel="noreferrer" className="rounded-full bg-white/90 px-2.5 py-1 font-medium text-black">Website</a>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function SpotifyCard({ query, title, subtitle }: { query: string; title?: string; subtitle?: string }) {
  const [playing, setPlaying] = useState(false);
  const [song, artist] = (title || query).split(/\s+[—-]\s+/);
  const h = hue(title || query);
  return (
    <div className="group my-2 flex items-center gap-3 rounded-2xl border border-white/[.06] bg-white/[.03] p-2 pr-3 transition-colors hover:bg-white/[.06]">
      <div className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl" style={{ background: `linear-gradient(135deg, hsl(${h} 70% 55%), hsl(${(h + 60) % 360} 70% 30%))` }}>
        {playing ? <span className="eq flex h-5 items-end text-white">{[0, 1, 2, 3].map((i) => <span key={i} style={{ height: 18, animationDelay: `${i * 0.12}s` }} />)}</span> : <span className="text-xl font-bold text-white/90">{(song || '♪')[0]}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{song}</div>
        <div className="flex items-center gap-1.5 truncate text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-[#1ed760]" />{artist || subtitle || 'Spotify'}</div>
        <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-white/10"><motion.div className="h-full rounded-full bg-[#1ed760]" animate={{ width: playing ? '100%' : '0%' }} transition={{ duration: playing ? 30 : 0.2, ease: 'linear' }} /></div>
      </div>
      <a href={`https://open.spotify.com/search/${encodeURIComponent(query)}`} target="_blank" rel="noreferrer" onClick={() => setPlaying(true)}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#1ed760] text-black transition-transform hover:scale-105 active:scale-95">{playing ? <Pause className="h-4 w-4 fill-black" /> : <Play className="ml-0.5 h-4 w-4 fill-black" />}</a>
    </div>
  );
}

export function YouTubeCard({ query, title }: { query: string; title?: string }) {
  const href = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const kw = query.toLowerCase().replace(/[^a-z ]/g, '').split(' ').filter((w) => w.length > 3).slice(0, 2).join(',') || 'music';
  return (
    <a href={href} target="_blank" rel="noreferrer" className="group my-3 block max-w-md overflow-hidden rounded-2xl border border-white/[.06] bg-white/[.03]">
      <div className="relative aspect-video overflow-hidden bg-black">
        <img src={`https://loremflickr.com/640/360/${encodeURIComponent(kw)}?lock=${hue(query)}`} alt="" loading="lazy" className="reveal h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent" />
        <div className="absolute inset-0 grid place-items-center"><div className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-black backdrop-blur transition-transform group-hover:scale-110"><Play className="ml-0.5 h-5 w-5 fill-black" /></div></div>
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 text-white">
          <span className="rounded bg-[#ff0033] px-1.5 py-0.5 text-[10px] font-bold">YouTube</span>
          <span className="truncate text-sm font-semibold">{title || query}</span>
        </div>
      </div>
    </a>
  );
}

export function EmailCard(init: { to?: string; subject?: string; body?: string }) {
  const [f, setF] = useState({ to: init.to || '', subject: init.subject || '', body: init.body || '' });
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const send = async () => {
    if (!f.to.includes('@')) return toast.error('Add a valid recipient');
    setState('sending');
    try { await sendEmail(f); setState('sent'); toast.success('Sent via Gmail'); } catch (e) { setState('idle'); toast.error(e instanceof Error ? e.message : 'Failed to send'); }
  };
  const field = 'w-full bg-transparent px-4 py-2.5 text-sm outline-none border-b border-border/60';
  return (
    <div className={card}>
      <input className={field} placeholder="To" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
      <input className={field} placeholder="Subject" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />
      <textarea className={`${field} min-h-[120px] resize-none border-0`} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
      <div className="flex justify-end p-2">
        <button disabled={state !== 'idle'} onClick={send} className="flex items-center gap-2 rounded-full bg-foreground px-4 py-1.5 text-sm text-background disabled:opacity-60">
          {state === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{state === 'sent' ? 'Sent' : 'Send via Gmail'}
        </button>
      </div>
    </div>
  );
}

export function CalendarCard({ title, start, end, details }: { title: string; start: string; end?: string; details?: string }) {
  const fmt = (s: string) => new Date(s).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const s = new Date(start);
  const href = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(start)}/${fmt(end || new Date(s.getTime() + 36e5).toISOString())}&details=${encodeURIComponent(details || '')}`;
  return (
    <div className={`${card} flex items-center gap-3 p-3`}>
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-muted text-center leading-none">
        <div><div className="text-[10px] uppercase text-muted-foreground">{s.toLocaleString('en', { month: 'short' })}</div><div className="text-lg font-semibold">{s.getDate()}</div></div>
      </div>
      <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{title}</div><div className="text-xs text-muted-foreground">{s.toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</div></div>
      <a href={href} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs text-background"><CalendarPlus className="h-3.5 w-3.5" />Add</a>
    </div>
  );
}

export function ReminderCard({ title, at }: { title: string; at: string }) {
  const [set, setSet] = useState(false);
  const d = new Date(at);
  useEffect(() => { addReminder(title, at).then(() => setSet(true)); }, []);
  return (
    <div className="glass my-3 flex max-w-sm items-center gap-3 rounded-2xl p-3">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-white text-lg">⏰</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{d.toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</div>
      </div>
      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-black">{set ? 'Set' : '…'}</span>
    </div>
  );
}
