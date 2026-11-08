import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Skeleton } from '@project/components/ui/skeleton';

export default function SummaryDialog({ open, onOpenChange, points }: { open: boolean; onOpenChange: (o: boolean) => void; points: string[] | null }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="m-sheet glass rounded-3xl sm:max-w-md">
        <DialogHeader><DialogTitle className="rainbow-text w-fit">Session summary</DialogTitle></DialogHeader>
        {points ? (
          <ul className="space-y-2.5 text-sm">
            {points.map((p) => <li key={p} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />{p}</li>)}
          </ul>
        ) : (
          <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-4 w-full" />)}</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
