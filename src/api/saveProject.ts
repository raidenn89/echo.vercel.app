import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { FREE_PROJECT_LIMIT } from '../lib/plan';

export default createEndpoint({
  description: 'Creates, updates or deletes a website project; free accounts are capped at 2 projects',
  authenticated: true,
  inputSchema: z.object({
    id: z.string().optional(),
    title: z.string().optional(),
    html: z.string().optional(),
    messages: z.string().optional(),
    remove: z.boolean().optional(),
  }),
  outputSchema: z.object({ id: z.string(), title: z.string() }),
  execute: async ({ input, context }) => {
    if (!input.id) {
      const [{ records }, { records: profs }] = await Promise.all([
        zite.projects.findAll({ filters: { owner: context.user.id }, fields: ['title'], limit: 200 }),
        zite.profiles.findAll({ filters: { owner: context.user.id }, limit: 1 }),
      ]);
      const pro = profs[0]?.plan === 'pro';
      if (!pro && records.length >= FREE_PROJECT_LIMIT) throw new ZiteError('PROJECT_LIMIT');
      const title = (input.title || 'Untitled website').slice(0, 80);
      const r = await zite.projects.create({
        record: { owner: context.user.id, title, html: input.html || '', messages: input.messages || '[]' },
      });
      return { id: r.id, title };
    }
    const r = await zite.projects.findOne({ id: input.id });
    if (!r || !([] as string[]).concat(r.owner ?? []).includes(context.user.id)) throw new ZiteError('Project not found');
    if (input.remove) {
      await zite.projects.delete({ id: input.id });
      return { id: input.id, title: r.title || '' };
    }
    const record: Record<string, unknown> = {};
    if (input.title !== undefined) record.title = input.title.slice(0, 80);
    if (input.html !== undefined) record.html = input.html;
    if (input.messages !== undefined) record.messages = input.messages;
    await zite.projects.update({ id: input.id, record });
    return { id: input.id, title: (input.title ?? r.title) || '' };
  },
});
