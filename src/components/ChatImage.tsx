import { ImageCard } from './Cards';

/** Pollinations images are generated through Echo's authenticated server endpoint,
 * never by an unauthenticated browser request to a legacy image host. */
export default function ChatImage({ src, alt }: { src?: string; alt?: string }) {
  if (!src) return null;
  try {
    const u = new URL(src);
    if (/(^|\.)pollinations\.ai$/i.test(u.hostname)) {
      const tail = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '');
      const prompt = (alt || tail.replace(/^prompt\//, '').replace(/_\d{5}$/, '').replace(/_/g, ' ')).trim();
      return prompt ? <ImageCard prompt={prompt} /> : null;
    }
  } catch { /* Render ordinary image URLs below. */ }
  return <img src={src} alt={alt || ''} loading="lazy" className="my-3 max-w-full rounded-2xl border border-white/10" />;
}
