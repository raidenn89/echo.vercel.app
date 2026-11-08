import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { addImage, readState, summarize } from '../lib/plan';

export default createEndpoint({
  description: 'Reads the signed-in user’s plan and daily image allowance, upgrades them to Pro, or spends one image',
  authenticated: true,
  inputSchema: z.object({ action: z.enum(['status', 'upgrade', 'consume', 'cancel']).default('status') }),
  outputSchema: z.object({
    plan: z.enum(['free', 'pro']),
    used: z.number(),
    limit: z.number().nullable(),
    remaining: z.number().nullable(),
    resetAt: z.number().nullable(),
    allowed: z.boolean(),
    proSince: z.string(),
  }),
  execute: async ({ input, context }) => {
    const now = Date.now();
    const { records } = await zite.profiles.findAll({ filters: { owner: context.user.id }, limit: 1 });
    const p = records[0];
    let plan = p?.plan === 'pro' ? 'pro' : 'free';
    let proSince = p?.proSince || '';
    let st = readState(p?.imageLog, now);
    let allowed = true;

    if (input.action === 'upgrade') {
      plan = 'pro';
      proSince = new Date(now).toISOString();
      st = { log: [] };
      await zite.profiles.bulkCreate({
        records: [{ owner: context.user.id, plan, proSince, imageLog: JSON.stringify(st) }],
        matchOn: ['owner'],
      });
    } else if (input.action === 'cancel') {
      plan = 'free';
      proSince = '';
      st = { log: [] };
      await zite.profiles.bulkCreate({
        records: [{ owner: context.user.id, plan, proSince, imageLog: JSON.stringify(st) }],
        matchOn: ['owner'],
      });
    } else if (input.action === 'consume' && plan !== 'pro') {
      if (summarize(plan, st).remaining === 0) {
        allowed = false;
      } else {
        st = addImage(st, now);
        await zite.profiles.bulkCreate({ records: [{ owner: context.user.id, imageLog: JSON.stringify(st) }], matchOn: ['owner'] });
      }
    }
    return { ...summarize(plan, st), allowed, proSince };
  },
});
