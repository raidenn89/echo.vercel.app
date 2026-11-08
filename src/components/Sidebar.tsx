import { useState } from 'react';
import { motion } from 'framer-motion';
import { Ellipsis, SquarePen, Settings2, PanelLeftClose, FolderKanban, Pencil, Share, Archive, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@project/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@project/components/ui/alert-dialog';
import type { ListChatsOutputType } from 'zitejs/api';
import { bucket } from '../lib/util';
import Logo from './Logo';
type Chat = ListChatsOutputType['chats'][0];
type Props = {
  chats: Chat[];
  activeId?: string;
  userName: string;
  email: string;
  isPro: boolean;
  showPlan: boolean;
  onUpgrade: () => void;
  onProjects: () => void;
  projectCount: number;
  projectLimit: number | null;
  onNew: () => void;
  onOpen: (id: string) => void;
  onClose: () => void;
  onSettings: () => void;
  onRename: (c: Chat) => void;
  onArchive: (c: Chat) => void;
  onDelete: (c: Chat) => void;
  onShare: (c: Chat) => void;
};
const ORDER = ['Today', 'Yesterday', 'Previous 7 Days', 'Older', 'Archived'];
export default function Sidebar(p: Props) {
  const [del, setDel] = useState<Chat | null>(null);
  const groups = ORDER.map(g => [g, p.chats.filter(c => bucket(c.updatedAt, c.archived) === g)] as const).filter(([, l]) => l.length);
  return <aside className="pt-sat flex h-full w-[min(86vw,310px)] flex-col border-r border-white/[.06] bg-sidebar/90 backdrop-blur-2xl md:w-[272px] md:bg-sidebar/70">
      <div className="flex items-center gap-2 py-2 pl-4 pr-2">
        <Logo className="h-6 w-6" /><span className="text-[17px] font-semibold tracking-tight">Echo</span>
        <button onClick={p.onClose} aria-label="Close menu" className="icon-btn ml-auto"><PanelLeftClose className="h-[18px] w-[18px]" /></button>
      </div>
      <div className="space-y-0.5 px-2 pb-3">
        <button onClick={p.onNew} className="no-press flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors hover:bg-accent active:bg-accent md:py-2"><SquarePen className="h-[18px] w-[18px]" strokeWidth={1.75} />New chat</button>
        <button onClick={p.onProjects} className="no-press flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors hover:bg-accent active:bg-accent md:py-2">
          <FolderKanban className="h-[18px] w-[18px]" strokeWidth={1.75} />Projects
          <span className="ml-auto rounded-full bg-white/[.07] px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{p.projectLimit ? `${p.projectCount}/${p.projectLimit}` : p.projectCount}</span>
        </button>
      </div>
      <div className="scrollbar-none flex-1 overflow-y-auto px-2 pb-4">
        {groups.map(([g, list]) => <div key={g} className="mb-3">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{g}</div>
            {list.map(c => <motion.div layout initial={{
          opacity: 0,
          x: -10
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          type: 'spring',
          stiffness: 500,
          damping: 40
        }} key={c.id} className={`group flex items-center rounded-xl text-sm ${c.id === p.activeId ? 'bg-accent' : 'hover:bg-accent/60'}`}>
                <button onClick={() => p.onOpen(c.id)} className="no-press flex min-w-0 flex-1 items-center gap-2 px-2.5 py-3 text-left md:py-2">
                  <span className="truncate">{c.title}</span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger className="mr-1 grid h-9 w-9 place-items-center rounded-full opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 max-md:opacity-100 md:h-7 md:w-7 md:rounded-md"><Ellipsis className="h-4 w-4" /></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => p.onRename(c)}><Pencil className="mr-2 h-4 w-4" />Rename</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => p.onShare(c)}><Share className="mr-2 h-4 w-4" />Share</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => p.onArchive(c)}><Archive className="mr-2 h-4 w-4" />{c.archived ? 'Unarchive' : 'Archive'}</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => setDel(c)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>)}
          </div>)}
      </div>
      {p.showPlan && (p.isPro ? <button onClick={p.onUpgrade} aria-label="Echo Pro is active — view benefits" className='no-press rainbow-border group relative mx-3 mb-3 overflow-hidden p-3.5 text-left transition-transform active:scale-[.985] text-sm rounded-[10px] bg-[#000000]'>
          <span className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(160,180,255,.3),transparent_70%)]" />
          <span className="pointer-events-none absolute -bottom-14 -left-8 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(255,170,220,.16),transparent_70%)]" />
          <span className="relative flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/[.06] ring-1 ring-white/15"><Logo className="h-6 w-6" /></span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-[15px] font-semibold tracking-tight"><span className="pro-text">Echo Pro</span>
                <span className="flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[9px] font-bold tracking-wider text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.9)]" />ACTIVE</span>
              </span>
              <span className="mt-0.5 block text-[11px] leading-4 text-white/50">Unlimited projects · HD photos · Faster thinking</span>
            </span>
          </span>
        </button> : <button onClick={p.onUpgrade} className="no-press mx-3 mb-3 rounded-2xl border border-white/15 bg-black py-3.5 text-center text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,.04)] transition-colors hover:border-white/30 hover:bg-neutral-950 active:scale-[.985]">
          Upgrade to Pro
        </button>)}
      <div className="pb-safe-bottom flex items-center gap-3 border-t border-white/[.06] px-3 pt-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-white to-neutral-400 text-sm font-semibold text-black ring-2 ring-white/10 shadow-[0_0_20px_rgba(255,255,255,.25)]">{(p.userName || p.email)[0]?.toUpperCase()}</div>
        <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5 truncate text-sm font-medium">{p.userName || 'You'}{p.isPro && <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider"><span className="pro-text">PRO</span></span>}</div><div className="truncate text-xs text-muted-foreground">{p.email}</div></div>
        <button onClick={p.onSettings} aria-label="Settings" className="icon-btn"><Settings2 className="h-[18px] w-[18px]" strokeWidth={1.75} /></button>
      </div>
      <AlertDialog open={!!del} onOpenChange={o => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete “{del?.title}”?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => {
            if (del) p.onDelete(del);
            setDel(null);
          }}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>;
}