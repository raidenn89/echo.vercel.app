import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@project/components/ui/sheet';
import { Input } from '@project/components/ui/input';
import { Search, Mail, RefreshCw, ExternalLink, Inbox, Loader2 } from 'lucide-react';
import { gmailInbox } from 'zitejs/api';
import { toast } from 'sonner';

type MailItem = { id: string; threadId: string; from: string; subject: string; date: string; snippet: string; unread: boolean };

export default function GmailSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [items, setItems] = useState<MailItem[]>([]);
  const [email, setEmail] = useState('');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const load = async (q = '') => {
    setBusy(true);
    try {
      const r = await gmailInbox({ query: q.trim() || undefined, maxResults: 15 });
      setItems(r.messages); setEmail(r.emailAddress); setSearched(true);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not load Gmail'); }
    finally { setBusy(false); }
  };
  useEffect(() => { if (open && !searched) load(); }, [open]);
  const submit = (e: React.FormEvent) => { e.preventDefault(); load(query); };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="scroll-y w-full border-white/10 bg-background/95 pb-[calc(var(--sab,0px)+1.5rem)] pt-[calc(var(--sat,0px)+1.5rem)] backdrop-blur-2xl sm:max-w-xl">
        <SheetHeader className="text-left">
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><Mail className="h-4 w-4"/> Connected Gmail</div>
          <SheetTitle className="text-2xl">Inbox</SheetTitle>
          {email && <p className="text-xs text-muted-foreground">{email}</p>}
        </SheetHeader>
        <form onSubmit={submit} className="mt-5 flex gap-2">
          <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search emails, senders, subjects…" className="h-11 rounded-xl border-border/70 bg-muted/50 pl-9"/></div>
          <button disabled={busy} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-foreground text-background disabled:opacity-50" aria-label="Search Gmail">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<Search className="h-4 w-4"/>}</button>
          <button type="button" onClick={()=>load(query)} disabled={busy} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border/70" aria-label="Refresh inbox"><RefreshCw className="h-4 w-4"/></button>
        </form>
        <div className="mt-5 space-y-2">
          {busy && items.length===0 ? <div className="grid place-items-center py-16 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin"/></div> :
           items.length===0 ? <div className="grid place-items-center gap-2 py-16 text-center text-muted-foreground"><Inbox className="h-8 w-8 opacity-50"/><p className="text-sm">{searched?'No matching emails':'Your inbox will appear here'}</p></div> :
           items.map(m=><a key={m.id} href={`https://mail.google.com/mail/u/0/#all/${encodeURIComponent(m.id)}`} target="_blank" rel="noreferrer" className="group block rounded-2xl border border-border/70 bg-card/75 p-3.5 transition-colors hover:bg-accent/60">
             <div className="flex items-start gap-2"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${m.unread?'bg-blue-400':'bg-transparent'}`}/><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className={`truncate text-sm ${m.unread?'font-semibold':'font-medium'}`}>{m.subject}</p><span className="shrink-0 text-[10px] text-muted-foreground">{m.date?new Date(m.date).toLocaleDateString():''}</span></div><p className="mt-1 truncate text-xs text-muted-foreground">{m.from}</p><p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground/85">{m.snippet}</p></div><ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"/></div>
           </a>)}
        </div>
        <p className="mt-5 text-center text-[10px] text-muted-foreground">Opening a message takes you to Gmail. Echo only reads message summaries when you ask.</p>
      </SheetContent>
    </Sheet>
  );
}