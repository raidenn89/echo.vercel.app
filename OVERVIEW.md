# Echo

A personal AI assistant for anyone who signs up — a ChatGPT/Gemini-style chat with a dark, glassy, Siri-inspired look.

Echo remembers each person's tone, food preferences, goals and location, and replies briefly with rich cards: maps of nearby places, generated images, Spotify/YouTube picks, Gmail drafts, calendar events, dashboards and live code previews. It also has a speech-to-speech voice mode, chat history and session summaries.

## Plans

- **Free** — Echo and Echo Fast, 5 images per day. The window starts when the 5th image is made, so the limit resets 24h after that moment (shown in the person's own timezone). Echo Pro is locked.
- **Echo Pro (AED 23/month)** — unlimited images, the Echo Pro model, deeper data analysis, faster responses, better code.

Plan + image allowance live on the `Profiles` table (`plan`, `imageLog`, `proSince`) and are read/changed only through `api/plan.ts`; `api/chat.ts` enforces both server-side. The checkout in `UpgradeDialog.tsx` is a **demo** (no real charge, nothing stored) — swap `plan({ action: 'upgrade' })` for a Stripe confirmation to take real payments.

## Projects

Every finished website/app/game Echo builds is saved to the `Projects` table (title, html, edit chat). Sidebar → Projects opens a panel to open (live preview + edit by chatting) or delete projects. Free = 2 projects max (enforced in `api/saveProject.ts` and pre-checked in `api/chat.ts`); Pro = unlimited. The top **PRO** badge is a menu: See subscription benefits / Cancel subscription (`plan({action:'cancel'})`). Pro accounts get a richer build prompt, 16k output tokens and the fast model with high thinking.

## Images

**Pro** images use the Echo Pro image worker (Cloudflare Workers AI · FLUX) through `api/proImage.ts` — set its address in `IMAGE_WORKER_URL` there (or the secret `ZITE_IMAGE_WORKER_URL`). Rendered by `ProImage.tsx`; falls back to Pollinations if the worker is unreachable. **Free** images use Pollinations (1 per 45 s per person; `PollinationsImage.tsx` waits and retries on its 402). The text below describes the free path.

Image requests are detected on the server (`imageIntent` in `lib/plan.ts`), rewritten into a detailed FLUX prompt by Gemini, and returned as a `pollinations` block. `PollinationsImage.tsx` renders it as a raw `<img>` so the browser loads it straight from Pollinations.
