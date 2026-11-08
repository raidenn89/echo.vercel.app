import { useEffect, useState } from 'react';

export type Loc = { label: string; lat?: number; lon?: number; status: 'idle' | 'loading' | 'ok' | 'denied' };

export function useLocation(enabled: boolean) {
  const [loc, setLoc] = useState<Loc>(() => {
    const c = localStorage.getItem('echo-loc');
    return c ? { ...JSON.parse(c), status: 'ok' } : { label: '', status: 'idle' };
  });

  const request = () => {
    if (!navigator.geolocation) return;
    setLoc((l) => ({ ...l, status: 'loading' }));
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        let label = `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&lat=${coords.latitude}&lon=${coords.longitude}`);
          const j = await r.json();
          const a = j.address || {};
          const parts = [a.building || a.amenity, a.road, a.neighbourhood || a.quarter || a.suburb, a.city || a.town || a.state, a.country].filter(Boolean);
          if (parts.length) label = parts.join(', ');
        } catch { /* keep coords */ }
        const next = { label: `${label} (lat ${coords.latitude.toFixed(5)}, lon ${coords.longitude.toFixed(5)}, ±${Math.round(coords.accuracy)}m)`, lat: coords.latitude, lon: coords.longitude };
        localStorage.setItem('echo-loc', JSON.stringify(next));
        setLoc({ ...next, status: 'ok' });
      },
      () => setLoc((l) => ({ ...l, status: 'denied' })),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  };

  useEffect(() => { if (enabled) request(); }, [enabled]);
  return { loc, request };
}
