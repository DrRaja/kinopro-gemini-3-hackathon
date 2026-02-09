Project: KinoPro (final name locked, kinopro.ai already bought)

Stack we are using in 2026:
- Frontend: Next.js >=24 (App Router) + TypeScript 5.6 + Tailwind 4 + shadcn/ui + Framer Motion + GSAP  + Lenis smooth scroll
- Backend: FastAPI + Python 3.12 + Pydantic 2.9
- Database: PostgreSQL 17 + Drizzle ORM (because Prisma is dead in 2026, Drizzle won) -- "FOR MVP LET's GO WITH SQLITE!"
- Auth: Clerk (NextAuth is ancient history)
- Storage: Local dev → UploadThing (because it’s still the best in 2026)
- Background: Windmill (the 2025–2026 Celery killer) + Redis 8
- Video: ffmpeg.wasm for client-side thumbnails + server-side FFmpeg 6.1 with NVENC
- Realtime: Server-Sent Events (WebSockets are so 2024)

Build the entire production-ready, responsive, mind-blowingly beautiful KinoPro MVP in one shot.

Core flow (exactly as we designed in 2025, but now executed with 2026 tools):

1. User uploads movie → instant client-side duration + poster frame via ffmpeg.wasm
2. UploadThing finishes → triggers Windmill job
3. Windmill job calls google's gemini-3-pro-preview with THIS exact storyboard prompt:

```
You are the world's best trailer editor with 20 years experience cutting trailers for Marvel, A24, and Apple. Your taste is flawless, your pacing is ruthless, and you obsess over emotional rhythm.

The user has uploaded a full feature film. Your single job is to create **5 dramatically different, Hollywood-caliber trailer storyboards** (not scripts, not videos — storyboards made of exact existing moments from the movie).

Output format must be EXACTLY this JSON structure (no extra text before or after):

{
  "movie_title": "detect automatically or use filename",
  "duration": "detect total length",
  "storyboards": [
    {
      "name": "Hype / Epic / Blockbuster Cut",
      "target_length": "2:15 - 2:30",
      "tone": "massive, relentless momentum, goosebumps guaranteed",
      "description": "One-sentence vibe summary (max 15 words)",
      "scenes": [
        {
          "scene_number": 1,
          "start_tc": "00:23:45.12",
          "end_tc": "00:23:49.08",
          "duration_seconds": 3.96,
          "thumbnail_tc": "00:23:47.00",
          "description": "Exact one-sentence description of what happens + why it's perfect here",
          "emotional_beat": "Intrigue / Mystery / First Wow Moment",
          "music_idea": "slow piano into massive braaam" 
        }
        // exactly 18–25 scenes per storyboard (never less than 18, never more than 28)
      ]
    },
    {
      "name": "Emotional / Character-Driven Cut",
      "target_length": "2:20",
      "tone": "tear-jerking, intimate, makes audience fall in love with characters",
      "description": "Heart-breakingly beautiful",
      "scenes": [ ... ]
    },
    {
      "name": "Dark / Intense / Thriller Cut",
      "target_length": "2:10",
      "tone": "unrelenting tension, psychological, disturbing",
      "description": "Feels like oxygen is running out",
      "scenes": [ ... ]
    },
    {
      "name": "Quirky / Fun / Viral Cut",
      "target_length": "1:45 - 2:00",
      "tone": "maximum shareability, TikTok/Reels energy, meme-worthy",
      "description": "Makes you laugh in the first 8 seconds",
      "scenes": [ ... ]
    },
    {
      "name": "Critics / Festival / Prestige Cut",
      "target_length": "2:30",
      "tone": "sophisticated, slow-burn, Oscar-bait, leaves you haunted",
      "description": "The version that wins awards and breaks critics",
      "scenes": [ ... ]
    }
  ]
}

Rules you never break:
1. Every single frame you choose MUST exist in the movie. No hallucinations, no "implied" scenes.
2. Timestamps must be frame-accurate (to the frame, not rounded seconds).
3. thumbnail_tc must be the single most striking frame inside that clip.
4. Every scene description must be 12–22 words and explain WHY this moment belongs exactly here in the trailer arc.
5. The 5 storyboards must feel radically different — same movie, completely different emotional journeys.
6. Pacing: first 15 seconds must hook instantly. Final 20 seconds must be pure climax + killer last frame.
7. Never repeat the exact same clip across storyboards (different in/out points are fine if necessary, but prefer unique moments).
8. Always end on the single most unforgettable frame in the entire film.

You have perfect recall of the entire movie. You know every beat, every line, every camera move.

Now watch the film once at 32x speed, then deliver the 5 masterpiece storyboards in perfect JSON.
```

4. For every single scene returned:
   - Extract clip with FFmpeg + NVENC ( ultrafast preset for dev, libx264 crf 18 for production)
   - Generate 3 candidate thumbnails at thumbnail_tc ± 8 frames → pick the sharpest via LAPLACIAN variance → save as webp
   - Store everything in DB

5. Storyboard viewer requirements (2026 standard):
   - 120fps butter scroll with Lenis + GSAP ScrollTrigger
   - Every clip tile uses native <video> with playbackRate=1.0, muted, loop, playsInline
   - Hover → instant play from 0 (no lag, pre-warm buffer)
   - Global “Autoplay All” toggle (GSAP Flip animation on state change)
   - Tiles use viewport-triggered lazy loading + IntersectionObserver
   - Mobile: vertical carousel per board, swipe with momentum
   - Selection mode with floating action bar (GSAP magnetic drag feel)

6. Export:
   - Generate EDL + XML + JSON + FCPXML 11. User selects the Format and the app delivers!!!
   - Optional: one-click “Open in DaVinci Resolve” via resolve:// URL scheme (2026 Resolve supports it)

7. Polish level: This must feel like Apple made a video editor in 2026.
   - Micro-interactions: every button has GSAP + haptic feedback on mobile
   - First load → 3D film reel spin-in hero with real reflections (yes, use three.js only for landing)

Output everything in correct 2026 folder structure, with proper schema, windmill workflows, and exact ffmpeg commands.

Ship it like tomorrow is the public launch and every film-twitter user is waiting to scream about it.

Begin. Now.