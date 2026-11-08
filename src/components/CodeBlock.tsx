import { createContext, useContext, useEffect, useState } from 'react';
import { Copy, Check, Download, Globe, LayoutDashboard, Code2, ArrowUpRight } from 'lucide-react';
import { useCanvas, hashId, type Task } from './Canvas';
import { highlight } from './CodeView';

export const LiveCtx = createContext({ last: false, streaming: false });

const EXT: Record<string, string> = { html: 'html', javascript: 'js', js: 'js', typescript: 'ts', ts: 'ts', python: 'py', py: 'py', css: 'css', json: 'json', tsx: 'tsx', jsx: 'jsx', bash: 'sh', sql: 'sql' };

export function ArtifactChip({ task, complete }: { task: Task; complete: boolean }) {
  const { add, focus } = useCanvas();
  const live = useContext(LiveCtx);
  useEffect(() => { if (complete) add(task, live.last); }, [complete, task.id]);
  const I = task.kind === 'web' ? Globe : task.kind === 'dashboard' ? LayoutDashboard : Code2;
  return (
    <button onClick={() => complete && (add(task, true), focus(task.id))}
      className={`group my-3 flex w-full max-w-xl items-center gap-3 rounded-[18px] border border-white/[.09] bg-gradient-to-br from-white/[.055] to-white/[.018] p-3.5 text-left shadow-[0_12px_40px_-28px_rgba(0,0,0,.8)] transition-all duration-200 hover:border-white/20 hover:bg-white/[.07] ${complete ? '' : 'shimmer-line'}`}>
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-white/[.09] bg-white/[.055]"><I className="h-[19px] w-[19px] text-white/80" /></div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2"><span className="text-[9px] font-semibold tracking-[.17em] text-white/40">{task.kind === 'web' ? 'WEBSITE STUDIO' : task.kind === 'dashboard' ? 'DASHBOARD' : 'CODE WORKSPACE'}</span><span className={`h-1.5 w-1.5 rounded-full ${complete ? 'bg-emerald-300' : 'animate-pulse bg-violet-300'}`}/></div>
        <div className="truncate text-[14px] font-semibold leading-tight text-foreground">{task.title}</div>
        <div className={`mt-1 text-[11px] leading-tight ${complete ? 'text-muted-foreground' : 'thinking-text font-medium'}`}>{complete ? (task.kind === 'web' ? 'Live preview ready · Open workspace' : task.kind === 'dashboard' ? 'Dashboard ready · Open workspace' : `${task.lang || 'Code'} · Open code workspace`) : 'Building your preview…'}</div>
      </div>
      {complete && <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[11px] font-semibold text-black transition group-hover:bg-white/85">{task.kind === 'web' ? 'Preview' : 'Open'}<ArrowUpRight className="h-3.5 w-3.5" /></span>}
    </button>
  );
}

export default function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const { streaming } = useContext(LiveCtx);
  if (lang === 'html' || lang === 'svg') {
    const title = /<title>([^<]*)<\/title>/i.exec(code)?.[1] || 'Website preview';
    return <ArtifactChip task={{ id: hashId(code.slice(0, 400)), kind: 'web', title, content: code }} complete={!streaming || /<\/html>|<\/svg>/i.test(code)} />;
  }
  const lines = code.split('\n').length;
  if (lines > 40) return <ArtifactChip task={{ id: hashId(code.slice(0, 400)), kind: 'code', title: `${lang || 'Code'} · ${lines} lines`, content: code, lang: EXT[lang] || lang }} complete={!streaming} />;
  const copy = async () => { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1200); };
  const download = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([code])); a.download = `echo.${EXT[lang] || 'txt'}`; a.click(); };
  return (
    <div className="my-3 overflow-hidden rounded-2xl border border-white/[.08] bg-black/40 text-[13px] text-neutral-200 shadow-[0_8px_40px_-12px_rgba(0,0,0,.6)] backdrop-blur-xl">
      <div className="flex items-center gap-1 border-b border-white/[.06] bg-white/[.03] px-3 py-1.5 text-xs">
        <span className="mr-auto font-mono text-neutral-400">{lang || 'text'}</span>
        <button onClick={copy} className="flex items-center gap-1 rounded-md px-2 py-1 text-neutral-400 hover:text-white">{copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{copied ? 'Copied' : 'Copy'}</button>
        <button onClick={download} className="flex items-center gap-1 rounded-md px-2 py-1 text-neutral-400 hover:text-white"><Download className="h-3 w-3" />Download</button>
      </div>
      <pre className="max-h-[420px] overflow-auto p-4 font-mono leading-relaxed"><code dangerouslySetInnerHTML={{ __html: highlight(code) }} /></pre>
    </div>
  );
}
