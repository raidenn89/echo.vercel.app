import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Loads one website project (code and edit chat) for the signed-in user',
  authenticated: true,
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.object({ id: z.string(), title: z.string(), html: z.string(), messages: z.string() }),
  execute: async ({ input, context }) => {
    const r = await zite.projects.findOne({ id: input.id });
    const owners = ([] as string[]).concat(r?.owner ?? []);
    if (!r || !owners.includes(context.user.id)) throw new ZiteError('Project not found');
    return { id: r.id, title: r.title || 'Untitled website', html: r.html || '', messages: r.messages || '[]' };
  },
});
