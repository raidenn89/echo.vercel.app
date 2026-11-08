import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { FREE_PROJECT_LIMIT } from '../lib/plan';

export default createEndpoint({
  description: 'Lists the signed-in user’s website projects and their plan limit',
  authenticated: true,
  inputSchema: z.object({}),
  outputSchema: z.object({
    projects: z.array(z.object({ id: z.string(), title: z.string(), updatedAt: z.string() })),
    limit: z.number().nullable(),
  }),
  execute: async ({ context }) => {
    const [{ records }, { records: profs }] = await Promise.all([
      zite.projects.findAll({
        filters: { owner: context.user.id },
        sort: [{ field: 'lastUpdated', direction: 'desc' }],
        fields: ['title', 'lastUpdated'],
        limit: 200,
      }),
      zite.profiles.findAll({ filters: { owner: context.user.id }, limit: 1 }),
    ]);
    const pro = profs[0]?.plan === 'pro';
    return {
      projects: records.map((r) => ({ id: r.id, title: r.title || 'Untitled website', updatedAt: r.lastUpdated || new Date().toISOString() })),
      limit: pro ? null : FREE_PROJECT_LIMIT,
    };
  },
});
