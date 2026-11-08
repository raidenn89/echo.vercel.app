export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return new Response('Please send a POST request with a prompt.', { status: 405, headers: cors });

    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } });

    try {
      const { prompt } = await request.json();
      if (!prompt) return json({ error: 'Missing prompt' }, 400);

      // FLUX.1 Schnell — 4 steps is optimal for fast, sharp generation.
      const response = await env.AI.run('@cf/black-forest-labs/flux-1-schnell', {
        prompt: String(prompt).slice(0, 2048),
        steps: 4,
      });

      // Workers AI already returns the image as a base64 string (JPEG).
      return json({ image: `data:image/jpeg;base64,${response.image}`, model: 'FLUX.1 Schnell' });
    } catch (error) {
      return json({ error: String(error) }, 500);
    }
  },
};
