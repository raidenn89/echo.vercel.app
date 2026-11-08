import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { integrations } from 'zitejs/integrations';

export default createEndpoint({
  description: 'Sends an email through the connected Gmail account',
  authenticated: true,
  inputSchema: z.object({ to: z.string(), subject: z.string(), body: z.string() }),
  outputSchema: z.object({ ok: z.boolean() }),
  execute: async ({ input }) => {
    const { accessToken } = await integrations.get('gmail');
    const mime = [
      `To: ${input.to}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(input.subject)))}?=`,
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      input.body,
    ].join('\r\n');
    const raw = btoa(unescape(encodeURIComponent(mime))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }),
    });
    if (!res.ok) throw new Error(`Gmail error ${res.status}: ${await res.text()}`);
    return { ok: true };
  },
});
