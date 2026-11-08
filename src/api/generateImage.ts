import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { integrations } from 'zitejs/integrations';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { zite } from 'zitejs/db';
import { FAST_MODEL, addImage, readState, summarize } from '../lib/plan';

const HORDE_API = 'https://aihorde.net/api';
const HORDE_MODEL = "ICBINP - I Can't Believe It's Not Photography";
const CLIENT_AGENT = 'EchoAI:1.0:Echo Pro image generation';

function optimizeBasic(userPrompt: string, variant?: number) {
  const requested = userPrompt.trim().slice(0, 280);
  const p = `${requested}, high quality photograph, natural lighting, sharp focus, detailed`;
  return (variant ? `${p}, variation ${variant}` : p).slice(0, 400);
}

function optimizePro(userPrompt: string, opts?: { variant?: number; location?: string; lat?: number; lon?: number }) {
  const requested = userPrompt.trim().slice(0, 420);
  const art = /\b(anime|manga|illustrat|cartoon|painting|watercolor|oil paint|vector|logo|icon|pixel art|3d render|sketch|comic|concept art)\b/i.test(requested);
  if (art) {
    const p = `${requested}, highly detailed, sharp focus, finished artwork`;
    return (opts?.variant ? `${p}, variation ${opts.variant}` : p).slice(0, 900);
  }
  const placeBits: string[] = [];
  if (opts?.location) {
    placeBits.push(`Exact real-world location context: ${opts.location}.`);
    placeBits.push('Match real architecture, street layout, signage language, vegetation and sky typical of this place.');
    placeBits.push('Shot as if the photographer was physically standing there — documentary travel photography.');
  }
  if (opts?.lat != null && opts?.lon != null) {
    placeBits.push(`GPS near ${opts.lat.toFixed(5)}, ${opts.lon.toFixed(5)} — keep geography and sun direction plausible.`);
  }
  const p = [
    requested + '.',
    ...placeBits,
    'Camera: professional full-frame camera, sharp prime lens, realistic depth of field and natural perspective.',
    'Lighting: physically plausible ambient light, accurate shadows, highlights and contact points.',
    'Materials: fine skin texture, fabric weave, concrete grain, metal micro-scratches and realistic glass reflections.',
    'Composition: clear foreground, midground and background separation, precise subject detail.',
    'Finish: highly detailed photorealistic documentary image, natural colour grading, no CGI look, no watermark.',
  ].join(' ');
  return (opts?.variant ? `${p} Distinct variation ${opts.variant}.` : p).slice(0, 1800);
}

