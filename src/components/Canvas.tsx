import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Minus, Maximize2, Code2, LayoutDashboard, Globe, Download, Copy, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import DashboardCard from './DashboardCard';
import CodeView from './CodeView';

export type Task = { id: string; kind: 'web' | 'dashboard' | 'code'; title: string; content: string; lang?: string };
type Ctx = { tasks: Task[]; active?: string; open: boolean; add: (t: Task, focus?: boolean) => void; focus: (id: string) => void; close: (id: string) => void; setOpen: (o: boolean) => void };
const C = createContext<Ctx>(null as unknown as Ctx);
export const useCanvas = () => useContext(C);

export function hashId(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return 't' + (h >>> 0).toString(36); }

export function CanvasProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [active, setActive] = useState<string>();
  const [open, setOpen] = useState(false);
  const add = useCallback((t: Task, focus = true) => {
    setTasks((ts) => (ts.some((x) => x.id === t.id) ? ts.map((x) => (x.id === t.id ? t : x)) : [...ts, t].slice(-6)));
    if (focus) { setActive(t.id); setOpen(true); }
  }, []);
  const focus = (id: string) => { setActive(id); setOpen(true); };
  const close = (id: string) => setTasks((ts) => { const n = ts.filter((x) => x.id !== id); if (active === id) setActive(n[n.length - 1]?.id); if (!n.length) setOpen(false); return n; });
  return <C.Provider value={{ tasks, active, open, add, focus, close, setOpen }}>{children}</C.Provider>;
}

const ICON = { web: Globe, dashboard: LayoutDashboard, code: Code2 };

function Body({ t, reload, view }: { t: Task; reload: number; view: 'preview' | 'code' }) {
  if (t.kind === 'web' && view === 'preview') return <iframe key={reload} title={t.title} sandbox="allow-scripts allow-modals allow-forms allow-popups" srcDoc={t.content} className="h-full w-full rounded-b-2xl bg-white" />;
  if (t.kind === 'web' && view === 'code') return <div className="h-full overflow-auto"><CodeView code={t.content} /></div>;
  if (t.kind === 'dashboard') { try { return <div className="h-full overflow-auto p-4"><DashboardCard {...JSON.parse(t.content)} large /></div>; } catch { return null; } }
  return <div className="h-full overflow-auto"><CodeView code={t.content} /></div>;
}

export function CanvasPanel() {
  const { tasks, active, open, focus, close, setOpen } = useCanvas();
  const [reload, setReload] = useState(0);
  const [webView, setWebView] = useState<'preview' | 'code'>('preview');
  const t = tasks.find((x) => x.id === active) || tasks[tasks.length - 1];
  const download = () => {
    if (!t) return;
    const ext = t.kind === 'web' ? 'html' : t.kind === 'dashboard' ? 'json' : t.lang || 'txt';
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t.content])); a.download = `${t.title.replace(/\W+/g, '-').toLowerCase()}.${ext}`; a.click();
  };
  return (
    <>
      <AnimatePresence>
        {open && t && (
          <motion.section key="canvas" initial={{ opacity: 0, y: 40, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.98 }} transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            className="fixed inset-0 z-40 flex flex-col bg-background px-2 pb-sab pt-sat-2 md:static md:z-auto md:w-[52%] md:min-w-[420px] md:bg-transparent md:py-3 md:pr-3 md:pl-0">
            <div className="glass flex h-full flex-col overflow-hidden rounded-2xl">
              <div className="flex items-center gap-1 border-b border-white/[.07] p-1.5">
                <div className="scrollbar-none flex flex-1 gap-1 overflow-x-auto">
                  {tasks.map((x) => { const I = ICON[x.kind]; return (
                    <button key={x.id} onClick={() => focus(x.id)} className={`group flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${x.id === t.id ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50'}`}>
                      <I className="h-3.5 w-3.5" /><span className="max-w-[120px] truncate">{x.title}</span>
                      <X onClick={(e) => { e.stopPropagation(); close(x.id); }} className="h-3 w-3 opacity-50 hover:opacity-100" />
                    </button>); })}
                </div>
                {t.kind === 'web' && <div className="mr-1 flex rounded-xl border border-white/[.08] bg-white/[.035] p-0.5"><button onClick={() => setWebView('preview')} className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition ${webView === 'preview' ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}>Preview</button><button onClick={() => setWebView('code')} className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition ${webView === 'code' ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}>Code</button></div>}
                {t.kind === 'web' && webView === 'preview' && <button title="Reload preview" onClick={() => setReload((r) => r + 1)} className="icon-btn !h-10 !w-10"><RotateCw className="h-4 w-4" /></button>}
                <button title="Copy" onClick={() => { navigator.clipboard.writeText(t.content); toast('Copied'); }} className="icon-btn !h-10 !w-10"><Copy className="h-4 w-4" /></button>
                <button title="Download" onClick={download} className="icon-btn !h-10 !w-10"><Download className="h-4 w-4" /></button>
                <button title="Minimize" onClick={() => setOpen(false)} className="icon-btn !h-10 !w-10"><Minus className="h-4 w-4" /></button>
              </div>
              <div className="min-h-0 flex-1"><Body t={t} reload={reload} view={webView} /></div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
      {!open && tasks.length > 0 && (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed right-4 z-30 flex flex-col items-end gap-2 bottom-[calc(7.5rem+var(--sab,0px))]">
          {tasks.slice(-3).map((x) => { const I = ICON[x.kind]; return (
            <button key={x.id} onClick={() => focus(x.id)} className="glass flex items-center gap-2 rounded-full py-2.5 pl-3 pr-3.5 text-xs shadow-lg md:py-1.5">
              <I className="h-3.5 w-3.5" /><span className="max-w-[140px] truncate">{x.title}</span><Maximize2 className="h-3 w-3 text-muted-foreground" />
            </button>); })}
        </motion.div>
      )}
    </>
  );
}
