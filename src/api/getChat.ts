import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Loads one saved chat for the signed-in user',
  authenticated: true,
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.object({ id: z.string(), title: z.string(), messages: z.string() }),
  execute: async ({ input, context }) => {
    const r = await zite.chats.findOne({ id: input.id });
    const owners = ([] as string[]).concat(r?.owner ?? []);
    if (!r || !owners.includes(context.user.id)) throw new ZiteError('Chat not found');
    return { id: r.id, title: r.title || 'New chat', messages: r.messages || '[]' };
  },
});
