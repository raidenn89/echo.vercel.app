import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Creates, updates, renames, archives or deletes a chat',
  authenticated: true,
  inputSchema: z.object({
    id: z.string().optional(),
    title: z.string().optional(),
    messages: z.string().optional(),
    archived: z.boolean().optional(),
    remove: z.boolean().optional(),
  }),
  outputSchema: z.object({ id: z.string() }),
  execute: async ({ input, context }) => {
    if (!input.id) {
      const r = await zite.chats.create({
        record: { owner: context.user.id, title: input.title || 'New chat', messages: input.messages || '[]', archived: false },
      });
      return { id: r.id };
    }
    const r = await zite.chats.findOne({ id: input.id });
    if (!r || !([] as string[]).concat(r.owner ?? []).includes(context.user.id))
      throw new ZiteError('Chat not found');
    if (input.remove) {
      await zite.chats.delete({ id: input.id });
      return { id: input.id };
    }
    const record: Record<string, unknown> = {};
    if (input.title !== undefined) record.title = input.title;
    if (input.messages !== undefined) record.messages = input.messages;
    if (input.archived !== undefined) record.archived = input.archived;
    await zite.chats.update({ id: input.id, record });
    return { id: input.id };
  },
});
