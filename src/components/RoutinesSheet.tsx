import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@project/components/ui/sheet';
import DashboardCard from './DashboardCard';
import { getRoutines, type Routine } from '../lib/routines';

export default function RoutinesSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [list, setList] = useState<Routine[]>(getRoutines);
  useEffect(() => { const h = () => setList(getRoutines()); addEventListener('echo-routines', h); return () => removeEventListener('echo-routines', h); }, []);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="scroll-y w-full border-white/10 bg-black pb-[calc(var(--sab,0px)+1.5rem)] pt-[calc(var(--sat,0px)+1.5rem)] sm:max-w-lg [&>button]:top-[calc(var(--sat,0px)+1rem)] [&>button]:p-2">
        <SheetHeader><SheetTitle>My routines</SheetTitle></SheetHeader>
        {list.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">No saved routines yet. Ask Echo to “build a weekly gym routine” and tap Save.</p>
        ) : (
          <div className="mt-4 space-y-4">{list.map((r) => <DashboardCard key={r.title} {...r} />)}</div>
        )}
      </SheetContent>
    </Sheet>
  );
}
