export const WALLPAPERS: { id: string; label: string; css: string }[] = [
  { id: 'none', label: 'Black', css: 'none' },
  { id: 'aurora', label: 'Aurora', css: 'radial-gradient(60% 50% at 20% 10%, rgba(120,150,255,.35), transparent), radial-gradient(50% 50% at 90% 30%, rgba(255,120,200,.28), transparent), radial-gradient(60% 60% at 50% 110%, rgba(120,255,200,.2), transparent)' },
  { id: 'sunset', label: 'Sunset', css: 'radial-gradient(70% 60% at 80% 0%, rgba(255,140,90,.4), transparent), radial-gradient(60% 50% at 0% 100%, rgba(200,80,180,.35), transparent)' },
  { id: 'ocean', label: 'Ocean', css: 'radial-gradient(80% 60% at 50% 0%, rgba(60,140,255,.4), transparent), radial-gradient(50% 50% at 100% 100%, rgba(40,220,220,.25), transparent)' },
  { id: 'dubai', label: 'Dubai Night', css: 'linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.75)), url(https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&q=70) center/cover' },
  { id: 'mono', label: 'Graphite', css: 'radial-gradient(70% 70% at 50% 0%, rgba(255,255,255,.12), transparent)' },
  { id: 'forest', label: 'Forest', css: 'linear-gradient(rgba(0,0,0,.6), rgba(0,0,0,.78)), url(https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&q=70) center/cover' },
  { id: 'iris', label: 'Iris', css: 'conic-gradient(from 200deg at 50% 40%, rgba(130,160,255,.3), rgba(200,140,255,.3), rgba(255,150,200,.25), rgba(130,160,255,.3))' },
];

export const getWallpaper = () => localStorage.getItem('echo-wall') || 'none';
export const wallCss = (id: string) => WALLPAPERS.find((w) => w.id === id)?.css || 'none';
