import { toast } from 'sonner';

export type Reminder = { id: string; title: string; at: string };
const KEY = 'echo-reminders';
const timers = new Map<string, number>();

export const getReminders = (): Reminder[] => JSON.parse(localStorage.getItem(KEY) || '[]');
const save = (r: Reminder[]) => localStorage.setItem(KEY, JSON.stringify(r));

function fire(r: Reminder) {
  save(getReminders().filter((x) => x.id !== r.id));
  if ('Notification' in window && Notification.permission === 'granted') new Notification('Echo reminder', { body: r.title, icon: '/icon.svg' });
  toast(`⏰ ${r.title}`, { duration: 15000 });
  try { const a = new AudioContext(); const o = a.createOscillator(); o.frequency.value = 880; o.connect(a.destination); o.start(); o.stop(a.currentTime + 0.4); } catch { /* */ }
}

function arm(r: Reminder) {
  const ms = new Date(r.at).getTime() - Date.now();
  if (timers.has(r.id)) return;
  if (ms <= 0) return fire(r);
  if (ms < 2 ** 31) timers.set(r.id, window.setTimeout(() => fire(r), ms));
}

export async function addReminder(title: string, at: string) {
  if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
  const r = { id: `${title}|${at}`, title, at };
  if (getReminders().some((x) => x.id === r.id)) return;
  save([...getReminders(), r]);
  arm(r);
}

export function cancelReminder(id: string) {
  clearTimeout(timers.get(id)); timers.delete(id);
  save(getReminders().filter((x) => x.id !== id));
}

export function armAll() { getReminders().forEach(arm); }
