import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock, { ArtifactChip, LiveCtx } from './CodeBlock';
import { hashId } from './Canvas';
import ChatImage from './ChatImage';
import { ReminderCard, CalendarCard, EmailCard, ImageCard, MapCard, SpotifyCard, YouTubeCard } from './Cards';

const CARDS = ['reminder', 'map', 'image', 'pollinations', 'spotify', 'youtube', 'email', 'calendar', 'dashboard'];
const MEMORY_RE = new RegExp('```memory[\\s\\S]*?(```|$)', 'g');

function Card({ lang, raw }: { lang: string; raw: string }) {
  let d: any;
  try { d = JSON.parse(raw); } catch {
    if (lang === 'dashboard') return <ArtifactChip task={{ id: hashId(raw.slice(0, 200)), kind: 'dashboard', title: 'Dashboard', content: raw }} complete={false} />;
    if (lang === 'pollinations') return <div className="shimmer-line my-3 aspect-square w-full max-w-md animate-pulse rounded-3xl border border-white/10 bg-neutral-950" />;
    return <div className="glass shimmer-line my-3 h-28 animate-pulse rounded-2xl" />;
  }
  switch (lang) {
    case 'reminder': return <ReminderCard {...d} />;
    case 'map': return <MapCard {...d} />;
    case 'image': return <ImageCard {...d} />;
    case 'pollinations': return <ImageCard {...d} />;
    case 'spotify': return <SpotifyCard {...d} />;
    case 'youtube': return <YouTubeCard {...d} />;
    case 'email': return <EmailCard {...d} />;
    case 'calendar': return <CalendarCard {...d} />;
    default: return <ArtifactChip task={{ id: hashId(raw.slice(0, 200)), kind: 'dashboard', title: d.title || 'Dashboard', content: raw }} complete />;
  }
}

const Img = (props: { src?: string; alt?: string }) => <ChatImage src={props.src} alt={props.alt} />;

function Markdown({ text, last = false, streaming = false }: { text: string; last?: boolean; streaming?: boolean }) {
  const clean = text.replace(MEMORY_RE, '').replace(/\[\[IMAGE_LIMIT:\d+\]\]/g, '').replace(/!\[[^\]]*(\]\([^)]*)?$/, '').trim();
  return (
    <LiveCtx.Provider value={{ last, streaming }}>
    <div className="prose prose-neutral max-w-none text-[15px] leading-7 dark:prose-invert prose-p:my-2 prose-li:my-0.5 prose-strong:font-semibold prose-a:text-[#9cc3ff]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => <>{children}</>,
          img: Img,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer">{children}</a>,
          code: ({ className, children }) => {
            const lang = /language-(\w+)/.exec(className || '')?.[1];
            const raw = String(children).trimEnd();
            if (!lang && !raw.includes('\n')) return <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[13px] before:content-none after:content-none">{children}</code>;
            if (lang && CARDS.includes(lang)) return <Card lang={lang} raw={raw} />;
            return <CodeBlock lang={lang || ''} code={raw} />;
          },
        }}
      >
        {clean}
      </ReactMarkdown>
    </div>
    </LiveCtx.Provider>
  );
}

export default memo(Markdown);
