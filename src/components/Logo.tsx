import { cn } from '@project/components/lib/utils';

export default function Logo({ className, animated }: { className?: string; animated?: boolean }) {
  return <img src="/echo-mark.svg" alt="Echo" draggable={false} className={cn('block shrink-0 object-contain', animated && 'animate-pulse', className)} />;
}
