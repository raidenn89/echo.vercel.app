export type Routine = { title: string; stats?: { label: string; value: string }[]; items?: string[]; chart?: { label: string; value: number }[] };
const K = 'echo-routines';
export const getRoutines = (): Routine[] => JSON.parse(localStorage.getItem(K) || '[]');
export const isSaved = (t: string) => getRoutines().some((r) => r.title === t);
export function toggleRoutine(r: Routine) {
  const all = getRoutines();
  const has = all.some((x) => x.title === r.title);
  localStorage.setItem(K, JSON.stringify(has ? all.filter((x) => x.title !== r.title) : [r, ...all]));
  dispatchEvent(new Event('echo-routines'));
  return !has;
}
