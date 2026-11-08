import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { integrations } from 'zitejs/integrations';
import { zite } from 'zitejs/db';
import { GoogleGenerativeAI, type Part } from '@google/generative-ai';
import { DAY_MS, FAST_MODEL, FREE_IMAGE_LIMIT, FREE_PROJECT_LIMIT, PRO_MODEL, aspectOf, imageIntent, readState, websiteIntent } from '../lib/plan';

const WEB_FREE = `WEBSITE STUDIO QUALITY STANDARD — Free users still deserve a real, carefully designed result. Do not output a generic template. First infer the product, audience and visual direction from the brief. Create a distinctive visual system with CSS variables, intentional typography, spacing, colour, responsive grids and strong contrast. Build a complete, self-contained HTML document with a compelling hero, clear navigation, useful content sections, relevant imagery, trust/details, and a finished footer. Use realistic copy tailored to the brief, never lorem ipsum, fake testimonials or filler. Every visible control must work: navigation, accordions, tabs, filters, forms, menus and calls to action. Add subtle transitions and accessible focus states. Use semantic HTML, keyboard support, reduced-motion handling and mobile-first responsive CSS. Keep JS modular, defensive and readable; validate forms and show honest success/error states. Prefer stable Unsplash image URLs or CSS/SVG illustration over broken image services; provide descriptive alt text and graceful fallbacks. Never claim a backend action happened when the page only simulates it. The result must be a complete page, not a wireframe. Websites are saved automatically to Projects — after the HTML block add one line: Saved to **Projects** as “<the page title>”.`;
const WEB_PRO = `ECHO PRO CREATIVE ENGINE — deliver agency-grade, production-minded websites and applications with a distinctive art direction, not a reskinned template. Produce unusually polished visual systems and robust, complete implementations, not generic starter templates. Think like a senior product designer, creative director and staff frontend engineer working together. Before writing code, infer the product, audience, key user journey and conversion goal. Choose a coherent concept, brand voice, visual motif, palette, typography pair, spacing scale and component system. Make the first viewport feel unmistakably designed for this exact brief. Build a full, polished experience: custom hero composition, considered navigation, rich content hierarchy, product/feature storytelling, proof or editorial content where appropriate, pricing/catalogue/gallery when relevant, FAQs, contact and a deliberate footer. Use high-quality, relevant photography and editorial crops; use CSS/SVG for custom graphics and icons. Avoid repetitive card grids and default gradients. Make every interaction functional: real client-side search/filter/sort, stateful tabs, accessible accordions, form validation, menu states, cart or calculator logic when requested, and useful empty/loading/success states. Add restrained motion with IntersectionObserver, hover/focus feedback, reduced-motion support and no layout-shift-heavy animation. Build responsive layouts for narrow phones through wide desktop. Write maintainable, defensive JavaScript with clear functions, sensible state, validation and error handling. No TODOs, fake API claims, lorem ipsum, dead buttons or placeholder copy. For multi-page apps, provide working in-page navigation and coherent page states within the single document. Use real external image assets only when relevant, with descriptive alt text and robust fallbacks. If a feature requires a server, payment provider, authentication or API key not available in this environment, explain the limitation in the UI rather than pretending it works. Contact forms must validate and clearly explain whether they open an email draft or submit to a connected backend. For games: polished canvas or DOM game loop, score/lives UI, keyboard and touch controls, start/pause/restart, and satisfying feedback. For dashboards: clear KPI hierarchy, meaningful charts, filters, and actionable empty states — not a generic admin template. The Pro result must feel a clear step above Free in polish and completeness. Websites are saved automatically to Projects — after the HTML block add one line: Saved to **Projects** as “<the page title>”.`;

const Msg = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  images: z.array(z.string()).optional(),
});

