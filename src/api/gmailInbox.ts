import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { integrations } from 'zitejs/integrations';

export default createEndpoint({
  description: 'Searches the signed-in user Gmail inbox and returns safe message summaries',
  authenticated: true,
  inputSchema: z.object({ query: z.string().optional(), maxResults: z.number().int().min(1).max(20).optional() }),
  outputSchema: z.object({
    emailAddress: z.string(),
    messages: z.array(z.object({
      id: z.string(), threadId: z.string(), from: z.string(), subject: z.string(),
      date: z.string(), snippet: z.string(), unread: z.boolean(),
    })),
  }),
  execute: async ({ input }) => {
    const { accessToken } = await integrations.get('gmail');
    const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) throw new Error(`Gmail profile request failed (${profileRes.status})`);
    const profile = await profileRes.json() as { emailAddress?: string };
    const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    url.searchParams.set('maxResults', String(input.maxResults || 12));
    url.searchParams.set('q', input.query?.trim() || 'in:anywhere newer_than:30d');
    const listRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!listRes.ok) throw new Error(`Gmail search failed (${listRes.status})`);
    const list = await listRes.json() as { messages?: { id: string; threadId: string }[] };
    const messages = await Promise.all((list.messages || []).map(async (m) => {
      const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(m.id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!r.ok) return null;
      const data = await r.json() as { id: string; threadId: string; snippet?: string; labelIds?: string[]; payload?: { headers?: { name: string; value: string }[] } };
      const headers = data.payload?.headers || [];
      const get = (name: string) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
      return {
        id: data.id, threadId: data.threadId, from: get('From'), subject: get('Subject') || '(No subject)',
        date: get('Date'), snippet: data.snippet || '', unread: (data.labelIds || []).includes('UNREAD'),
      };
    }));
    return { emailAddress: profile.emailAddress || '', messages: messages.filter(Boolean) as {
      id: string; threadId: string; from: string; subject: string; date: string; snippet: string; unread: boolean;
    }[] };
  },
});