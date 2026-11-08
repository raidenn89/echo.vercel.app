import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PanelLeft, SquarePen, ListChecks, LayoutGrid, Sparkles, X, ChevronDown, Crown, CircleX, FolderKanban, Compass, ImagePlus, Globe, LayoutDashboard, Mail } from 'lucide-react';
import RoutinesSheet from './RoutinesSheet';
import GmailSheet from './GmailSheet';
import { toast } from 'sonner';
import { useAuth } from 'zitejs/auth';
import { chat, getChat, getProject, listChats, listProjects, plan, profile, saveChat, saveProject, summarize, type ListChatsOutputType, type ListProjectsOutputType, type PlanOutputType, type ProfileOutputType } from 'zitejs/api';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@project/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@project/components/ui/alert-dialog';
import Sidebar from './Sidebar';
import ProjectsDialog from './ProjectsDialog';
import Composer, { AGENTS } from './Composer';
import Message, { Thinking } from './Message';
import { CanvasPanel, CanvasProvider, hashId, useCanvas } from './Canvas';
import SettingsDialog from './SettingsDialog';
import SummaryDialog from './SummaryDialog';
import UpgradeDialog from './UpgradeDialog';
import Logo from './Logo';
import { greeting, type Msg } from '../lib/util';
import { useLocation } from '../lib/useLocation';
import { armAll } from '../lib/reminders';
import { getWallpaper, wallCss } from '../lib/wallpapers';
import { haptic } from '../lib/viewport';
import { FREE_PROJECT_LIMIT, PRO_MODEL, formatReset, imageIntent, websiteIntent } from '../lib/plan';

const HTML_RE = /```html\s*\n([\s\S]*?)```/;

const SUGGESTIONS = [
  { title: 'Discover places', query: 'Food near me right now', label: 'EXPLORE', icon: Compass, hint: 'Find places around you' },
  { title: 'Create an image', query: 'Create a photorealistic image of Dubai at dusk', label: 'IMAGE STUDIO', icon: ImagePlus, hint: 'Turn a prompt into an image' },
  { title: 'Build a dashboard', query: 'Build a weekly gym routine dashboard', label: 'WORKSPACE', icon: LayoutDashboard, hint: 'Organise work and ideas' },
  { title: 'Design a website', query: 'Design a luxury coffee shop website', label: 'WEBSITE STUDIO', icon: Globe, hint: 'Create a complete website' },
];

export default function Shell() {
  return <CanvasProvider><ShellInner /></CanvasProvider>;
}

