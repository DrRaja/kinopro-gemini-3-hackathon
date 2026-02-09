# KinoPro MVP Architecture

## Repo layout

```
apps/
  api/            FastAPI + Pydantic 2.9 services
packages/
  db/             Drizzle ORM schema (SQLite for MVP)
windmill/
  workflows/      Windmill workflows
  scripts/        Windmill task scripts
docs/
  architecture.md
  ffmpeg.md
src/              Vite React frontend (KinoPro UI)
```

## System flow

1. Client uploads a film, extracts duration and poster frame on-device.
2. Local storage ingest triggers Windmill workflow.
<!-- UploadThing completes and triggers Windmill workflow. -->
3. Windmill calls Gemini with the storyboard prompt and receives 5 boards.
4. FFmpeg extracts clips with CPU defaults and generates three thumbnail candidates per scene.
5. Sharpest thumbnail is chosen via Laplacian variance.
6. Data persists in SQLite (MVP) and streams to the client via SSE.
7. Exports generate EDL, XML, JSON, and FCPXML 11.

## Realtime

Server-Sent Events stream pipeline updates to the frontend. The FastAPI router
exposes `/v1/projects/{project_id}/events` for live status updates.
