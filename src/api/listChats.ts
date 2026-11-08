import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Lists the signed-in user’s saved chats',
  authenticated: true,
  inputSchema: z.object({}),
  outputSchema: z.object({
    chats: z.array(z.object({ id: z.string(), title: z.string(), archived: z.boolean(), updatedAt: z.string() })),
  }),
  execute: async ({ context }) => {
    const { records } = await zite.chats.findAll({
      filters: { owner: context.user.id },
      sort: [{ field: 'lastUpdated', direction: 'desc' }],
      fields: ['title', 'archived', 'lastUpdated'],
      limit: 200,
    });
    return {
      chats: records.map((r) => ({
        id: r.id,
        title: r.title || 'New chat',
        archived: !!r.archived,
        updatedAt: r.lastUpdated || new Date().toISOString(),
      })),
    };
  },
});
