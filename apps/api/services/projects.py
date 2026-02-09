from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from db import get_connection


@dataclass(frozen=True)
class ProjectRecord:
    id: str
    name: str
    description: str | None
    video_filename: str | None
    duration_seconds: float
    poster_url: str | None
    status: str
    progress: int
    error_message: str | None
    created_at: str
    updated_at: str
    processing_started_at: str | None
    processing_estimate_seconds: int | None
    storyboards_json: str | None
    storyboards_count: int
    frames_count: int
    poster_candidates_json: str | None
    poster_outputs_json: str | None


def ensure_projects_table() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                video_filename TEXT,
                duration_seconds REAL DEFAULT 0,
                poster_url TEXT,
                status TEXT NOT NULL,
                progress INTEGER NOT NULL DEFAULT 0,
                error_message TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                processing_started_at TEXT,
                processing_estimate_seconds INTEGER,
                storyboards_json TEXT,
                storyboards_count INTEGER DEFAULT 0,
                frames_count INTEGER DEFAULT 0,
                poster_candidates_json TEXT,
                poster_outputs_json TEXT
            )
            """
        )
        columns = [row["name"] for row in conn.execute("PRAGMA table_info(projects)").fetchall()]
        if "error_message" not in columns:
            conn.execute("ALTER TABLE projects ADD COLUMN error_message TEXT")
        if "poster_candidates_json" not in columns:
            conn.execute("ALTER TABLE projects ADD COLUMN poster_candidates_json TEXT")
        if "poster_outputs_json" not in columns:
            conn.execute("ALTER TABLE projects ADD COLUMN poster_outputs_json TEXT")
        conn.commit()


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_project(
    name: str,
    description: str | None,
    video_filename: str | None,
    duration_seconds: float,
    poster_url: str | None,
) -> ProjectRecord:
    ensure_projects_table()
    project_id = f"proj_{uuid.uuid4().hex[:10]}"
    now = _utc_now()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO projects (
                id,
                name,
                description,
                video_filename,
                duration_seconds,
                poster_url,
                status,
                progress,
                error_message,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                project_id,
                name,
                description,
                video_filename,
                duration_seconds,
                poster_url,
                "created",
                0,
                None,
                now,
                now,
            ),
        )
        conn.commit()
    return get_project(project_id, include_storyboards=False)


def get_project(project_id: str, include_storyboards: bool = True) -> ProjectRecord:
    ensure_projects_table()
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM projects WHERE id = ?",
            (project_id,),
        ).fetchone()
    if not row:
        raise ValueError("Project not found")
    record = ProjectRecord(**dict(row))
    if not include_storyboards:
        record = record.__class__(**{**record.__dict__, "storyboards_json": None})
    return record


def list_projects() -> list[ProjectRecord]:
    ensure_projects_table()
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM projects ORDER BY updated_at DESC",
        ).fetchall()
    return [ProjectRecord(**dict(row)) for row in rows]


def update_project(project_id: str, **fields: Any) -> None:
    ensure_projects_table()
    fields["updated_at"] = _utc_now()
    columns = ", ".join([f"{key} = ?" for key in fields.keys()])
    values = list(fields.values()) + [project_id]
    with get_connection() as conn:
        conn.execute(
            f"UPDATE projects SET {columns} WHERE id = ?",
            values,
        )
        conn.commit()


def delete_project(project_id: str) -> None:
    ensure_projects_table()
    with get_connection() as conn:
        conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        conn.commit()


def set_storyboards(project_id: str, payload: dict) -> None:
    storyboards = payload.get("storyboards") or []
    frames_count = sum(len(board.get("scenes", [])) for board in storyboards)
    update_project(
        project_id,
        storyboards_json=json.dumps(payload),
        storyboards_count=len(storyboards),
        frames_count=frames_count,
        error_message=None,
    )


def set_poster_candidates(project_id: str, candidates: list[dict]) -> None:
    update_project(
        project_id,
        poster_candidates_json=json.dumps(candidates),
    )


def set_poster_outputs(project_id: str, posters: list[dict]) -> None:
    update_project(
        project_id,
        poster_outputs_json=json.dumps(posters),
    )


def _normalize_storyboards_payload(payload: Any) -> dict | None:
    if isinstance(payload, dict):
        return payload
    if isinstance(payload, list):
        if (
            len(payload) == 1
            and isinstance(payload[0], dict)
            and (
                "storyboards" in payload[0]
                or "movie_title" in payload[0]
                or "poster_candidates" in payload[0]
            )
        ):
            return payload[0]
        return {"storyboards": payload}
    return None


def parse_storyboards(record: ProjectRecord) -> dict | None:
    if not record.storyboards_json:
        return None
    try:
        payload = json.loads(record.storyboards_json)
    except json.JSONDecodeError:
        return None
    return _normalize_storyboards_payload(payload)


def parse_poster_candidates(record: ProjectRecord) -> list[dict] | None:
    if not record.poster_candidates_json:
        return None
    return json.loads(record.poster_candidates_json)


def parse_poster_outputs(record: ProjectRecord) -> list[dict] | None:
    if not record.poster_outputs_json:
        return None
    return json.loads(record.poster_outputs_json)


def compute_progress(record: ProjectRecord) -> int:
    if record.status != "processing" or not record.processing_started_at:
        return record.progress

    try:
        started = datetime.fromisoformat(record.processing_started_at)
    except ValueError:
        return record.progress

    estimate = record.processing_estimate_seconds or 600
    elapsed = (datetime.now(timezone.utc) - started).total_seconds()
    estimated_progress = min(99, int((elapsed / max(estimate, 1)) * 100))
    return max(record.progress, estimated_progress)