function systemPrompt(o: { name: string; now: string; tz: string; location: string; profile: Record<string, string>; web: string }) {
  return `You are Echo, a sharp, warm personal AI assistant.
Current date/time: ${o.now} (${o.tz}). It is the year ${new Date().getFullYear()}. Never claim it is an earlier year.
User: ${o.name || 'unknown'}. Location: ${o.location || o.profile.homeCity || 'unknown'}.
Persona/tone to use: ${o.profile.persona || 'friendly, concise'}. Keep using it until told otherwise.
Food preferences: ${o.profile.foodPreferences || 'unknown'}. Goals: ${o.profile.goals || 'none'}. Memory: ${o.profile.memory || 'none'}.

STYLE: Answer immediately — no preamble. Chat like a person. Short replies. Greetings get one line. Use **bold** for key words, short bullets for options. No long paragraphs unless asked.
REASONING & MULTI-AGENT ORCHESTRATION: For complex requests, silently decompose the goal into independent workstreams (research, planning, implementation, verification) and run independent connected-data lookups in parallel where possible. Reconcile conflicting results, check assumptions and edge cases, then deliver one coherent answer. Do not expose private chain-of-thought; provide concise conclusions, key assumptions and verification. For multi-part requests, complete all requested parts rather than answering only the easiest one. Prioritise low latency: avoid unnecessary tool calls, use the fastest adequate model, stream as soon as useful, and do not repeat work already completed.
GMAIL INTEGRATION: A connected Gmail account is available. When Gmail search results are supplied below, use them to answer requests about recent messages, senders, subjects or summaries. Never invent emails. Draft emails for review; only send after the user explicitly asks to send and confirms the final recipient, subject and body. You may search and summarise emails when asked, but never delete, archive, forward or alter mailbox state without explicit instruction.

RICH CARDS — emit fenced blocks when useful (one JSON object per block):
\`\`\`map
{"query":"pizza near Dubai Marina","title":"Pizza nearby","places":[{"name":"Pizzeria Roma","kind":"pizza","note":"Italian · open till 11pm","distance":"450 m","url":"https://...","lat":25.08,"lon":55.14}]}
\`\`\`
\`\`\`spotify
{"query":"evening chill playlist","title":"Evening Chill","subtitle":"Playlist"}
\`\`\`
\`\`\`youtube
{"query":"best Dubai Marina food tour","title":"Dubai Marina food tour"}
\`\`\`
\`\`\`email
{"to":"","subject":"","body":""}
\`\`\`
\`\`\`calendar
{"title":"Dinner","start":"2026-11-07T19:00","end":"2026-11-07T20:00","details":""}
\`\`\`
\`\`\`reminder
{"title":"Drink water","at":"2026-11-07T15:00"}
\`\`\`
\`\`\`dashboard
{"title":"Weekly routine","stats":[{"label":"Workouts","value":"4"}],"items":["Mon: Gym 7am"],"chart":[{"label":"Mon","value":3}]}
\`\`\`
MUSIC: when asked for songs/playlists, use the user's memory (favorite artists/genres) and output 5-8 spotify blocks (one per track, title = 'Song — Artist', query = 'Song Artist') plus a youtube block for the top pick. Ask once for favorite artists if unknown and save them via memory.
For alarms/reminders/timers use a reminder block (local time, ISO without Z).
Use map for any place/food/shop/mall/cafe/nearby request. When NEARBY PLACES are provided below, ONLY recommend from that real list (include kind = 1-2 word food/shop keyword like 'sushi' or 'mall', distance, lat, lon, website, image if listed), pick the best 3-6 for the request. IMAGES: picture requests are handled by Echo's image pipeline and returned as image cards. Never write image URLs, markdown images or image blocks yourself. Free uses EchoI1 (standard quality, 5/day). Echo Pro uses EchoI1 PRO (max photorealism, location-aware, unlimited). Preserve the user's requested style and details exactly. WEBSITES / APPS / GAMES / LANDING PAGES: say one short line, then write ONE complete self-contained \`\`\`html document (with <title>) — it opens in a live side canvas. Make it look like a real, polished, production product: <script src="https://cdn.tailwindcss.com"></script>, a Google Font (Inter/Geist/Manrope), real-sounding copy and data tailored to the request (never lorem ipsum), responsive layout, sticky nav, hero, sections, hover states, smooth transitions, working JS interactivity (tabs, carts, filters, forms, game loop). ${o.web} Icons: inline SVG. Games use <canvas> with keyboard + touch controls and a score. Close with </html>.
WEATHER: when the user asks about weather, outdoor plans, what to wear, or "today/this week", use LIVE WEATHER data if provided below. Prefer a useful dashboard block with temperature, conditions, humidity, wind, and a 7-day chart. Give practical advice (umbrella, layers, outdoor timing) grounded in the numbers.
DASHBOARDS: for weather, routines, fitness, local day-planning, or trackers, emit a dashboard block (opens in the side canvas) with 4 real stats, 5-8 chart points and actionable checklist items. Local dashboards should use the user's location and weather when available. Other code uses normal language fences. Don't repeat code in prose.
When the user tells you a lasting preference (tone, food, goals, home, facts about them), append at the very end:
\`\`\`memory
{"persona":"...","foodPreferences":"...","goals":"...","homeCity":"...","memory":"..."}
\`\`\`
(only include keys that changed; memory = short facts list merged with existing).`;
}

