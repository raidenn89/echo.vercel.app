import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

const P = z.object({
  displayName: z.string(),
  persona: z.string(),
  foodPreferences: z.string(),
  goals: z.string(),
  memory: z.string(),
  homeCity: z.string(),
});

export default createEndpoint({
  description: 'Reads or saves the signed-in user’s Echo personalization',
  authenticated: true,
  inputSchema: z.object({ update: P.partial().optional() }),
  outputSchema: P,
  execute: async ({ input, context }) => {
    const { records } = await zite.profiles.findAll({ filters: { owner: context.user.id }, limit: 1 });
    let r = records[0];
    if (input.update) {
      const res = await zite.profiles.bulkCreate({
        records: [{ owner: context.user.id, ...input.update }],
        matchOn: ['owner'],
      });
      r = res.records[0];
    }
    return {
      displayName: r?.displayName || context.user.firstName || '',
      persona: r?.persona || '',
      foodPreferences: r?.foodPreferences || '',
      goals: r?.goals || '',
      memory: r?.memory || '',
      homeCity: r?.homeCity || '',
    };
  },
});