function ShellInner() {
  const { user } = useAuth();
  const [chats, setChats] = useState<ListChatsOutputType['chats']>([]);
  const [chatId, setChatId] = useState<string>();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [sidebar, setSidebar] = useState(() => innerWidth >= 768);
  const [settings, setSettings] = useState(false);
  const [routines, setRoutines] = useState(false);
  const [gmailOpen, setGmailOpen] = useState(false);
  const [summary, setSummary] = useState<string[] | null | undefined>(undefined);
  const [prof, setProf] = useState<ProfileOutputType | null>(null);
  const [agent, setAgent] = useState(AGENTS[1].id);
  const [usage, setUsage] = useState<PlanOutputType | null>(null);
  const [upgrade, setUpgrade] = useState(false);
  const [limitAt, setLimitAt] = useState<number | null>(null);
  const [projects, setProjects] = useState<ListProjectsOutputType['projects']>([]);
  const [projLimit, setProjLimit] = useState<number | null>(FREE_PROJECT_LIMIT);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [project, setProject] = useState<{ id: string; title: string } | null>(null);
  const [limitProj, setLimitProj] = useState(false);
  const [cancelAsk, setCancelAsk] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const projRef = useRef<{ id?: string; html: string }>({ html: '' });
  const canvas = useCanvas();
  const isPro = usage?.plan === 'pro';
  const refreshPlan = () => plan({ action: 'status' }).then(setUsage).catch(() => {});
  const refreshProjects = () => listProjects({}).then((r) => { setProjects(r.projects); setProjLimit(r.limit); }).catch(() => {});
  const { loc, request } = useLocation(true);
  const stopRef = useRef(false);
  const stopFn = useRef<() => void>(() => {});
  const endRef = useRef<HTMLDivElement>(null);
  const isMobile = () => innerWidth < 768;

  const refresh = () => listChats({}).then((r) => setChats(r.chats)).catch(() => {});
  const [wall, setWall] = useState(getWallpaper);
  useEffect(() => { armAll(); const h = () => setWall(getWallpaper()); addEventListener('echo-wall', h); return () => removeEventListener('echo-wall', h); }, []);
  useEffect(() => { refresh(); refreshPlan(); refreshProjects(); profile({}).then(setProf).catch(() => {}); }, []);
  // image cards tell us when they spend an image (Redo) or hit the daily limit
  useEffect(() => {
    const u = (e: Event) => setUsage((e as CustomEvent<PlanOutputType>).detail);
    const l = (e: Event) => setLimitAt((e as CustomEvent<number | null>).detail ?? Date.now() + 86_400_000);
    addEventListener('echo-plan', u); addEventListener('echo-limit', l);
    return () => { removeEventListener('echo-plan', u); removeEventListener('echo-limit', l); };
  }, []);
  // fall back to standard Echo if a free account somehow has Pro selected
  useEffect(() => { if (usage && !isPro && agent === PRO_MODEL) setAgent(AGENTS[0].id); }, [usage, agent]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end', behavior: busy ? 'auto' : 'smooth' }); }, [msgs]);
  // swipe in from the left edge to open the menu (phones)
  useEffect(() => {
    let sx = 0, sy = 0, ok = false;
    const ts = (e: TouchEvent) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; ok = sx < 24 && innerWidth < 768; };
    const te = (e: TouchEvent) => { if (!ok) return; const t = e.changedTouches[0]; if (t.clientX - sx > 70 && Math.abs(t.clientY - sy) < 60) { haptic(6); setSidebar(true); } ok = false; };
    addEventListener('touchstart', ts, { passive: true }); addEventListener('touchend', te, { passive: true });
    return () => { removeEventListener('touchstart', ts); removeEventListener('touchend', te); };
  }, []);

  const name = prof?.displayName || user?.firstName || user?.name?.split(' ')[0] || '';

  const run = async (history: Msg[], id?: string): Promise<string> => {
    setBusy(true); stopRef.current = false;
    setMsgs([...history, { role: 'assistant', content: '' }]);
    let text = '';
    let stopped = false;
    const stopP = new Promise<'stop'>((res) => { stopFn.current = () => { stopped = true; res('stop'); }; });
    try {
      const s = chat({ messages: history, location: loc.label, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, model: agent, lat: loc.lat, lon: loc.lon, projectHtml: projRef.current.id ? projRef.current.html : undefined });
      const it = s[Symbol.asyncIterator]();
      while (true) {
        const r = await Promise.race([it.next(), stopP]);
        if (r === 'stop' || r.done) break;
        text += r.value;
        setMsgs([...history, { role: 'assistant', content: text }]);
      }
      if (stopped) it.return?.().catch(() => {});
      if (!stopped && !text.trim()) text = 'Sorry — I didn’t catch that. Try again?';
    } catch (e) {
      if (!stopped) text = text || 'Sorry — I’m having trouble connecting right now. Please try again.';
      console.error(e);
    } finally {
      if (stopped && !text) text = '_Stopped._';
      setMsgs([...history, { role: 'assistant', content: text }]);
      setBusy(false);
      stopFn.current = () => {};
    }
    const lim = /\[\[IMAGE_LIMIT:(\d+)\]\]/.exec(text);
    if (lim) { // server says the daily allowance is used up: drop this attempt and show the banner
      setMsgs(history.slice(0, -1)); setLimitAt(Number(lim[1])); refreshPlan();
      return text;
    }
    if (text.includes('[[PROJECT_LIMIT]]')) { // free plan already has 2 websites
      setMsgs(history.slice(0, -1)); setLimitProj(true); refreshProjects();
      return text;
    }
    if (/```image/.test(text)) refreshPlan();
    const all = [...history, { role: 'assistant' as const, content: text }];

    // ---- Projects: every finished website is stored; edits to an open project update it ----
    if (!stopped) {
      const html = HTML_RE.exec(text)?.[1].trimEnd();
      const done = !!html && /<\/html>/i.test(html);
      try {
        if (projRef.current.id) {
          const upd = done ? { html } : {};
          await saveProject({ id: projRef.current.id, messages: JSON.stringify(all), ...upd });
          if (done && html) {
            projRef.current.html = html;
            canvas.add({ id: hashId(html.slice(0, 400)), kind: 'web', title: /<title>([^<]*)<\/title>/i.exec(html)?.[1] || project?.title || 'Website', content: html }, false);
          }
          refreshProjects();
          return text;
        }
        if (done && html) {
          const t = /<title>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() || history[0]?.content.slice(0, 40) || 'Untitled website';
          const r = await saveProject({ title: t, html, messages: JSON.stringify(all) });
          projRef.current = { id: r.id, html };
          setProject({ id: r.id, title: r.title }); setChatId(undefined);
          toast.success(`Saved to Projects as “${r.title}”`);
          refreshProjects();
          return text;
        }
      } catch (e) {
        if (String(e).includes('PROJECT_LIMIT')) { setLimitProj(true); refreshProjects(); }
        else console.error(e);
      }
    }
    const title = history[0]?.content.slice(0, 48) || 'Image chat';
    try {
      const r = await saveChat({ id, title: id ? undefined : title, messages: JSON.stringify(all) });
      if (!id) setChatId(r.id);
      refresh();
      if (/```memory/.test(text)) profile({}).then(setProf);
    } catch { /* ignore */ }
    return text;
  };

  const latest = useRef({ msgs, chatId }); latest.current = { msgs, chatId };
  const send = (text: string, images: string[] = []): Promise<string> | false => {
    if (!images.length && imageIntent(text) && usage?.plan === 'free' && usage.remaining === 0 && usage.resetAt && usage.resetAt > Date.now()) {
      haptic(10); setLimitAt(usage.resetAt); return false;
    }
    if (!projRef.current.id && !isPro && !images.length && projLimit !== null && projects.length >= projLimit && !imageIntent(text) && websiteIntent(text)) {
      haptic(10); setLimitProj(true); return false;
    }
    haptic(8); setLimitAt(null); setLimitProj(false);
    return run([...latest.current.msgs, { role: 'user', content: text, images }], latest.current.chatId);
  };
  const open = async (id: string) => {
    if (isMobile()) setSidebar(false);
    projRef.current = { html: '' }; setProject(null);
    setChatId(id); setMsgs([]);
    try { const r = await getChat({ id }); setMsgs(JSON.parse(r.messages)); } catch { toast.error('Could not open chat'); }
  };
  const newChat = () => { projRef.current = { html: '' }; setProject(null); setChatId(undefined); setMsgs([]); setLimitProj(false); if (isMobile()) setSidebar(false); };
  const openProject = async (pr: { id: string; title: string }) => {
    setProjectsOpen(false); setLimitProj(false);
    if (isMobile()) setSidebar(false);
    setChatId(undefined); setMsgs([]);
    try {
      const r = await getProject({ id: pr.id });
      projRef.current = { id: r.id, html: r.html };
      setProject({ id: r.id, title: r.title });
      setMsgs(JSON.parse(r.messages));
      // the chat's own site chips load first; show the saved version last so it is the one on screen
      setTimeout(() => canvas.add({ id: hashId(r.html.slice(0, 400)), kind: 'web', title: r.title, content: r.html }, true), 80);
    } catch { toast.error('Could not open project'); }
  };
  const deleteProject = async (pr: { id: string; title: string }) => {
    try {
      await saveProject({ id: pr.id, remove: true });
      if (projRef.current.id === pr.id) newChat();
      await refreshProjects();
      toast.success(`Deleted “${pr.title}”`);
    } catch { toast.error('Could not delete project'); }
  };
  const cancelPro = async () => {
    setCancelling(true);
    try {
      const r = await plan({ action: 'cancel' });
      setUsage(r); setAgent(AGENTS[0].id); refreshProjects();
      toast.success('Subscription cancelled — you’re back on Free');
    } catch { toast.error('Could not cancel right now'); }
    finally { setCancelling(false); setCancelAsk(false); }
  };
  const regenerate = () => { const h = msgs.slice(0, -1); run(h, chatId); };
  const doSummary = async () => {
    setSummary(null);
    try { const r = await summarize({ transcript: msgs.map((m) => `${m.role}: ${m.content}`).join('\n') }); setSummary(r.points); } catch { setSummary(['Could not summarize right now.']); }
  };

  return (
    <div className="h-app fixed inset-x-0 top-0 flex overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 transition-[background] duration-500" style={{ background: wallCss(wall) }} />
      <AnimatePresence initial={false}>
        {sidebar && (
          <>
            <motion.div key="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebar(false)} className="fixed inset-0 z-30 bg-black/50 md:hidden" />
            <motion.div key="side" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 420, damping: 38, mass: 0.9 }} drag={isMobile() ? 'x' : false} dragDirectionLock dragConstraints={{ left: 0, right: 0 }} dragElastic={{ left: 0.6, right: 0 }} dragSnapToOrigin onDragEnd={(_, i) => { if (i.offset.x < -60 || i.velocity.x < -350) setSidebar(false); }} className="fixed inset-y-0 left-0 z-40 md:relative">
              <Sidebar chats={chats} activeId={chatId} userName={name} email={user?.email || ''} isPro={!!isPro} showPlan={!!usage} onUpgrade={() => { if (isMobile()) setSidebar(false); setUpgrade(true); }} onProjects={() => { if (isMobile()) setSidebar(false); refreshProjects(); setProjectsOpen(true); }} projectCount={projects.length} projectLimit={isPro ? null : projLimit} onNew={newChat} onOpen={open} onClose={() => setSidebar(false)} onSettings={() => setSettings(true)}
                onRename={async (c) => { const t = prompt('Rename chat', c.title); if (t) { await saveChat({ id: c.id, title: t }); refresh(); } }}
                onArchive={async (c) => { await saveChat({ id: c.id, archived: !c.archived }); refresh(); }}
                onDelete={async (c) => { await saveChat({ id: c.id, remove: true }); if (c.id === chatId) newChat(); refresh(); }}
                onShare={async (c) => { const r = await getChat({ id: c.id }); const t = (JSON.parse(r.messages) as Msg[]).map((m) => `${m.role === 'user' ? 'You' : 'Echo'}: ${m.content}`).join('\n\n'); await navigator.clipboard.writeText(t); toast.success('Conversation copied to share'); }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="relative flex min-w-0 flex-1 flex-col">
        <motion.header initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }} className="echo-topbar px-safe relative z-20 flex min-w-0 items-center gap-0.5 border-b border-foreground/[.07] bg-background pb-2 backdrop-blur-2xl">
          {!sidebar && <button aria-label="Open menu" onClick={() => setSidebar(true)} className="icon-btn"><PanelLeft className="h-5 w-5" /></button>}
          {!sidebar && <button aria-label="New chat" onClick={newChat} className="icon-btn"><SquarePen className="h-5 w-5" /></button>}
          <Logo className="ml-1 h-5 w-5 shrink-0" /><span className="ml-1.5 text-[15px] font-semibold tracking-tight">Echo</span>
          <div className="min-w-2 flex-1" />
          {usage && (isPro
            ? (
              <DropdownMenu>
                <DropdownMenuTrigger aria-label="Manage Echo Pro" className="rainbow-border mr-1 flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#111] px-4 text-[12px] font-semibold tracking-wide text-white shadow-[0_8px_28px_-12px_rgba(210,190,255,.45)] outline-none transition hover:bg-white/[.08] data-[state=open]:bg-white/[.12]">
                  <Crown className="h-3.5 w-3.5 text-white/80" /><span className="pro-text">ECHO PRO</span><ChevronDown className="h-3.5 w-3.5 text-white/55" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-2xl border-white/10 bg-[#101010]/95 p-2 text-white shadow-2xl backdrop-blur-2xl">
                  <div className="rounded-xl border border-white/10 bg-white/[.045] p-3"><div className="flex items-center gap-2"><Crown className="h-4 w-4 text-white/80" /><span className="pro-text text-sm font-semibold">Echo Pro active</span></div><p className="mt-1 text-xs leading-5 text-white/45">High-detail Cloudflare FLUX.2 Pro image generation with a Pollinations fallback.</p></div>
                  <DropdownMenuItem onClick={() => setUpgrade(true)} className="mt-1 rounded-xl py-2.5"><Sparkles className="mr-2.5 h-4 w-4" />Explore Pro features</DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={() => setCancelAsk(true)} className="rounded-xl py-2.5 text-red-300 focus:text-red-300"><CircleX className="mr-2.5 h-4 w-4" />Switch to Free</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
            : <button aria-label="Upgrade" onClick={() => setUpgrade(true)} className="rainbow-border mr-1 flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-[#111] px-4 text-xs font-semibold text-white shadow-[0_8px_28px_-12px_rgba(210,190,255,.4)] transition hover:bg-white/[.08] max-sm:w-10 max-sm:px-0"><Crown className="h-3.5 w-3.5" /><span className="pro-text max-sm:hidden">Upgrade to Pro</span></button>)}
          <button aria-label="Gmail inbox" onClick={() => setGmailOpen(true)} className="mr-1 flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full border border-foreground/10 bg-background/45 px-3.5 text-xs backdrop-blur-xl transition-colors hover:bg-accent max-sm:w-10 max-sm:px-0"><Mail className="h-4 w-4" /><span className="max-sm:hidden">Gmail</span></button>
          <button aria-label="Routines" onClick={() => setRoutines(true)} className="mr-1 flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full border border-foreground/10 bg-background/45 px-3.5 text-xs backdrop-blur-xl transition-colors hover:bg-accent max-sm:w-10 max-sm:px-0"><LayoutGrid className="h-4 w-4" /><span className="max-sm:hidden">Routines</span></button>
          {msgs.length >= 4 && <button aria-label="Summary" onClick={doSummary} className="glass flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full px-3.5 text-xs max-sm:w-10 max-sm:px-0"><ListChecks className="h-4 w-4" /><span className="max-sm:hidden">Summary</span></button>}
        </motion.header>

        <div className="scrollbar-none scroll-y flex-1">
          {msgs.length === 0 ? (
            <div className="home-hero px-safe mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center pb-6 pt-5 text-center">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 26 }}><Logo className="h-14 w-14" /></motion.div>
              <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl"><span className="text-white">{greeting()}</span>{name && <><span className="text-white/75">, </span><span className="pro-text">{name}</span></>}</motion.h1>
              <p className="mt-2 text-muted-foreground">{loc.status === 'ok' ? `Near ${loc.label.split('(')[0].split(',').slice(0, 2).join(',')}` : 'What can I do for you?'}</p>
              <div className="mt-8 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
                {SUGGESTIONS.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <motion.button key={s.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.035 + i * 0.025, duration: 0.2 }} onClick={() => send(s.query)} whileTap={{ scale: 0.985 }} className="no-press group flex min-h-[82px] items-center gap-3.5 rounded-[19px] border border-white/[.085] bg-white/[.025] px-4 py-3 text-left transition-colors duration-150 hover:border-white/20 hover:bg-white/[.055]">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border border-white/[.08] bg-white/[.045] text-white/75 transition-colors group-hover:bg-white/[.09] group-hover:text-white"><Icon className="h-[18px] w-[18px]" strokeWidth={1.65}/></span>
                      <span className="min-w-0 flex-1"><span className="block text-[9px] font-semibold tracking-[.18em] text-white/40">{s.label}</span><span className="mt-1 block text-[15px] font-semibold tracking-tight text-white">{s.title}</span><span className="mt-0.5 block text-[11px] text-white/40">{s.hint}</span></span>
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/[.09] text-white/45 transition group-hover:border-white/25 group-hover:text-white">↗</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="px-safe-4 mx-auto max-w-3xl space-y-6 py-4">
              {msgs.map((m, i) => {
                const last = i === msgs.length - 1;
                if (last && m.role === 'assistant' && !m.content && busy) return <Thinking key={i} />;
                return <Message key={i} m={m} last={last} streaming={busy && last} onRegenerate={regenerate} onQuick={(q) => send(q)} />;
              })}
              <div ref={endRef} className="h-4" />
            </div>
          )}
        </div>

        <div className="composer-dock pb-safe-bottom px-safe mx-auto w-full max-w-3xl pt-1">
          <AnimatePresence>
            {limitAt && limitAt > Date.now() && !isPro && (
              <motion.div key="limit" initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} transition={{ type: 'spring', stiffness: 420, damping: 32 }} className="relative mb-2.5 rounded-3xl border border-white/10 bg-neutral-900/90 px-5 pb-4 pt-4 text-center shadow-[0_20px_50px_-20px_rgba(0,0,0,.8)] backdrop-blur-xl">
                <button aria-label="Dismiss" onClick={() => setLimitAt(null)} className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full text-white/50 hover:bg-white/10"><X className="h-4 w-4" /></button>
                <p className="px-6 text-[15px] font-medium">You’ve reached your daily limit of photos.</p>
                <p className="mt-1 text-xs text-muted-foreground">Free accounts get 5 a day — your next ones unlock {formatReset(limitAt)}.</p>
                <button onClick={() => setUpgrade(true)} className="no-press mt-3.5 w-full rounded-full bg-[#2f7bff] py-3 text-[15px] font-semibold text-white shadow-[0_10px_30px_-10px_rgba(47,123,255,.8)] transition-colors hover:bg-[#4a8cff] active:bg-[#256ae0]">Upgrade now</button>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {limitProj && !isPro && (
              <motion.div key="plimit" initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} transition={{ type: 'spring', stiffness: 420, damping: 32 }} className="relative mb-2.5 rounded-3xl border border-white/10 bg-neutral-900/90 px-5 pb-4 pt-4 text-center shadow-[0_20px_50px_-20px_rgba(0,0,0,.8)] backdrop-blur-xl">
                <button aria-label="Dismiss" onClick={() => setLimitProj(false)} className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full text-white/50 hover:bg-white/10"><X className="h-4 w-4" /></button>
                <p className="px-6 text-[15px] font-medium">You’ve hit the limit of {FREE_PROJECT_LIMIT} websites on Free.</p>
                <p className="mt-1 text-xs text-muted-foreground">Delete a project to build a new one, or go Pro for unlimited websites.</p>
                <div className="mt-3.5 flex gap-2">
                  <button onClick={() => { refreshProjects(); setProjectsOpen(true); }} className="no-press flex-1 rounded-full border border-white/15 py-3 text-[14px] font-semibold hover:bg-white/5"><FolderKanban className="mr-1.5 inline h-4 w-4" />Open Projects</button>
                  <button onClick={() => setUpgrade(true)} className="no-press flex-1 rounded-full bg-white py-3 text-[14px] font-semibold text-black">Upgrade</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {project && (
            <div className="mb-2 flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] py-1.5 pl-3.5 pr-1.5 text-xs">
              <FolderKanban className="h-3.5 w-3.5 text-white/60" />
              <span className="min-w-0 flex-1 truncate text-white/70">Editing <span className="font-medium text-white">{project.title}</span> — describe a change and Echo updates it</span>
              <button onClick={newChat} className="rounded-full bg-white/10 px-3 py-1 font-medium hover:bg-white/15">Close</button>
            </div>
          )}
          <Composer busy={busy} onSend={send} onStop={() => { stopRef.current = true; stopFn.current(); }} agent={agent} setAgent={setAgent} isPro={!!isPro} onLocked={() => setUpgrade(true)} />
          <p className="mt-2 text-center text-[11px] text-muted-foreground transition-all [.kb_&]:hidden">Echo can make mistakes. Check important info.</p>
        </div>
      </main>
      <CanvasPanel />

      <UpgradeDialog open={upgrade} onClose={() => setUpgrade(false)} email={user?.email || ''} isPro={!!isPro}
        onUpgraded={(p) => { setUsage(p); setLimitAt(null); setAgent(PRO_MODEL); }} />
      <ProjectsDialog open={projectsOpen} onClose={() => setProjectsOpen(false)} projects={projects} limit={isPro ? null : projLimit} isPro={!!isPro} activeId={project?.id}
        onOpen={openProject} onDelete={deleteProject} onUpgrade={() => { setProjectsOpen(false); setUpgrade(true); }} />
      <AlertDialog open={cancelAsk} onOpenChange={setCancelAsk}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Echo Pro?</AlertDialogTitle>
            <AlertDialogDescription>You’ll go back to the Free plan: Echo and Echo Fast, 5 images a day and up to {FREE_PROJECT_LIMIT} websites. Your saved projects stay, but you won’t be able to build new ones until you’re under the limit.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Pro</AlertDialogCancel>
            <AlertDialogAction disabled={cancelling} onClick={(e) => { e.preventDefault(); cancelPro(); }}>{cancelling ? 'Cancelling…' : 'Cancel subscription'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <RoutinesSheet open={routines} onOpenChange={setRoutines} />
      <GmailSheet open={gmailOpen} onOpenChange={setGmailOpen} />
      <SettingsDialog open={settings} onOpenChange={setSettings} data={prof} onSaved={setProf} loc={loc} requestLoc={request} />
      <SummaryDialog open={summary !== undefined} onOpenChange={(o) => !o && setSummary(undefined)} points={summary ?? null} />
    </div>
  );
}
