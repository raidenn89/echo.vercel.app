import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Paperclip, X, Loader2, Square, Lock } from 'lucide-react';
import { useUpload } from 'zitejs/upload';
import { toast } from 'sonner';
import { PRO_MODEL } from '../lib/plan';

export const AGENTS = [
  { id: 'gemini-3.8-flash', label: 'Echo' },
  { id: 'gemini-3.5-flash-lite', label: 'Echo Fast' },
  { id: PRO_MODEL, label: 'Echo Pro' },
];

type Props = { busy: boolean; onSend: (text: string, images: string[]) => unknown; onStop: () => void; agent: string; setAgent: (a: string) => void; isPro: boolean; onLocked: () => void };

export default function Composer({ busy, onSend, onStop, agent, setAgent, isPro, onLocked }: Props) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const { upload, isUploading } = useUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const ta = useRef<HTMLTextAreaElement>(null);

  const add = async (files: FileList | File[]) => {
    for (const f of Array.from(files)) {
      try { const { url } = await upload(f); setImages((i) => [...i, url]); } catch { toast.error('Upload failed'); }
    }
  };
  const canSend = !!text.trim() || images.length > 0;
  const submit = () => {
    if (busy || isUploading || (!text.trim() && !images.length)) return;
    if (onSend(text.trim(), images) === false) return; // blocked (e.g. daily image limit) — keep what they typed
    setText(''); setImages([]);
    if (ta.current) ta.current.style.height = 'auto';
  };

  return (
    <div className={`composer-surface glass rainbow-border rounded-[26px] p-2 transition-shadow duration-300 focus-within:shadow-[0_12px_50px_-12px_rgba(140,170,255,.45)] ${busy ? 'shimmer-line' : ''}`}>
      {images.length > 0 && (
        <div className="flex gap-2 px-2 pt-1">
          {images.map((u) => (
            <div key={u} className="relative h-14 w-14 overflow-hidden rounded-xl bg-muted">
              {/\.(png|jpe?g|gif|webp|avif)/i.test(u) ? <img src={u} className="h-full w-full object-cover" /> : <div className="p-1 text-[10px]">File</div>}
              <button onClick={() => setImages((i) => i.filter((x) => x !== u))} className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white"><X className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      )}
      <textarea
        ref={ta} rows={1} value={text} placeholder="Ask Echo anything"
        onChange={(e) => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'; }}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); submit(); } }}
        onPaste={(e) => { const f = Array.from(e.clipboardData.files); if (f.length) { e.preventDefault(); add(f); } }}
        className="block max-h-[200px] w-full resize-none bg-transparent px-3 py-2.5 text-[16px] outline-none placeholder:text-muted-foreground"
      />
      <div className="flex items-center gap-1.5 px-1">
        <input ref={fileRef} type="file" multiple hidden onChange={(e) => e.target.files && add(e.target.files)} />
        <button onClick={() => fileRef.current?.click()} aria-label="Attach" className="icon-btn !h-10 !w-10 shrink-0">
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        </button>
        <div className="flex min-w-0 shrink rounded-full bg-white/[.05] p-0.5 text-xs">
          {AGENTS.map((a) => (
            <button key={a.id} onClick={() => (a.id === PRO_MODEL && !isPro ? onLocked() : setAgent(a.id))} className={`relative rounded-full px-3 py-2 transition-all duration-200 sm:px-2.5 sm:py-1 ${agent === a.id ? a.id === PRO_MODEL ? 'rainbow-border bg-[#14101c]/90 text-white shadow-[0_0_28px_rgba(180,140,255,.35)] backdrop-blur-md' : 'text-black' : a.id === PRO_MODEL ? 'text-white/55 hover:text-white/80' : 'text-muted-foreground hover:text-foreground'}`}>
              {agent === a.id && a.id !== PRO_MODEL && <motion.span layoutId="agent-pill" transition={{ type: 'spring', stiffness: 700, damping: 40 }} className="absolute inset-0 rounded-full bg-white" />}
              {agent === a.id && a.id === PRO_MODEL && <motion.span layoutId="agent-pro-pill" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .2 }} className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-violet-400/25 via-fuchsia-300/15 to-cyan-300/20" />}
              {a.id === PRO_MODEL && agent !== a.id && <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-violet-500/[.08] via-transparent to-cyan-400/[.08]" />}
              <span className={`relative flex items-center gap-1 font-medium ${a.id === PRO_MODEL ? 'pro-text' : ''}`}>{a.id === PRO_MODEL ? 'Pro' : a.label.replace('Echo ', '') === 'Echo' ? 'Echo' : a.label.replace('Echo ', '')}{a.id === PRO_MODEL && !isPro && <Lock className="h-3 w-3 opacity-70" />}</span>
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <AnimatePresence mode="wait" initial={false}>
          {busy ? (
            <motion.button key="stop" initial={{ scale: 0.4, opacity: 0, rotate: -90 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ type: 'spring', stiffness: 600, damping: 28 }} onClick={onStop} aria-label="Stop" className="no-press grid h-11 w-11 shrink-0 place-items-center rounded-full bg-foreground text-background sm:h-10 sm:w-10"><Square className="h-3.5 w-3.5 fill-current" /></motion.button>
          ) : (
            <motion.button key="send" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: canSend ? 1 : 0.92, opacity: canSend ? 1 : 0.3 }} exit={{ scale: 0.4, opacity: 0 }} whileTap={{ scale: 0.88 }} transition={{ type: 'spring', stiffness: 600, damping: 26 }} onClick={submit} disabled={!canSend} aria-label="Send" className="no-press grid h-11 w-11 shrink-0 place-items-center rounded-full bg-foreground text-background sm:h-10 sm:w-10"><ArrowUp className="h-[18px] w-[18px]" /></motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
