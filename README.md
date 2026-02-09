# KinoPro MVP

KinoPro is a 2026-ready trailer storyboard studio. This repo contains a polished
frontend experience plus backend/workflow scaffolding for FastAPI, Windmill, and
FFmpeg processing.

## Frontend (Vite)

```bash
npm install
npm run dev
```

## Backend scaffold (FastAPI)

```bash
cd apps/api
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

## Local storage + basic auth (MVP)

- Uploads are stored under `data/uploads/{project_id}`.
- Register a user via `POST /v1/auth/register`.
- Use HTTP Basic auth for protected endpoints.

Example:

```bash
curl -X POST http://localhost:8000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"editor\",\"password\":\"cutfast\"}"
```

## Docker (dev)

```bash
docker compose up --build
```

## Environment variables

Create a `.env` file (see `.env.example`) at the repo root for Docker and local dev.

Required:

- `GEMINI_API_KEY` - Gemini model access (used by Windmill/Gemini service).

Recommended:

- `KINO_DB_PATH` - SQLite DB path (default `data/kinopro.db`).
- `KINO_STORAGE_DIR` - Local upload directory (default `data/uploads`).
- `KINO_FPS` - FPS used for thumbnail offsets (default `24`).
- `KINO_CORS_ORIGINS` - Comma-separated origins or `*` for dev.

Optional (commented until integrations are enabled):

- `UPLOADTHING_SECRET`
- `CLERK_SECRET_KEY`

## Key references

- Frontend UI: `src/`
- FastAPI scaffold: `apps/api/`
- Drizzle schema (SQLite): `packages/db/schema.ts`
- Windmill workflow: `windmill/workflows/storyboard_pipeline.yaml`
- FFmpeg commands: `docs/ffmpeg.md`
