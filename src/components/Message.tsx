import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, ThumbsUp, ThumbsDown, RefreshCw, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import Markdown from './Markdown';
import Logo from './Logo';
import type { Msg } from '../lib/util';

export function Thinking() {
  return (
    <div className="flex items-center py-2" aria-label="Thinking" role="status">
      <Logo className="h-5 w-5 animate-[spin_.34s_linear_infinite]" />
    </div>
  );
}

const speak = (t: string) => { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(t.replace(/```[\s\S]*?```/g, '').replace(/[*#_`]/g, ''))); };

export default function Message({ m, last, streaming, onRegenerate, onQuick }: { m: Msg; last: boolean; streaming: boolean; onRegenerate: () => void; onQuick: (t: string) => void }) {
  const [fb, setFb] = useState<'up' | 'down' | null>(null);
  if (m.role === 'user') {
    return (
      <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 38 }} className="flex flex-col items-end gap-2">
        {m.images?.map((u) => <img key={u} src={u} className="max-h-56 rounded-2xl border border-white/10" />)}
        {m.content && <div className="glass select-text max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-lg px-4 py-2.5 text-[15px] leading-6">{m.content}</div>}
      </motion.div>
    );
  }
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="group select-text">
      <Markdown text={m.content} last={last} streaming={streaming} />
      {!streaming && m.content && (
        <div className={`mt-1 flex flex-wrap items-center gap-0.5 text-muted-foreground ${last ? '' : 'opacity-0 transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100'}`}>
          <button title="Copy" onClick={() => { navigator.clipboard.writeText(m.content); toast('Copied'); }} className="grid h-9 w-9 place-items-center rounded-full hover:bg-accent active:bg-accent md:h-8 md:w-8"><Copy className="h-4 w-4" /></button>
          <button title="Read aloud" onClick={() => speak(m.content)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-accent active:bg-accent md:h-8 md:w-8"><Volume2 className="h-4 w-4" /></button>
          <button title="Good" onClick={() => setFb('up')} className={`grid h-9 w-9 place-items-center rounded-full hover:bg-accent active:bg-accent md:h-8 md:w-8 ${fb === 'up' ? 'text-foreground' : ''}`}><ThumbsUp className="h-4 w-4" /></button>
          <button title="Bad" onClick={() => setFb('down')} className={`grid h-9 w-9 place-items-center rounded-full hover:bg-accent active:bg-accent md:h-8 md:w-8 ${fb === 'down' ? 'text-foreground' : ''}`}><ThumbsDown className="h-4 w-4" /></button>
          {last && <button title="Regenerate" onClick={onRegenerate} className="grid h-9 w-9 place-items-center rounded-full hover:bg-accent active:bg-accent md:h-8 md:w-8"><RefreshCw className="h-4 w-4" /></button>}
          {fb && <span className="ml-1 text-xs">Thanks for the feedback</span>}
        </div>
      )}
      {last && !streaming && m.content && (
        <div className="mt-2 flex flex-wrap gap-2">
          {['Shorter', 'Tell me more', 'Show options'].map((q) => (
            <button key={q} onClick={() => onQuick(q)} className="glass rounded-full px-3.5 py-2 text-xs hover:bg-accent md:py-1">{q}</button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
