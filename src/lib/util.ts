export type Msg = { role: 'user' | 'assistant'; content: string; images?: string[] };

export function setupHead() {
  const set = (name: string, content: string, attr = 'name') => {
    let el = document.head.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
    if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
    el.content = content;
  };
  set('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
  set('apple-mobile-web-app-capable', 'yes');
  set('mobile-web-app-capable', 'yes');
  set('apple-mobile-web-app-title', 'Echo');
  // Keep the home-screen icons the platform generated; only fix a missing favicon.
  const icon = document.head.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
  if (!icon) { const l = document.createElement('link'); l.rel = 'icon'; l.href = '/icon.svg'; document.head.appendChild(l); }
  else if (/vite\.svg$/.test(icon.getAttribute('href') || '')) icon.href = '/icon.svg';
  document.title = 'Echo';
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => { if (document.documentElement.classList.contains('pwa') && (e.target as HTMLElement)?.tagName === 'IMG') e.preventDefault(); });
}

function syncChrome(dark: boolean) {
  const set = (name: string, content: string) => {
    let el = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
    if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
    el.content = content;
  };
  // Let the browser's status and navigation chrome blend into the active Echo theme.
  set('apple-mobile-web-app-status-bar-style', 'black-translucent');
  set('theme-color', dark ? '#000000' : '#fafafa');
  document.documentElement.style.backgroundColor = dark ? '#000000' : '#fafafa';
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

export function applyTheme(t: string) {
  const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  localStorage.setItem('echo-theme', t);
  syncChrome(dark);
}

export function bucket(iso: string, archived: boolean) {
  if (archived) return 'Archived';
  const d = new Date(iso); const now = new Date();
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = (day(now) - day(d)) / 864e5;
  if (diff < 1) return 'Today';
  if (diff < 2) return 'Yesterday';
  if (diff < 8) return 'Previous 7 Days';
  return 'Older';
}

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

