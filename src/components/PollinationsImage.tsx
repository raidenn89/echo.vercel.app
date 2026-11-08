import { useEffect, useState } from 'react';
import { Download, Maximize2, RefreshCw, ImageOff } from 'lucide-react';
import { generateImage } from 'zitejs/api';
import { resolveGeneratedImage } from '../lib/imageGeneration';

type Ratio = '1:1' | '16:9' | '9:16';

export default function PollinationsImage({ prompt, alt, w = 1024, h = 1024, seed: first }: { prompt: string; alt?: string; w?: number; h?: number; seed?: number }) {
  const [seed, setSeed] = useState(first ?? Math.floor(Math.random() * 900000) + 100000);
  const [src, setSrc] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ratio: Ratio = w > h ? '16:9' : h > w ? '9:16' : '1:1';

  useEffect(() => {
    let cancelled = false;
    setBusy(true); setError(''); setLoaded(false); setSrc('');
    generateImage({ prompt, variant: seed, aspectRatio: ratio, imageSize: '1K' })
      .then(async (result) => {
        if (!result.allowed) {
          dispatchEvent(new CustomEvent('echo-limit', { detail: result.resetAt }));
          throw new Error('You have reached today’s Free image limit (5/day).');
        }
        dispatchEvent(new CustomEvent('echo-plan', { detail: result }));
        const imageUrl = await resolveGeneratedImage(result, () => cancelled);
        if (!cancelled && imageUrl) setSrc(imageUrl);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Image generation failed.'); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [prompt, seed, ratio]);

  const retry = () => { setSeed(Math.floor(Math.random() * 900000) + 100000); };
  return (
    <span
      className={`group relative my-3 block w-full max-w-sm overflow-hidden rounded-2xl border border-white/[.08] bg-black shadow-[0_16px_40px_-28px_rgba(0,0,0,.95)] ${w > h ? 'sm:max-w-md' : 'sm:max-w-sm'}`}
      style={{ aspectRatio: `${w} / ${h}` }}
    >
      {(busy || (src && !loaded)) && (
        <span className="absolute inset-0 grid place-items-center bg-black">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-white/45" />
        </span>
      )}
      {src && (
        <img
          src={src}
          alt={alt || prompt}
          width={w}
          height={h}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError('The generated image could not be displayed.')}
          className={`h-full w-full object-contain ${loaded ? 'reveal' : 'opacity-0'}`}
        />
      )}
      {error && (
        <span role="alert" className="absolute inset-0 grid place-items-center bg-black p-4 text-center text-[11px] text-white/60">
          <span className="flex max-w-[15rem] flex-col items-center gap-2.5">
            <ImageOff className="h-5 w-5 text-white/35" />
            <span className="leading-5">{error}</span>
            <button onClick={retry} disabled={busy} className="rounded-full bg-white px-3.5 py-1.5 text-[11px] font-semibold text-black disabled:opacity-50">
              Try again
            </button>
          </span>
        </span>
      )}
      {src && loaded && (
        <span className="absolute inset-x-1.5 bottom-1.5 flex justify-around rounded-xl border border-white/10 bg-black/80 py-2 text-[10px] text-white/70 opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          <a href={src} target="_blank" rel="noreferrer" className="flex items-center gap-1"><Maximize2 className="h-3 w-3" />Open</a>
          <button onClick={retry} disabled={busy} className="flex items-center gap-1"><RefreshCw className="h-3 w-3" />Redo</button>
          <a href={src} download="echo-image.png" className="flex items-center gap-1"><Download className="h-3 w-3" />Save</a>
        </span>
      )}
    </span>
  );
}