async function enrichProPrompt(base: string, requested: string): Promise<string> {
  try {
    const { accessToken } = await integrations.get('gemini');
    const m = new GoogleGenerativeAI(accessToken).getGenerativeModel({
      model: FAST_MODEL,
      systemInstruction: 'Expand the user request into one precise, highly detailed image-generation prompt. Preserve every subject, colour, number and requested text. Do not invent new subjects. Describe composition, setting, lighting, materials, textures, depth, camera perspective and natural colour. Use vivid concrete visual language. Return only the prompt, no preamble or markdown.',
    }, { timeout: 6000 });
    const r = await m.generateContent({ contents: [{ role: 'user', parts: [{ text: `User request: ${requested}\nVisual direction: ${base.slice(0, 900)}` }] }] });
    const t = r.response.text().replace(/["`*#]/g, '').replace(/\s+/g, ' ').trim();
    if (t.length > 40) return t.slice(0, 900);
  } catch (e) {
    console.error('Echo Pro prompt enrichment failed', String(e).slice(0, 120));
  }
  return base.slice(0, 900);
}

function hordeDimensions(ratio?: string) {
  const map: Record<string, [number, number]> = {
    '1:1': [1024, 1024], '3:2': [1024, 704], '2:3': [704, 1024],
    '4:3': [1024, 768], '3:4': [768, 1024], '16:9': [1024, 576],
    '9:16': [576, 1024], '4:5': [832, 1024], '5:4': [1024, 832],
    '21:9': [1024, 448],
  };
  return map[ratio || '1:1'] || map['1:1'];
}

function hordeMessage(body: any, fallback: string) {
  const raw = typeof body?.message === 'string' ? body.message : '';
  if (/kudos|insufficient|balance|credit/i.test(raw)) return 'Your AI Horde account needs more kudos before Echo Pro can generate images. Add kudos to the connected Horde account, then try again.';
  if (/timeout|temporarily blocked|ip address.*timeout/i.test(raw)) return 'AI Horde has temporarily rate-limited the image service. Wait a little and try again.';
  return raw.slice(0, 220) || fallback;
}

export default createEndpoint({
  description: 'Generates Free images with Cloudflare FLUX Schnell and Pro images with Cloudflare FLUX.2 Dev, with a Pollinations Pro fallback.',
  authenticated: true,
  inputSchema: z.object({
    prompt: z.string().min(3).max(3000),
    variant: z.number().optional(),
    aspectRatio: z.enum(['1:1','3:2','2:3','4:3','3:4','16:9','9:16','4:5','5:4','21:9']).optional(),
    imageSize: z.enum(['1K','2K']).optional(),
    referenceImage: z.string().max(18000000).optional(),
    location: z.string().max(500).optional(),
    lat: z.number().optional(),
    lon: z.number().optional(),
  }),
  outputSchema: z.object({
    dataUrl: z.string(),
    jobId: z.string().nullable(),
    allowed: z.boolean(),
    plan: z.enum(['free','pro']),
    model: z.string(),
    used: z.number(),
    limit: z.number().nullable(),
    remaining: z.number().nullable(),
    resetAt: z.number().nullable(),
  }),
  execute: async ({ input, context }) => {
    const now = Date.now();
    const { records } = await zite.profiles.findAll({ filters: { owner: context.user.id }, limit: 1 });
    const profile = records[0];
    const currentPlan = profile?.plan === 'pro' ? 'pro' : 'free';
    let state = readState(profile?.imageLog, now);
    const usage = summarize(currentPlan, state);

    if (currentPlan === 'free' && usage.remaining === 0) {
      return { dataUrl: '', jobId: null, allowed: false, model: 'EchoI1', ...usage };
    }

    const raw = input.referenceImage
      ? `${input.prompt.trim()}. Create a refined new variation that follows the supplied image direction.`
      : input.prompt;

    let dataUrl: string;
    let jobId: string | null = null;
    let model: string;

    const isPro = currentPlan === 'pro';
    const basePrompt = isPro
      ? optimizePro(raw, { variant: input.variant, location: input.location, lat: input.lat, lon: input.lon })
      : optimizeBasic(raw, input.variant);
    // Always expand the request into a rich cinematic FLUX prompt (Gemini), falling back to the template.
    const prompt = await enrichProPrompt(
      `${basePrompt} Cinematic lighting, rich textures, hyper-realistic detail, volumetric light, shallow depth of field, award-winning composition, 8k clarity.`,
      input.prompt.trim().slice(0, 700),
    );
    const [width, height] = hordeDimensions(input.aspectRatio);
    const workerResponse = await fetch('https://zite-image-api.raidenshaj.workers.dev/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        prompt,
        plan: currentPlan,
        aspectRatio: input.aspectRatio || '1:1',
        imageSize: input.imageSize || '1K',
        width,
        height,
      }),
    });
    let workerBody: any = {};
    try { workerBody = await workerResponse.json(); } catch { /* Worker returned a non-JSON response */ }
    // Worker returns { image: dataUrl }; older versions used image_url.
    if (typeof workerBody.image === 'string' && !workerBody.image_url) {
      workerBody.image_url = workerBody.image.startsWith('data:') ? workerBody.image : `data:image/jpeg;base64,${workerBody.image}`;
    }

    if (!workerResponse.ok || typeof workerBody.image_url !== 'string' || !workerBody.image_url.startsWith('data:image/')) {
      console.error('Cloudflare image Worker failed', workerResponse.status, String(workerBody.error || 'Invalid image response').slice(0, 240));
      // Optional server-side Pro fallback in the app backend as well as the Worker fallback.
      // Free keyless fallback (e.g. Cloudflare daily neuron limit reached) so images still appear.
      const fb = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.slice(0, 1500))}`);
      fb.searchParams.set('model', 'flux');
      fb.searchParams.set('width', String(width));
      fb.searchParams.set('height', String(height));
      fb.searchParams.set('nologo', 'true');
      fb.searchParams.set('seed', String((Date.now() + (input.variant || 0)) % 1_000_000));
      dataUrl = fb.toString();
      model = 'Echo · FLUX (backup)';
    } else {
      dataUrl = workerBody.image_url;
      model = typeof workerBody.model === 'string'
        ? (isPro ? `Echo Pro · ${workerBody.model}` : 'Echo · Cloudflare FLUX Schnell')
        : (isPro ? 'Echo Pro · Cloudflare FLUX.2 Dev' : 'Echo · Cloudflare FLUX Schnell');
    }
    jobId = null;

    if (currentPlan === 'free') {
      state = addImage(state, now);
      await zite.profiles.bulkCreate({ records: [{ owner: context.user.id, imageLog: JSON.stringify(state) }], matchOn: ['owner'] });
    }

    return { dataUrl, jobId, allowed: true, model, ...summarize(currentPlan, state) };
  },
});
