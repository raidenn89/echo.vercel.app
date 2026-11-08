import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';

const HORDE_API = 'https://aihorde.net/api';
const CLIENT_AGENT = 'EchoAI:1.0:Echo Pro image generation';

export default createEndpoint({
  description: 'Checks a private Echo Pro AI Horde image job and returns its finished image.',
  authenticated: true,
  inputSchema: z.object({ jobId: z.string().min(8).max(100) }),
  outputSchema: z.object({
    status: z.enum(['pending', 'complete', 'failed']),
    dataUrl: z.string(),
    message: z.string(),
  }),
  execute: async ({ input, context }) => {
    const { records } = await zite.profiles.findAll({ filters: { owner: context.user.id }, limit: 1 });
    if (records[0]?.plan !== 'pro') throw new ZiteError('Echo Pro is required to retrieve Pro image generations.');
    const apiKey = process.env.ZITE_HORDE_API_KEY;
    if (!apiKey) throw new ZiteError('Echo Pro image generation is not configured. Ask the app owner to add ZITE_HORDE_API_KEY in workspace Secrets.');

    const headers = { apikey: apiKey, 'Client-Agent': CLIENT_AGENT, Accept: 'application/json' };
    const checkRes = await fetch(`${HORDE_API}/v2/generate/check/${encodeURIComponent(input.jobId)}`, { headers });
    let check: any = {};
    try { check = await checkRes.json(); } catch { /* provider error */ }
    if (!checkRes.ok) {
      return { status: 'failed' as const, dataUrl: '', message: typeof check.message === 'string' ? check.message.slice(0, 220) : 'AI Horde could not check this image job.' };
    }
    if (check.faulted) {
      return { status: 'failed' as const, dataUrl: '', message: 'AI Horde could not complete this image. Please try another prompt.' };
    }
    if (!check.done || (typeof check.finished === 'number' && check.finished < 1)) {
      return { status: 'pending' as const, dataUrl: '', message: '' };
    }

    const resultRes = await fetch(`${HORDE_API}/v2/generate/status/${encodeURIComponent(input.jobId)}`, { headers });
    let result: any = {};
    try { result = await resultRes.json(); } catch { /* provider error */ }
    const image = result?.generations?.[0]?.img;
    if (!resultRes.ok || typeof image !== 'string' || !image) {
      return { status: 'failed' as const, dataUrl: '', message: 'AI Horde finished the job but did not return an image. Please try again.' };
    }
    const dataUrl = /^https?:\/\//i.test(image) || image.startsWith('data:') ? image : `data:image/webp;base64,${image}`;
    return { status: 'complete' as const, dataUrl, message: '' };
  },
});