async function toPart(url: string): Promise<Part | null> {
  try {
    if (url.startsWith('data:')) {
      const [h, data] = url.split(',');
      return { inlineData: { mimeType: h.slice(5).split(';')[0], data } };
    }
    const r = await fetch(url);
    const buf = new Uint8Array(await r.arrayBuffer());
    let s = '';
    for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { inlineData: { mimeType: r.headers.get('content-type') || 'image/png', data: btoa(s) } };
  } catch {
    return null;
  }
}

function dist(a: number, b: number, c: number, d: number) {
  const R = 6371e3, t = Math.PI / 180;
  const x = Math.sin(((c - a) * t) / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin(((d - b) * t) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Search the connected Gmail inbox only when the user asks about email. */
async function fetchGmailContext(userText: string) {
  try {
    const { accessToken } = await integrations.get('gmail');
    const lower = userText.toLowerCase();
    const from = /from\\s+([a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}|[a-z0-9.-]+\\.[a-z]{2,})/i.exec(userText)?.[1];
    const stop = new Set(['show','find','search','check','read','summarise','summarize','my','me','the','latest','recent','email','emails','mail','mails','gmail','inbox','messages','message','please','what','about','from','to','with','and','for']);
    const terms = lower.replace(/from\\s+[^ ]+/i, ' ').split(/[^a-z0-9@._+-]+/).filter(w => w.length > 2 && !stop.has(w)).slice(0, 5);
    const q = ['in:anywhere newer_than:30d', from ? `from:${from}` : '', ...terms.map(w => `"${w}"`)].filter(Boolean).join(' ');
    const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    url.searchParams.set('maxResults', '8');
    url.searchParams.set('q', q);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return '';
    const list = await res.json() as { messages?: { id: string }[] };
    const rows = await Promise.all((list.messages || []).map(async m => {
      const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(m.id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!r.ok) return '';
      const d = await r.json() as { snippet?: string; payload?: { headers?: { name: string; value: string }[] } };
      const h = d.payload?.headers || [];
      const get = (name: string) => h.find(x => x.name.toLowerCase() === name.toLowerCase())?.value || '';
      return `From: ${get('From')} | Subject: ${get('Subject')} | Date: ${get('Date')} | Snippet: ${d.snippet || ''}`;
    }));
    return rows.filter(Boolean).join('\\n');
  } catch (e) {
    console.error('Gmail lookup failed', e);
    return '';
  }
}

/** Live weather via Open-Meteo (free, no API key). */
async function fetchWeather(lat: number, lon: number) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,cloud_cover&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset&timezone=auto&forecast_days=7`;
    const r = await fetch(url);
    if (!r.ok) return '';
    const j = await r.json() as {
      current?: Record<string, number>;
      daily?: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_sum: number[]; sunrise: string[]; sunset: string[] };
      timezone?: string;
    };
    const codeLabel = (c: number) => {
      if (c === 0) return 'Clear';
      if (c <= 3) return 'Partly cloudy';
      if (c <= 48) return 'Foggy';
      if (c <= 57) return 'Drizzle';
      if (c <= 67) return 'Rain';
      if (c <= 77) return 'Snow';
      if (c <= 82) return 'Showers';
      if (c <= 86) return 'Snow showers';
      if (c <= 99) return 'Thunderstorm';
      return 'Mixed';
    };
    const cur = j.current || {};
    const d = j.daily;
    const lines = [
      `Current: ${cur.temperature_2m ?? '?'}°C (feels ${cur.apparent_temperature ?? '?'}°C), ${codeLabel(Number(cur.weather_code ?? 0))}, humidity ${cur.relative_humidity_2m ?? '?'}%, wind ${cur.wind_speed_10m ?? '?'} km/h, clouds ${cur.cloud_cover ?? '?'}%, precip ${cur.precipitation ?? 0} mm.`,
    ];
    if (d?.time?.length) {
      lines.push('7-day forecast:');
      for (let i = 0; i < Math.min(7, d.time.length); i++) {
        lines.push(`- ${d.time[i]}: ${codeLabel(d.weather_code[i])} · high ${d.temperature_2m_max[i]}°C / low ${d.temperature_2m_min[i]}°C · rain ${d.precipitation_sum[i]} mm · sunrise ${d.sunrise[i]?.slice(11) || '?'} · sunset ${d.sunset[i]?.slice(11) || '?'}`);
      }
    }
    return lines.join('\n');
  } catch (e) {
    console.error('weather', e);
    return '';
  }
}

async function nearbyPlaces(lat: number, lon: number) {
  const q = `[out:json][timeout:8];(nwr(around:2500,${lat},${lon})[name][amenity~"restaurant|cafe|fast_food|bar|pharmacy|ice_cream"];nwr(around:2500,${lat},${lon})[name][shop~"mall|supermarket|bakery|clothes|electronics|convenience"];nwr(around:2500,${lat},${lon})[name][leisure~"fitness_centre|park"];);out center 120;`;
  try {
    const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    const j = (await r.json()) as { elements: { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags: Record<string, string> }[] };
    return j.elements
      .map((e) => {
        const la = e.lat ?? e.center?.lat ?? lat, lo = e.lon ?? e.center?.lon ?? lon;
        return { t: e.tags, la, lo, d: dist(lat, lon, la, lo) };
      })
      .sort((a, b) => a.d - b.d)
      .slice(0, 60)
      .map(({ t, la, lo, d }) => `- ${t['name:en'] || t.name} | ${t.amenity || t.shop || t.leisure}${t.cuisine ? ' (' + t.cuisine + ')' : ''} | ${Math.round(d)} m | lat ${la.toFixed(5)}, lon ${lo.toFixed(5)}${t.opening_hours ? ' | hours ' + t.opening_hours : ''}${t.image || t.wikimedia_commons ? ' | image ' + (t.image || 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(t.wikimedia_commons.replace(/^File:/, ''))) : ''}${t.website || t['contact:website'] ? ' | ' + (t.website || t['contact:website']) : ''}`)
      .join('\n');
  } catch (e) {
    console.error('overpass', e);
    return '';
  }
}

const dead = new Map<string, number>();

// Free, keyless fallback so chat always replies even when Gemini quota is exhausted.
async function* freeModel(sys: string, msgs: { role: string; content: string }[]) {
  const r = await fetch('https://text.pollinations.ai/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'openai', stream: true, messages: [{ role: 'system', content: sys }, ...msgs.map((m) => ({ role: m.role, content: m.content || ' ' }))] }),
  });
  if (!r.ok || !r.body) throw new Error('Echo is busy right now — please try again in a moment.');
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const l of lines) {
      const d = l.replace(/^data: ?/, '').trim();
      if (!d || d === '[DONE]') continue;
      try { const t = JSON.parse(d).choices?.[0]?.delta?.content; if (t) yield t as string; } catch { /* partial */ }
    }
  }
}

async function* one(s: string) { yield s; }
const withTimeout = <T,>(p: Promise<T>, ms: number, fb: T) => Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fb), ms))]);

// Last-resort prompt if the prompt writer is unavailable: the person's own words, minus the "draw me a…" lead-in.
function plainPrompt(user: string) {
  const core = user.replace(/^(please\s+)?(can you |could you |would you )?(draw|create|generate|make|show|give|paint|sketch|illustrate|imagine)( me| us)?( an?| the| some)?( image| picture| photo| pic| drawing| painting)?( of| showing| with)?\s*/i, '').trim();
  return `Create exactly this image: ${core || user}. Preserve the requested subject, style, composition, colours, setting and any visible text. Use refined detail, intentional lighting and a clear focal point. Do not add unrelated objects, captions, watermarks or borders.`;
}

const FLASH = 'gemini-3.8-flash';
const LITE = 'gemini-3.5-flash-lite';
const BUILD = /build|write|create|make|code|plan|explain|website|image|near|food|analy|compare|calculate|data|debug|fix|why|how/;

export default createEndpoint({
  description: 'Streams Echo’s reply, personalized with the user’s profile and location',
  authenticated: true,
  stream: true,
  inputSchema: z.object({
    messages: z.array(Msg),
    location: z.string().optional(),
    timezone: z.string().optional(),
    model: z.string().optional(),
    lat: z.number().optional(),
    lon: z.number().optional(),
    projectHtml: z.string().optional(),
  }),
  outputSchema: z.object({ text: z.string() }),
  execute: async ({ input, context, stream }) => {
    const now = Date.now();
    const last = input.messages[input.messages.length - 1];
    const lastText = last?.content.toLowerCase() || '';
    const imageReq = !last?.images?.length && imageIntent(lastText);
    const hasCoords = input.lat != null && input.lon != null;
    const wantsPlaces = !imageReq && hasCoords && /near|around|close|food|eat|restaurant|cafe|coffee|pizza|burger|shop|mall|store|place|order|dinner|lunch|breakfast|gym|pharmacy|supermarket|grocery/.test(lastText);
    const wantsWeather = !imageReq && /weather|forecast|temperature|rain|umbrella|humid|windy|\buv\b|what to wear|outdoor|hot out|cold out|storm/.test(lastText);
    const wantsGmail = !imageReq && /\b(gmail|inbox|emails?|mailbox|messages from|email from|sent me|sent by)\b/.test(lastText);
    const [{ records }, chats, { accessToken }, nearby, weather, gmailContext] = await Promise.all([
      zite.profiles.findAll({ filters: { owner: context.user.id }, limit: 1 }),
      imageReq ? Promise.resolve({ records: [] as { title?: string }[] }) : withTimeout(zite.chats.findAll({ filters: { owner: context.user.id }, limit: 15, sort: [{ field: 'lastUpdated', direction: 'desc' }] } as any).catch(() => ({ records: [] as { title?: string }[] })), 450, { records: [] as { title?: string }[] }),
      imageReq ? Promise.resolve({ accessToken: '' }) : integrations.get('gemini'),
      wantsPlaces ? nearbyPlaces(input.lat!, input.lon!) : Promise.resolve(''),
      (wantsWeather || wantsPlaces) && hasCoords ? fetchWeather(input.lat!, input.lon!) : Promise.resolve(''),
      wantsGmail ? fetchGmailContext(last?.content || '') : Promise.resolve(''),
    ]);
    const p = records[0];
    const isPro = p?.plan === 'pro';
    const ai = new GoogleGenerativeAI(accessToken);

    // ---- Projects: free accounts can have 2 websites. Editing an existing one is always allowed. ----
    if (!isPro && !input.projectHtml && !imageReq && websiteIntent(lastText)) {
      const { records: mine } = await zite.projects.findAll({ filters: { owner: context.user.id }, fields: ['title'], limit: 10 });
      if (mine.length >= FREE_PROJECT_LIMIT) {
        const out = '[[PROJECT_LIMIT]]';
        await stream.forward(one(out));
        return { text: out };
      }
    }
    const recent = input.messages.slice(-(isPro ? 40 : 24));

    // ---- Images: Free = 5/day, Pro = unlimited. Max realism via worker + location cues. ----
    if (imageReq) {
      let st = readState(p?.imageLog, now);
      if (!isPro && (st.lockedUntil || st.log.length >= FREE_IMAGE_LIMIT)) {
        const out = `[[IMAGE_LIMIT:${st.lockedUntil ?? now + DAY_MS}]]`;
        await stream.forward(one(out));
        return { text: out };
      }
      const prompt = plainPrompt(last?.content || '');
      const { w, h } = aspectOf(lastText);
      const ratio = w > h ? '16:9' : h > w ? '9:16' : '1:1';
      const card = JSON.stringify({
        prompt,
        alt: (last?.content || '').slice(0, 140),
        w, h, aspectRatio: ratio,
        seed: Math.floor(Math.random() * 900000) + 100000,
        location: input.location || '',
        lat: input.lat,
        lon: input.lon,
      });
      const out = `Creating your image…\n\n\`\`\`image\n${card}\n\`\`\``;
      await stream.forward(one(out));
      return { text: out };
    }

    const profile = {
      persona: p?.persona || '', foodPreferences: p?.foodPreferences || '', goals: p?.goals || '',
      memory: p?.memory || '', homeCity: p?.homeCity || '',
    };
    const topics = (chats.records as { title?: string | null }[]).map((c) => c.title).filter(Boolean).slice(0, 15).join('; ');
    const tz = input.timezone || 'UTC';
    const nowStr = new Date().toLocaleString('en-US', { timeZone: tz, dateStyle: 'full', timeStyle: 'short' });

    // Pro is locked server-side: a free account asking for it quietly gets standard Echo.
    const allowed = isPro ? [PRO_MODEL, FLASH, LITE] : [FLASH, LITE];
    const picked = allowed.includes(input.model || '') ? input.model! : FLASH;
    const short = lastText.length < 40 && !BUILD.test(lastText);
    // Pro prioritises time-to-first-token: stream on the fast Flash path first, keep Pro model as capacity fallback.
    // Thinking stays minimal so Pro feels snappier than Free on creative work while still delivering higher quality.
    const pro = isPro && picked === PRO_MODEL;
    const complexBuild = websiteIntent(lastText) || /\b(code|debug|refactor|program|script|web app|dashboard|game)\b/.test(lastText);
    const first = pro ? FLASH : short ? LITE : picked;
    const mode = first === LITE
      ? '\nMODE: Echo Fast — ultra brief, 1-3 lines max, instant answers.'
      : pro
        ? '\nMODE: Echo Pro — highest capability with fast first token. Think briefly and precisely; do not narrate long internal reasoning. Lead with the answer. Websites, dashboards, games and apps must be noticeably more polished than Free: distinctive art direction, complete interactions, production-minded structure, richer motion and zero placeholder copy. Code must be complete, idiomatic and robust. Images are handled by the image pipeline — never invent image URLs. Verify maths and edge cases quietly, then deliver expert, well-structured output.'
        : '\nMODE: Echo — balanced, concise but complete.';
    const ownerEmail = context.user.email || '';
    const web = (isPro ? WEB_PRO : WEB_FREE) + ` OWNER EMAIL: ${ownerEmail || 'unknown'}.`;
    const edit = input.projectHtml
      ? `\n\nEDIT MODE: the user is editing one of their saved websites (a Project). Here is its current code:\n<<<CURRENT_HTML\n${input.projectHtml.slice(0, 60000)}\nCURRENT_HTML>>>\nApply exactly what they ask, keep everything else unchanged, and reply with one short line then the COMPLETE updated document in a single \`\`\`html block (never a partial snippet). Do not add a "Saved to Projects" line; just say what you changed.`
      : '';
    const sys = systemPrompt({ name: p?.displayName || context.user.firstName || '', now: nowStr, tz, location: input.location || '', profile, web }) + edit + mode
      + (topics ? `\n\nRECENT CHAT TOPICS (use to personalize, reference naturally when relevant): ${topics}` : '')
      + (weather ? `\n\nLIVE WEATHER (real Open-Meteo data for the user location — use for answers and dashboards):\n${weather}` : '')
      + (nearby ? `\n\nNEARBY PLACES (real, from map data, sorted by distance):\n${nearby}` : '')
      + (gmailContext ? `\n\nCONNECTED GMAIL SEARCH RESULTS (real recent email metadata and snippets):\n${gmailContext}\nUse only these messages as evidence; if none match, say so. Do not claim to have sent or changed anything.` : '');
    // Models with quota first; skip ones that recently returned 429 for this isolate.
    // The big flash model is often overloaded (503), so the fast model goes first and answers in under a second.
    const order = [first, ...(pro ? [PRO_MODEL, FAST_MODEL] : [FLASH]), FAST_MODEL, LITE, FLASH].filter((m, i, arr) => arr.indexOf(m) === i && !(dead.get(m)! > Date.now()));

    const contents = await Promise.all(
      recent.map(async (m, i) => {
        const parts: Part[] = [{ text: m.content || ' ' }];
        if (m.images?.length && i >= recent.length - 4) {
          for (const u of m.images) { const part = await toPart(u); if (part) parts.push(part); }
        }
        return { role: m.role === 'assistant' ? 'model' : 'user', parts };
      }),
    );

    let deltas: AsyncIterable<string> | undefined;
    for (const name of order) {
      try {
        // Pro: longer outputs, lower latency (minimal/no extended thinking), stronger creative quality via prompts + model order.
        const cfg: Record<string, unknown> = isPro
          ? {
              temperature: complexBuild ? 0.55 : 0.62,
              maxOutputTokens: 16384,
              // Keep thinking minimal so Pro responses start faster than a deep-think Free path.
              ...(name === FLASH || name === PRO_MODEL ? { thinkingConfig: { thinkingLevel: 'low' } } : {}),
            }
          : { temperature: 0.8, maxOutputTokens: 6144 };
        const r = await ai.getGenerativeModel({ model: name, systemInstruction: sys, generationConfig: cfg as never }, { timeout: name === PRO_MODEL ? 12000 : 8000 }).generateContentStream({ contents });
        deltas = (async function* () { for await (const c of r.stream) yield c.text(); })();
        break;
      } catch (e) {
        const msg = String(e);
        console.error(name, msg.slice(0, 160));
        if (msg.includes('429')) dead.set(name, Date.now() + 10 * 60_000);
      }
    }
    if (!deltas) deltas = freeModel(sys, recent);
    const text = await stream.forward(deltas);

    const mem = text.match(/```memory\s*([\s\S]*?)```/);
    if (mem) {
      try {
        const u = JSON.parse(mem[1]);
        const rec: Record<string, string> = {};
        for (const k of ['persona', 'foodPreferences', 'goals', 'homeCity', 'memory'] as const)
          if (typeof u[k] === 'string' && u[k]) rec[k] = k === 'memory' && profile.memory ? `${profile.memory}\n${u[k]}`.slice(-3000) : u[k];
        await zite.profiles.bulkCreate({ records: [{ owner: context.user.id, ...rec }], matchOn: ['owner'] });
      } catch (e) {
        console.error('memory parse', e);
      }
    }
    return { text };
  },
});
