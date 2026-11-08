// Shared by the browser and the endpoints — keep this file free of browser/DOM globals at module scope.

export const FREE_IMAGE_LIMIT = 5;
export const DAY_MS = 86_400_000;
export const PRO_PRICE_AED = 23;
export const PRO_MODEL = 'gemini-3.1-pro-preview';
/** Fast model that streams quickly; Pro runs it with high thinking so code and sites come out better and sooner. */
export const FAST_MODEL = 'gemini-3.1-flash-lite';
export const FREE_PROJECT_LIMIT = 2;

/** Does this message ask Echo to build a website / app / game (something that becomes a Project)? */
export function websiteIntent(text: string): boolean {
  const s = text.toLowerCase();
  return /\b(build|make|create|design|code|write|generate|develop)\b[^.?!]{0,70}\b(websites?|web ?sites?|web ?pages?|landing pages?|web ?apps?|apps?|games?|portfolios?|calculators?|clones?|stores?|shops?)\b/.test(s);
}

/** Free-plan image allowance. The window starts when the 5th image is made, so hitting the limit at 5 PM resets at 5 PM tomorrow. Pro = unlimited. */
export type ImageState = { log: number[]; lockedUntil?: number };

export function readState(raw: string | null | undefined, now: number): ImageState {
  let s: ImageState = { log: [] };
  try {
    const j = JSON.parse(raw || '{}');
    if (j && Array.isArray(j.log)) {
      s = { log: j.log.filter((n: unknown) => typeof n === 'number'), lockedUntil: typeof j.lockedUntil === 'number' ? j.lockedUntil : undefined };
    }
  } catch { /* empty state */ }
  if (s.lockedUntil) return now >= s.lockedUntil ? { log: [] } : s;
  return { log: s.log.filter((t) => now - t < DAY_MS) };
}

export function addImage(s: ImageState, now: number): ImageState {
  const log = [...s.log, now];
  return log.length >= FREE_IMAGE_LIMIT ? { log, lockedUntil: now + DAY_MS } : { log };
}

export function summarize(plan: string, s: ImageState) {
  const pro = plan === 'pro';
  return {
    plan: (pro ? 'pro' : 'free') as 'pro' | 'free',
    used: s.log.length,
    limit: pro ? null : FREE_IMAGE_LIMIT,
    remaining: pro ? null : Math.max(0, FREE_IMAGE_LIMIT - s.log.length),
    resetAt: !pro && s.lockedUntil ? s.lockedUntil : null,
  };
}

const NOUN = '(?:images?|pictures?|pics?|photos?|photographs?|wallpapers?|artworks?|illustrations?|portraits?|posters?|drawings?|paintings?|renders?|avatars?|thumbnails?)';

/** Does this message ask Echo to make a video / clip? */
export function videoIntent(text: string): boolean {
  const s = text.toLowerCase().trim();
  if (!s || s.length > 600) return false;
  if (/\b(video editor|youtube channel|video app|video website|video call)\b/.test(s)) return false;
  if (/\b(create|generate|make|render|produce|shoot|film)\b[^.?!]{0,40}\b(videos?|clips?|cinematics?|animations?|mp4s?)\b/.test(s)) return true;
  if (/^(an?\s+)?(short\s+)?(videos?|clips?)\s+(of|showing|with)\b/.test(s)) return true;
  if (/\b(animate|animation of)\b/.test(s)) return true;
  return false;
}

/** Does this message ask Echo to make a picture? */
export function imageIntent(text: string): boolean {
  const s = text.toLowerCase().trim();
  if (!s || s.length > 600) return false;
  // A website that contains photography is still a website request. Only an
  // explicitly requested picture/photo should take precedence over website intent.
  const explicitImageRequest = /^(?:please\s+)?(?:(?:can|could|would)\s+you\s+)?(?:create|generate|make|draw|paint|illustrate|render)\s+(?:(?:me|us)\s+)?(?:an?\s+)?(?:photorealistic\s+|realistic\s+|cinematic\s+)?(?:image|picture|photo|photograph|wallpaper|portrait|poster|drawing|painting)\b/.test(s);
  if (websiteIntent(s) && !explicitImageRequest) return false;
  if (/^(explain|how|what|why|when|who|where|which|does|do|is|are|tell me about|describe)\b/.test(s) && !new RegExp(`\\b(of|showing)\\b`).test(s)) return false;
  if (/\b(?:photo|image|picture)\s+(?:editor|gallery|app|website|upload|viewer|resizer|converter|compress)/.test(s)) return false;
  if (/\b(html|css|javascript|react|python|website|web ?page|landing page|code|script|svg|canvas|dashboard)\b/.test(s) && !new RegExp(`\\b${NOUN}\\b`).test(s)) return false;
  if (/^(draw|sketch|paint|illustrate|imagine)\b/.test(s)) return true;
  if (/\b(draw|sketch|paint|illustrate)\s+(me\s+|us\s+)?(an?|the|my|some|this|that|two|three|four)\b/.test(s)) return true;
  if (new RegExp(`\\b(create|generate|make|produce|design|render|show|give|get|send|need|want|build)\\b[^.?!]{0,50}\\b${NOUN}\\b`).test(s)) return true;
  if (new RegExp(`^(an?\\s+)?${NOUN}\\s+(of|showing|with)\\b`).test(s)) return true;
  return false;
}

/** Pick a canvas shape from what the person asked for. */
export function aspectOf(t: string): { w: number; h: number } {
  const s = t.toLowerCase();
  if (/\b(portrait|poster|phone wallpaper|iphone wallpaper|story|9:16|vertical|tall|flyer)\b/.test(s)) return { w: 720, h: 1280 };
  if (/\b(landscape|wide|banner|cover|header|16:9|desktop wallpaper|cinematic|panorama|panoramic|widescreen)\b/.test(s)) return { w: 1280, h: 720 };
  return { w: 1024, h: 1024 };
}

/** "tomorrow at 5:00 PM" in the viewer's own timezone. */
export function formatReset(ts: number): string {
  const d = new Date(ts), n = new Date();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const same = d.toDateString() === n.toDateString();
  const tmr = new Date(n.getTime() + DAY_MS).toDateString() === d.toDateString();
  return `${same ? 'today' : tmr ? 'tomorrow' : d.toLocaleDateString([], { weekday: 'long' })} at ${time}`;
}
