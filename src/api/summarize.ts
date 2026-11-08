import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { integrations } from 'zitejs/integrations';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default createEndpoint({
  description: 'Summarizes a conversation into key takeaways',
  authenticated: true,
  inputSchema: z.object({ transcript: z.string() }),
  outputSchema: z.object({ points: z.array(z.string()) }),
  execute: async ({ input }) => {
    const { accessToken } = await integrations.get('gemini');
    const model = new GoogleGenerativeAI(accessToken).getGenerativeModel({ model: 'gemini-3.5-flash-lite' });
    const r = await model.generateContent(
      `Give 3-6 concise key takeaways from this conversation, one per line, no bullets or numbering:\n\n${input.transcript.slice(-20000)}`,
    );
    const points = r.response.text().split('\n').map((s) => s.replace(/^[-*•\d.\s]+/, '').trim()).filter(Boolean);
    return { points };
  },
});
