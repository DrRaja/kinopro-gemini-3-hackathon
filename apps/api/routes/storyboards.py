from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import os
import shutil
import subprocess
import time
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Iterator
from urllib.parse import urlparse

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse

from models.storyboard import (
    ExportRequest,
    PosterGenerateRequest,
    PosterWallResponse,
    Project,
    ProjectCreate,
    StoryboardResponse,
)
from routes.auth import require_basic_auth
from services.ffmpeg import (
    ClipRequest,
    build_nvenc_clip_command,
    build_thumbnail_commands,
    build_x264_clip_command,
    probe_duration,
    seconds_to_timecode,
    timecode_to_seconds,
)
from services.gemini import generate_storyboards_from_file, upload_file_to_gemini
from services.projects import (
    compute_progress,
    create_project,
    delete_project,
    get_project,
    list_projects,
    parse_poster_candidates,
    parse_poster_outputs,
    parse_storyboards,
    set_poster_candidates,
    set_poster_outputs,
    set_storyboards,
    update_project,
)
from services.storage import get_project_dir
from services.thumbnails import pick_sharpest
from services.posters import generate_posters

router = APIRouter(tags=["projects"])


def _media_url(project_id: str, relative_path: str) -> str:
    base = os.getenv("KINO_MEDIA_BASE_URL", "/media").rstrip("/")
    normalized = relative_path.replace("\\", "/")
    return f"{base}/{project_id}/{normalized}"


def _estimate_processing_seconds(duration_seconds: float) -> int:
    if duration_seconds <= 0:
        return 720
    # Includes Gemini upload/inference plus local FFmpeg rendering.
    return int(max(480, min(2400, duration_seconds * 1.0)))


def _bool_env(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _render_workers() -> int:
    cpu_count = os.cpu_count() or 1
    default_workers = 2 if cpu_count >= 2 else 1
    raw = os.getenv("KINO_RENDER_WORKERS")
    if raw is None:
        return default_workers
    try:
        return max(1, int(raw))
    except ValueError:
        return default_workers


def _safe_timecode_seconds(value: str | None, fps: int) -> float | None:
    if not value:
        return None
    try:
        return max(0.0, float(timecode_to_seconds(str(value), fps)))
    except Exception:
        return None


def _mm_ss_ff_seconds(value: str | None, fps: int) -> float | None:
    if not value:
        return None

    text = str(value).strip()
    parts = text.split(":")
    if len(parts) != 3:
        return None

    first, second, third = parts
    if not first.isdigit() or not second.isdigit():
        return None
    frames_token = third.split(".", 1)[0]
    if not frames_token.isdigit():
        return None

    minutes = int(first)
    seconds = int(second)
    frames = int(frames_token)
    if seconds >= 60:
        return None

    return max(0.0, (minutes * 60) + seconds + (frames / max(fps, 1)))


def _normalized_timestamp_seconds(
    value: str | None,
    *,
    duration_seconds: float,
    fps: int,
) -> float:
    parsed = _safe_timecode_seconds(value, fps)
    if parsed is None:
        return 0.0

    # Gemini can output MM:SS:FF even when asked for HH:MM:SS.FF.
    # For short videos, reinterpret huge values using MM:SS:FF if it fits duration.
    if duration_seconds > 0 and duration_seconds < 3600 and parsed > (duration_seconds + 1):
        alt = _mm_ss_ff_seconds(value, fps)
        if alt is not None and alt <= (duration_seconds + 1):
            parsed = alt

    if duration_seconds <= 0:
        return parsed

    max_start = max(0.0, duration_seconds - (1 / max(fps, 1)))
    return min(max(parsed, 0.0), max_start)


def _normalize_scene_timecodes(payload: dict, duration_seconds: float, fps: int) -> tuple[dict, int]:
    storyboards = payload.get("storyboards")

    repaired = 0
    min_clip = 1 / max(fps, 1)
    default_clip = max(1.0, 12 / max(fps, 1))

    if isinstance(storyboards, list):
        for board in storyboards:
            if not isinstance(board, dict):
                continue
            scenes = board.get("scenes")
            if not isinstance(scenes, list):
                continue

            for scene in scenes:
                if not isinstance(scene, dict):
                    continue

                original = (
                    str(scene.get("start_tc") or ""),
                    str(scene.get("end_tc") or ""),
                    str(scene.get("thumbnail_tc") or ""),
                )

                start_sec = _normalized_timestamp_seconds(
                    scene.get("start_tc"),
                    duration_seconds=duration_seconds,
                    fps=fps,
                )
                end_sec = _normalized_timestamp_seconds(
                    scene.get("end_tc"),
                    duration_seconds=duration_seconds,
                    fps=fps,
                )

                if end_sec <= start_sec + min_clip:
                    end_sec = start_sec + max(default_clip, min_clip)
                if duration_seconds > 0:
                    end_sec = min(end_sec, duration_seconds)
                if end_sec <= start_sec + min_clip:
                    start_sec = max(0.0, end_sec - max(default_clip, min_clip))

                thumb_sec = _normalized_timestamp_seconds(
                    scene.get("thumbnail_tc") or scene.get("start_tc"),
                    duration_seconds=duration_seconds,
                    fps=fps,
                )
                if thumb_sec < start_sec or thumb_sec > end_sec:
                    thumb_sec = start_sec + ((end_sec - start_sec) / 2)

                scene["start_tc"] = seconds_to_timecode(start_sec, fps)
                scene["end_tc"] = seconds_to_timecode(end_sec, fps)
                scene["thumbnail_tc"] = seconds_to_timecode(thumb_sec, fps)
                scene["duration_seconds"] = round(max(end_sec - start_sec, min_clip), 2)

                updated = (
                    str(scene.get("start_tc") or ""),
                    str(scene.get("end_tc") or ""),
                    str(scene.get("thumbnail_tc") or ""),
                )
                if original != updated:
                    repaired += 1

    raw_candidates = payload.get("poster_candidates")
    if isinstance(raw_candidates, list):
        for entry in raw_candidates:
            if not isinstance(entry, dict):
                continue
            source = entry.get("timestamp") or entry.get("timecode") or entry.get("tc")
            if not source:
                continue
            normalized = seconds_to_timecode(
                _normalized_timestamp_seconds(
                    str(source),
                    duration_seconds=duration_seconds,
                    fps=fps,
                ),
                fps,
            )
            if str(entry.get("timestamp") or "") != normalized:
                repaired += 1
            entry["timestamp"] = normalized

    return payload, repaired


def _project_to_model(record, include_storyboards: bool) -> Project:
    storyboards_payload = parse_storyboards(record) if include_storyboards else None
    storyboards = (
        storyboards_payload.get("storyboards")
        if isinstance(storyboards_payload, dict)
        else storyboards_payload
    )
    storyboards_count = record.storyboards_count
    frames_count = record.frames_count
    if isinstance(storyboards, list) and storyboards:
        if storyboards_count == 0:
            storyboards_count = len(storyboards)
        if frames_count == 0:
            frames_count = sum(
                len(board.get("scenes", [])) for board in storyboards if isinstance(board, dict)
            )
    poster_candidates = parse_poster_candidates(record) if include_storyboards else None
    poster_outputs = parse_poster_outputs(record) if include_storyboards else None
    return Project(
        id=record.id,
        name=record.name,
        description=record.description,
        video_filename=record.video_filename,
        duration_seconds=record.duration_seconds,
        poster_url=record.poster_url,
        status=record.status,
        progress=compute_progress(record),
        error_message=record.error_message,
        storyboards=storyboards,
        storyboards_count=storyboards_count,
        frames_count=frames_count,
        poster_candidates=poster_candidates,
        poster_generations=poster_outputs,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


def _run_command(command: list[str]) -> None:
    subprocess.run(
        command,
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def _format_error(exc: Exception) -> str:
    message = f"{exc.__class__.__name__}: {exc}"
    return message[:240]


def _serialize_frame(frame: object) -> object:
    if hasattr(frame, "model_dump"):
        return getattr(frame, "model_dump")()
    if isinstance(frame, dict):
        return frame
    return frame


def _normalize_media_path(project_id: str, url: str | None) -> Path | None:
    if not url:
        return None
    path = urlparse(url).path if url.startswith("http") else url
    base = os.getenv("KINO_MEDIA_BASE_URL", "/media").rstrip("/")
    if path.startswith(base):
        relative = path[len(base):].lstrip("/")
    else:
        relative = path.lstrip("/")
    if relative.startswith(f"{project_id}/"):
        relative = relative[len(project_id) + 1 :]
    return get_project_dir(project_id) / relative


def _gather_scenes(record, frames: list[object] | None) -> list[dict]:
    payload = parse_storyboards(record) or {}
    storyboards = payload.get("storyboards") if isinstance(payload, dict) else payload
    all_scenes: list[dict] = []
    if isinstance(storyboards, list):
        for board in storyboards:
            all_scenes.extend(board.get("scenes", []))

    if not frames:
        return all_scenes

    scene_map = {
        (scene.get("start_tc"), scene.get("end_tc")): scene
        for scene in all_scenes
        if isinstance(scene, dict)
    }
    selected: list[dict] = []
    for frame in frames:
        frame_dict = _serialize_frame(frame)
        if isinstance(frame_dict, dict):
            key = (frame_dict.get("start_tc"), frame_dict.get("end_tc"))
            if key in scene_map:
                selected.append(scene_map[key])
            else:
                selected.append(frame_dict)
    return selected or all_scenes


def _write_simple_pdf(path: Path, title: str, lines: list[str]) -> None:
    safe_lines = [line.replace("(", "\\(").replace(")", "\\)") for line in lines]
    content = ["BT", "/F1 16 Tf", "50 760 Td", f"({title}) Tj"]
    for line in safe_lines[:30]:
        content.append("0 -18 Td")
        content.append(f"({line}) Tj")
    content.append("ET")
    content_bytes = "\n".join(content).encode("ascii", "ignore")

    objects: list[bytes] = []
    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    objects.append(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    objects.append(
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>"
    )
    objects.append(b"<< /Length " + str(len(content_bytes)).encode() + b" >>\nstream\n" + content_bytes + b"\nendstream")
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    xref_positions = []
    output = bytearray(b"%PDF-1.4\n")
    for idx, obj in enumerate(objects, start=1):
        xref_positions.append(len(output))
        output.extend(f"{idx} 0 obj\n".encode())
        output.extend(obj)
        output.extend(b"\nendobj\n")

    xref_start = len(output)
    output.extend(f"xref\n0 {len(objects)+1}\n".encode())
    output.extend(b"0000000000 65535 f \n")
    for pos in xref_positions:
        output.extend(f"{pos:010d} 00000 n \n".encode())

    output.extend(
        b"trailer\n<< /Size "
        + str(len(objects) + 1).encode()
        + b" /Root 1 0 R >>\nstartxref\n"
        + str(xref_start).encode()
        + b"\n%%EOF\n"
    )
    path.write_bytes(output)


def _render_scene_assets(
    input_path: Path,
    board_clip_dir: Path,
    board_thumb_dir: Path,
    scene_asset_index: int,
    start_tc: str,
    end_tc: str,
    thumbnail_tc: str,
    fps: int,
    use_nvenc: bool,
) -> tuple[str, str]:
    clip_name = f"scene_{scene_asset_index:02d}.mp4"
    thumb_name = f"scene_{scene_asset_index:02d}.webp"
    clip_path = board_clip_dir / clip_name
    thumb_path = board_thumb_dir / thumb_name

    clip_request = ClipRequest(
        input_path=str(input_path),
        start_tc=start_tc,
        end_tc=end_tc,
        output_path=str(clip_path),
    )
    clip_command = (
        build_nvenc_clip_command(clip_request)
        if use_nvenc
        else build_x264_clip_command(clip_request)
    )
    _run_command(clip_command)

    candidate_dir = board_thumb_dir / f"scene_{scene_asset_index:02d}_candidates"
    candidate_dir.mkdir(parents=True, exist_ok=True)
    thumbnail_commands = build_thumbnail_commands(
        str(input_path),
        thumbnail_tc,
        str(candidate_dir),
        fps=fps,
    )
    candidate_paths: list[str] = []
    for command in thumbnail_commands:
        _run_command(command)
        candidate_paths.append(command[-1])

    best_candidate = pick_sharpest(candidate_paths)
    shutil.copy(best_candidate, thumb_path)

    for path in candidate_paths:
        try:
            os.remove(path)
        except FileNotFoundError:
            pass
    try:
        candidate_dir.rmdir()
    except OSError:
        pass

    return clip_name, thumb_name


def _render_assets(
    project_id: str,
    input_path: Path,
    payload: dict,
    fps: int,
    use_nvenc: bool,
    render_workers: int = 1,
    board_progress_callback: Callable[[int, int], None] | None = None,
) -> tuple[dict, str | None]:
    project_dir = get_project_dir(project_id)
    clips_root = project_dir / "clips"
    thumbs_root = project_dir / "thumbs"
    clips_root.mkdir(parents=True, exist_ok=True)
    thumbs_root.mkdir(parents=True, exist_ok=True)

    poster_url = None
    storyboards = payload.get("storyboards", [])
    total_boards = len(storyboards) if isinstance(storyboards, list) else 0

    for board_idx, board in enumerate(storyboards, start=1):
        if not isinstance(board, dict):
            continue
        board_clip_dir = clips_root / f"board_{board_idx}"
        board_thumb_dir = thumbs_root / f"board_{board_idx}"
        board_clip_dir.mkdir(parents=True, exist_ok=True)
        board_thumb_dir.mkdir(parents=True, exist_ok=True)

        scenes = board.get("scenes", [])
        if not isinstance(scenes, list):
            continue

        if render_workers > 1 and len(scenes) > 1:
            with ThreadPoolExecutor(max_workers=render_workers) as executor:
                futures = {}
                for scene_idx, scene in enumerate(scenes, start=1):
                    if not isinstance(scene, dict):
                        continue
                    futures[
                        executor.submit(
                            _render_scene_assets,
                            input_path=input_path,
                            board_clip_dir=board_clip_dir,
                            board_thumb_dir=board_thumb_dir,
                            scene_asset_index=scene_idx,
                            start_tc=str(scene["start_tc"]),
                            end_tc=str(scene["end_tc"]),
                            thumbnail_tc=str(scene["thumbnail_tc"]),
                            fps=fps,
                            use_nvenc=use_nvenc,
                        )
                    ] = scene

                for future in as_completed(futures):
                    scene = futures[future]
                    clip_name, thumb_name = future.result()
                    scene["clip_url"] = _media_url(
                        project_id,
                        f"clips/board_{board_idx}/{clip_name}",
                    )
                    scene["thumbnail_url"] = _media_url(
                        project_id,
                        f"thumbs/board_{board_idx}/{thumb_name}",
                    )
                    thumb_path = board_thumb_dir / thumb_name
                    if (
                        poster_url is None
                        and thumb_path.exists()
                        and thumb_path.stat().st_size > 0
                    ):
                        poster_url = scene["thumbnail_url"]
        else:
            for scene_idx, scene in enumerate(scenes, start=1):
                if not isinstance(scene, dict):
                    continue
                clip_name, thumb_name = _render_scene_assets(
                    input_path=input_path,
                    board_clip_dir=board_clip_dir,
                    board_thumb_dir=board_thumb_dir,
                    scene_asset_index=scene_idx,
                    start_tc=str(scene["start_tc"]),
                    end_tc=str(scene["end_tc"]),
                    thumbnail_tc=str(scene["thumbnail_tc"]),
                    fps=fps,
                    use_nvenc=use_nvenc,
                )

                scene["clip_url"] = _media_url(
                    project_id,
                    f"clips/board_{board_idx}/{clip_name}",
                )
                scene["thumbnail_url"] = _media_url(
                    project_id,
                    f"thumbs/board_{board_idx}/{thumb_name}",
                )
                thumb_path = board_thumb_dir / thumb_name
                if (
                    poster_url is None
                    and thumb_path.exists()
                    and thumb_path.stat().st_size > 0
                ):
                    poster_url = scene["thumbnail_url"]

        if board_progress_callback is not None and total_boards:
            board_progress_callback(board_idx, total_boards)

    if poster_url is None and isinstance(storyboards, list):
        for board in storyboards:
            if not isinstance(board, dict):
                continue
            scenes = board.get("scenes")
            if not isinstance(scenes, list):
                continue
            for scene in scenes:
                if not isinstance(scene, dict):
                    continue
                candidate = scene.get("thumbnail_url")
                if isinstance(candidate, str) and candidate:
                    poster_url = candidate
                    break
            if poster_url:
                break

    return payload, poster_url


def _build_poster_candidates(
    payload: dict,
    limit: int = 20,
    *,
    duration_seconds: float | None = None,
    fps: int = 24,
) -> list[dict]:
    candidates: list[dict] = []
    seen: set[str] = set()

    raw_candidates = payload.get("poster_candidates")
    if isinstance(raw_candidates, list):
        for entry in raw_candidates:
            if not isinstance(entry, dict):
                continue
            timestamp = entry.get("timestamp") or entry.get("timecode") or entry.get("tc")
            if not timestamp:
                continue
            timestamp = str(timestamp)
            if duration_seconds is not None:
                timestamp = seconds_to_timecode(
                    _normalized_timestamp_seconds(
                        timestamp,
                        duration_seconds=duration_seconds,
                        fps=fps,
                    ),
                    fps,
                )
            if timestamp in seen:
                continue
            seen.add(timestamp)
            candidates.append(
                {
                    "id": f"poster_{len(candidates) + 1:02d}",
                    "timestamp": timestamp,
                    "description": entry.get("description") or entry.get("reason"),
                }
            )
            if len(candidates) >= limit:
                return candidates

    storyboards = payload.get("storyboards", [])
    if isinstance(storyboards, list):
        for board in storyboards:
            if not isinstance(board, dict):
                continue
            for scene in board.get("scenes", []):
                if not isinstance(scene, dict):
                    continue
                timestamp = scene.get("thumbnail_tc") or scene.get("start_tc")
                if not timestamp:
                    continue
                timestamp = str(timestamp)
                if duration_seconds is not None:
                    timestamp = seconds_to_timecode(
                        _normalized_timestamp_seconds(
                            timestamp,
                            duration_seconds=duration_seconds,
                            fps=fps,
                        ),
                        fps,
                    )
                if timestamp in seen:
                    continue
                seen.add(timestamp)
                candidates.append(
                    {
                        "id": f"poster_{len(candidates) + 1:02d}",
                        "timestamp": timestamp,
                        "description": scene.get("description") or scene.get("emotional_beat"),
                    }
                )
                if len(candidates) >= limit:
                    return candidates

    return candidates


def _render_poster_candidates(
    project_id: str,
    input_path: Path,
    candidates: list[dict],
    fps: int,
) -> list[dict]:
    if not candidates:
        return []

    project_dir = get_project_dir(project_id)
    posters_dir = project_dir / "posters" / "candidates"
    posters_dir.mkdir(parents=True, exist_ok=True)

    rendered: list[dict] = []
    for candidate in candidates:
        candidate_id = candidate.get("id") or f"poster_{len(rendered) + 1:02d}"
        timestamp = candidate.get("timestamp")
        if not timestamp:
            continue
        output_name = f"{candidate_id}.webp"
        output_path = posters_dir / output_name
        candidate_dir = posters_dir / f"{candidate_id}_candidates"
        candidate_dir.mkdir(parents=True, exist_ok=True)

        try:
            thumbnail_commands = build_thumbnail_commands(
                str(input_path),
                str(timestamp),
                str(candidate_dir),
                fps=fps,
            )
            candidate_paths: list[str] = []
            for command in thumbnail_commands:
                _run_command(command)
                candidate_paths.append(command[-1])
            best_candidate = pick_sharpest(candidate_paths)
            if not os.path.exists(best_candidate) or os.path.getsize(best_candidate) <= 0:
                continue
            shutil.copy(best_candidate, output_path)
            if not output_path.exists() or output_path.stat().st_size <= 0:
                try:
                    output_path.unlink()
                except FileNotFoundError:
                    pass
                continue
        except Exception:
            continue
        finally:
            for path in list(candidate_dir.glob("*.webp")):
                try:
                    path.unlink()
                except FileNotFoundError:
                    pass
            try:
                candidate_dir.rmdir()
            except OSError:
                pass

        candidate["id"] = candidate_id
        candidate["image_url"] = _media_url(
            project_id,
            f"posters/candidates/{output_name}",
        )
        rendered.append(candidate)

    return rendered


def _size_ratio_label(size: str) -> str:
    try:
        width_str, height_str = size.lower().split("x", 1)
        width = int(width_str.strip())
        height = int(height_str.strip())
        if width <= 0 or height <= 0:
            return size
        def _gcd(a: int, b: int) -> int:
            while b:
                a, b = b, a % b
            return a
        divisor = _gcd(width, height)
        return f"{width // divisor}:{height // divisor}"
    except Exception:
        return size


def _build_poster_prompt(
    user_prompt: str | None,
    user_text: str | None,
    size: str,
    candidates: list[dict],
) -> str:
    ratio = _size_ratio_label(size)
    base_lines = [
        "Create a premium, theatrical Hollywood movie poster based strictly on the provided film still(s).",
        "Do NOT invent new characters, faces, or props that are not visible in the stills.",
        "Preserve the identities, wardrobe, and location cues from the reference frames.",
        "Cinematic lighting, deliberate composition, dramatic contrast, and high-end key art polish.",
        "Photorealistic, no cartoon, no abstract, no surreal artifacts.",
        "Do not include any text unless explicit text is provided.",
        f"Aspect ratio: {ratio}.",
    ]
    if user_text:
        base_lines.append(f'Include only this text: "{user_text}".')
    if candidates:
        refs = []
        for candidate in candidates:
            desc = candidate.get("description")
            timestamp = candidate.get("timestamp")
            if desc and timestamp:
                refs.append(f"{timestamp} - {desc}")
            elif desc:
                refs.append(str(desc))
            elif timestamp:
                refs.append(str(timestamp))
        if refs:
            base_lines.append("Reference stills:")
            base_lines.extend([f"- {item}" for item in refs[:6]])
    if user_prompt:
        base_lines.append(f"User direction: {user_prompt}")
    return "\n".join(base_lines)


def _store_generated_posters(
    project_id: str,
    images: list[bytes],
    prompt: str,
    size: str,
    source_candidates: list[str],
) -> list[dict]:
    project_dir = get_project_dir(project_id)
    output_dir = project_dir / "posters" / "generated"
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    created_at = datetime.now(timezone.utc).isoformat()
    results: list[dict] = []

    for idx, image_bytes in enumerate(images, start=1):
        poster_id = f"poster_{timestamp}_{idx:02d}"
        filename = f"{poster_id}.png"
        path = output_dir / filename
        path.write_bytes(image_bytes)
        results.append(
            {
                "id": poster_id,
                "image_url": _media_url(project_id, f"posters/generated/{filename}"),
                "size": size,
                "prompt": prompt,
                "created_at": created_at,
                "source_candidates": source_candidates,
            }
        )
    return results


def _process_project(project_id: str, file_path: str) -> None:
    pipeline_started = time.perf_counter()
    try:
        record = get_project(project_id)
        duration_seconds = record.duration_seconds
        if duration_seconds <= 0:
            duration_seconds = probe_duration(file_path)
            if duration_seconds > 0:
                update_project(project_id, duration_seconds=duration_seconds)

        update_project(project_id, progress=30, error_message=None)
        upload_started = time.perf_counter()
        file_ref = upload_file_to_gemini(file_path)
        upload_elapsed = time.perf_counter() - upload_started
        print(f"[Pipeline:{project_id}] Gemini upload + file processing: {upload_elapsed:.1f}s")

        update_project(project_id, progress=45)
        generation_started = time.perf_counter()
        storyboards = generate_storyboards_from_file(
            file_ref,
            Path(file_path).name,
            duration_seconds,
        )
        generation_elapsed = time.perf_counter() - generation_started
        print(f"[Pipeline:{project_id}] Gemini storyboard generation: {generation_elapsed:.1f}s")

        fps = int(os.getenv("KINO_FPS", "24"))
        storyboards, repaired_timestamps = _normalize_scene_timecodes(
            storyboards,
            duration_seconds=duration_seconds,
            fps=fps,
        )
        if repaired_timestamps:
            print(
                f"[Pipeline:{project_id}] Repaired {repaired_timestamps} scene timestamps "
                f"to match source duration."
            )

        use_nvenc = os.getenv("KINO_USE_NVENC", "").lower() in {"1", "true", "yes"}
        render_workers = _render_workers()
        storyboard_items = storyboards.get("storyboards", [])
        if not isinstance(storyboard_items, list):
            storyboard_items = []
        scene_count = sum(
            len(board.get("scenes", []))
            for board in storyboard_items
            if isinstance(board, dict)
        )
        print(
            f"[Pipeline:{project_id}] Rendering {scene_count} scenes across "
            f"{len(storyboard_items) if isinstance(storyboard_items, list) else 0} storyboards "
            f"with {render_workers} worker(s)."
        )

        update_project(project_id, progress=60)
        assets_started = time.perf_counter()

        def _on_board_rendered(done: int, total: int) -> None:
            progress = 60 + int((done / total) * 30)
            update_project(project_id, progress=min(90, max(60, progress)))

        storyboards_with_assets, poster_url = _render_assets(
            project_id,
            Path(file_path),
            storyboards,
            fps=fps,
            use_nvenc=use_nvenc,
            render_workers=render_workers,
            board_progress_callback=_on_board_rendered,
        )
        assets_elapsed = time.perf_counter() - assets_started
        print(f"[Pipeline:{project_id}] Local clip/thumbnail rendering: {assets_elapsed:.1f}s")

        update_project(project_id, progress=92)
        poster_candidates = _build_poster_candidates(
            storyboards_with_assets,
            duration_seconds=duration_seconds,
            fps=fps,
        )
        eager_poster_candidates = _bool_env("KINO_EAGER_POSTER_CANDIDATES", default=False)
        if eager_poster_candidates:
            poster_started = time.perf_counter()
            rendered_candidates = _render_poster_candidates(
                project_id,
                Path(file_path),
                poster_candidates,
                fps=fps,
            )
            set_poster_candidates(project_id, rendered_candidates)
            poster_elapsed = time.perf_counter() - poster_started
            print(f"[Pipeline:{project_id}] Poster candidate rendering: {poster_elapsed:.1f}s")
        else:
            # Poster endpoint can lazily render candidates when opened.
            set_poster_candidates(project_id, [])
            print(f"[Pipeline:{project_id}] Poster candidates deferred (lazy mode).")

        update_project(project_id, progress=98)

        set_storyboards(project_id, storyboards_with_assets)
        update_fields = {
            "status": "ready",
            "progress": 100,
        }
        if poster_url:
            update_fields["poster_url"] = poster_url
        update_project(project_id, **update_fields)
        total_elapsed = time.perf_counter() - pipeline_started
        print(f"[Pipeline:{project_id}] Total processing time: {total_elapsed:.1f}s")
    except Exception as exc:
        update_project(
            project_id,
            status="failed",
            progress=0,
            error_message=_format_error(exc),
        )


@router.get("/projects", response_model=list[Project])
def get_projects(
    include_storyboards: bool = Query(False),
    _: str = Depends(require_basic_auth),
) -> list[Project]:
    records = list_projects()
    return [_project_to_model(record, include_storyboards) for record in records]


@router.get("/projects/{project_id}", response_model=Project)
def get_project_detail(
    project_id: str,
    include_storyboards: bool = Query(True),
    _: str = Depends(require_basic_auth),
) -> Project:
    try:
        record = get_project(project_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Project not found")
    return _project_to_model(record, include_storyboards)


@router.get("/projects/{project_id}/posters", response_model=PosterWallResponse)
def get_project_posters(
    project_id: str,
    _: str = Depends(require_basic_auth),
) -> PosterWallResponse:
    try:
        record = get_project(project_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Project not found")

    candidates = parse_poster_candidates(record) or []
    posters = parse_poster_outputs(record) or []

    if record.status == "ready" and not candidates:
        payload = parse_storyboards(record) or {}
        if payload and record.video_filename:
            video_path = get_project_dir(project_id) / record.video_filename
            if video_path.exists():
                fps = int(os.getenv("KINO_FPS", "24"))
                duration_seconds = record.duration_seconds
                if duration_seconds <= 0:
                    duration_seconds = probe_duration(str(video_path))
                candidates = _render_poster_candidates(
                    project_id,
                    video_path,
                    _build_poster_candidates(
                        payload,
                        duration_seconds=duration_seconds,
                        fps=fps,
                    ),
                    fps=fps,
                )
                set_poster_candidates(project_id, candidates)

    return PosterWallResponse(project_id=project_id, candidates=candidates, posters=posters)


@router.post("/projects", response_model=Project)
def create_project_endpoint(
    payload: ProjectCreate,
    _: str = Depends(require_basic_auth),
) -> Project:
    record = create_project(
        name=payload.name,
        description=payload.description,
        video_filename=payload.video_filename,
        duration_seconds=payload.duration_seconds,
        poster_url=payload.poster_url,
    )
    return _project_to_model(record, include_storyboards=False)


@router.post("/projects/{project_id}/upload")
def upload_project_file(
    project_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    _: str = Depends(require_basic_auth),
) -> dict:
    try:
        record = get_project(project_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Project not found")

    project_dir = get_project_dir(project_id)
    target_path = project_dir / file.filename

    update_project(
        project_id,
        status="uploading",
        progress=5,
        video_filename=file.filename,
        error_message=None,
    )

    with target_path.open("wb") as handle:
        shutil.copyfileobj(file.file, handle)

    estimate = _estimate_processing_seconds(record.duration_seconds)
    update_project(
        project_id,
        status="processing",
        progress=20,
        processing_started_at=datetime.now(timezone.utc).isoformat(),
        processing_estimate_seconds=estimate,
        error_message=None,
    )

    background_tasks.add_task(_process_project, project_id, str(target_path))
    return {"status": "processing", "project_id": project_id}


@router.post("/projects/{project_id}/retry", response_model=Project)
def retry_project_processing(
    project_id: str,
    background_tasks: BackgroundTasks,
    _: str = Depends(require_basic_auth),
) -> Project:
    try:
        record = get_project(project_id, include_storyboards=False)
    except ValueError:
        raise HTTPException(status_code=404, detail="Project not found")

    if record.status != "failed":
        raise HTTPException(status_code=409, detail="Project is not in a failed state")
    if not record.video_filename:
        raise HTTPException(status_code=400, detail="Project has no video file to retry")

    project_dir = get_project_dir(project_id)
    target_path = project_dir / record.video_filename
    if not target_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Uploaded video not found; re-upload required",
        )

    estimate = _estimate_processing_seconds(record.duration_seconds)
    update_project(
        project_id,
        status="processing",
        progress=20,
        processing_started_at=datetime.now(timezone.utc).isoformat(),
        processing_estimate_seconds=estimate,
        error_message=None,
        storyboards_json=None,
        storyboards_count=0,
        frames_count=0,
        poster_candidates_json=None,
        poster_outputs_json=None,
        poster_url=None,
    )

    background_tasks.add_task(_process_project, project_id, str(target_path))
    record = get_project(project_id, include_storyboards=False)
    return _project_to_model(record, include_storyboards=False)


@router.post("/projects/{project_id}/posters/generate", response_model=PosterWallResponse)
def generate_project_posters(
    project_id: str,
    payload: PosterGenerateRequest,
    _: str = Depends(require_basic_auth),
) -> PosterWallResponse:
    try:
        record = get_project(project_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Project not found")

    if record.status != "ready":
        raise HTTPException(status_code=409, detail="Project is not ready yet")

    candidates = parse_poster_candidates(record) or []
    posters = parse_poster_outputs(record) or []

    if not candidates:
        storyboards = parse_storyboards(record) or {}
        if storyboards and record.video_filename:
            video_path = get_project_dir(project_id) / record.video_filename
            if video_path.exists():
                fps = int(os.getenv("KINO_FPS", "24"))
                duration_seconds = record.duration_seconds
                if duration_seconds <= 0:
                    duration_seconds = probe_duration(str(video_path))
                candidates = _render_poster_candidates(
                    project_id,
                    video_path,
                    _build_poster_candidates(
                        storyboards,
                        duration_seconds=duration_seconds,
                        fps=fps,
                    ),
                    fps=fps,
                )
                set_poster_candidates(project_id, candidates)

    selected = [candidate for candidate in candidates if candidate.get("id") in payload.candidate_ids]
    prompt = _build_poster_prompt(payload.prompt, payload.text, payload.size, selected)
    reference_paths: list[Path] = []
    if selected:
        for candidate in selected:
            candidate_path = _normalize_media_path(project_id, candidate.get("image_url"))
            if candidate_path and candidate_path.exists():
                reference_paths.append(candidate_path)

    try:
        images = generate_posters(
            prompt=prompt,
            size=payload.size,
            variants=1,
            reference_images=reference_paths,
            reference_dir=get_project_dir(project_id) / "posters" / "tmp",
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    new_posters = _store_generated_posters(
        project_id,
        images,
        prompt=prompt,
        size=payload.size,
        source_candidates=[candidate.get("id") for candidate in selected if candidate.get("id")],
    )
    posters.extend(new_posters)
    set_poster_outputs(project_id, posters)
    return PosterWallResponse(project_id=project_id, candidates=candidates, posters=posters)


@router.delete("/projects/{project_id}/posters/{poster_id}", response_model=PosterWallResponse)
def delete_project_poster(
    project_id: str,
    poster_id: str,
    _: str = Depends(require_basic_auth),
) -> PosterWallResponse:
    try:
        record = get_project(project_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Project not found")

    posters = parse_poster_outputs(record) or []
    candidates = parse_poster_candidates(record) or []

    poster = next((item for item in posters if item.get("id") == poster_id), None)
    if not poster:
        raise HTTPException(status_code=404, detail="Poster not found")

    poster_path = _normalize_media_path(project_id, poster.get("image_url"))
    if poster_path and poster_path.exists():
        try:
            poster_path.unlink()
        except FileNotFoundError:
            pass

    posters = [item for item in posters if item.get("id") != poster_id]
    set_poster_outputs(project_id, posters)
    return PosterWallResponse(project_id=project_id, candidates=candidates, posters=posters)


@router.delete("/projects/{project_id}")
def delete_project_endpoint(
    project_id: str,
    _: str = Depends(require_basic_auth),
) -> dict:
    try:
        get_project(project_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Project not found")

    delete_project(project_id)
    project_dir = get_project_dir(project_id)
    if project_dir.exists():
        shutil.rmtree(project_dir, ignore_errors=True)
    return {"status": "deleted", "project_id": project_id}


@router.post("/projects/{project_id}/storyboards", response_model=StoryboardResponse)
def create_storyboards(
    project_id: str,
    _: str = Depends(require_basic_auth),
) -> StoryboardResponse:
    raise HTTPException(status_code=400, detail="Use the upload endpoint to process storyboards")


@router.get("/projects/{project_id}/events")
def stream_events(
    project_id: str,
    _: str = Depends(require_basic_auth),
) -> StreamingResponse:
    def event_stream() -> Iterator[str]:
        yield f"event: status\ndata: {{\"project_id\": \"{project_id}\", \"stage\": \"connected\"}}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/exports")
def request_export(
    payload: ExportRequest,
    _: str = Depends(require_basic_auth),
) -> dict:
    try:
        record = get_project(payload.project_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Project not found")

    export_dir = get_project_dir(payload.project_id) / "exports"
    export_dir.mkdir(parents=True, exist_ok=True)

    frames_payload = [_serialize_frame(frame) for frame in payload.frames] if payload.frames else []
    scenes = _gather_scenes(record, frames_payload)
    export_name = f"export_{payload.format}"
    format_key = payload.format.lower()

    if format_key == "json":
        export_path = export_dir / f"{export_name}.json"
        export_payload = {
            "project_id": payload.project_id,
            "format": payload.format,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "frames": frames_payload,
            "storyboards": parse_storyboards(record) if not payload.frames else None,
        }
        export_path.write_text(json.dumps(export_payload, indent=2, default=str), encoding="utf-8")
    elif format_key == "edl":
        export_path = export_dir / f"{export_name}.edl"
        fps = int(os.getenv("KINO_FPS", "24"))
        lines = ["TITLE: KinoPro Export", "FCM: NON-DROP FRAME"]
        for idx, scene in enumerate(scenes, start=1):
            start_tc = str(scene.get("start_tc") or "00:00:00.00").replace(".", ":")
            end_tc = str(scene.get("end_tc") or "00:00:00.00").replace(".", ":")
            src_in = start_tc
            src_out = end_tc
            rec_in = "00:00:00:00"
            rec_out = end_tc if ":" in end_tc else f"00:00:{end_tc}"
            lines.append(f"{idx:03d}  AX  V     C        {src_in} {src_out} {rec_in} {rec_out}")
            if scene.get("description"):
                lines.append(f"* {scene.get('description')}")
        export_path.write_text("\n".join(lines), encoding="utf-8")
    elif format_key == "xml":
        export_path = export_dir / f"{export_name}.xml"
        xml_lines = [
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
            "<storyboardExport>",
            f"  <project id=\"{payload.project_id}\" generated_at=\"{datetime.now(timezone.utc).isoformat()}\">",
        ]
        for scene in scenes:
            xml_lines.append(
                "    <scene start_tc=\"{start}\" end_tc=\"{end}\" tone=\"{tone}\">{desc}</scene>".format(
                    start=scene.get("start_tc", ""),
                    end=scene.get("end_tc", ""),
                    tone=scene.get("emotional_beat", ""),
                    desc=(scene.get("description") or "").replace("&", "&amp;"),
                )
            )
        xml_lines.append("  </project>")
        xml_lines.append("</storyboardExport>")
        export_path.write_text("\n".join(xml_lines), encoding="utf-8")
    elif format_key == "pdf":
        export_path = export_dir / f"{export_name}.pdf"
        lines = []
        for scene in scenes:
            lines.append(
                f"{scene.get('start_tc', '')}-{scene.get('end_tc', '')} {scene.get('description', '')}"
            )
        _write_simple_pdf(export_path, "KinoPro Storyboard Export", lines)
    elif format_key == "images":
        export_path = export_dir / f"{export_name}.zip"
        with zipfile.ZipFile(export_path, "w") as archive:
            added = 0
            for idx, scene in enumerate(scenes, start=1):
                thumb_path = _normalize_media_path(payload.project_id, scene.get("thumbnail_url"))
                if thumb_path and thumb_path.exists():
                    archive.write(thumb_path, arcname=f"scene_{idx:03d}{thumb_path.suffix}")
                    added += 1
            if added == 0:
                archive.writestr("README.txt", "No thumbnails available for this export.")
    elif format_key == "video":
        export_path = export_dir / f"{export_name}.mp4"
        clip_paths = [
            _normalize_media_path(payload.project_id, scene.get("clip_url"))
            for scene in scenes
        ]
        clip_paths = [path for path in clip_paths if path and path.exists()]
        if clip_paths:
            list_path = export_dir / "concat_list.txt"
            list_path.write_text("\n".join([f"file '{path.as_posix()}'" for path in clip_paths]), encoding="utf-8")
            try:
                subprocess.run(
                    [
                        "ffmpeg",
                        "-y",
                        "-f",
                        "concat",
                        "-safe",
                        "0",
                        "-i",
                        str(list_path),
                        "-c",
                        "copy",
                        str(export_path),
                    ],
                    check=True,
                    capture_output=True,
                )
            finally:
                list_path.unlink(missing_ok=True)
        else:
            export_path.write_text("No clips available for export.", encoding="utf-8")
    else:
        export_path = export_dir / f"{export_name}.json"
        export_payload = {
            "project_id": payload.project_id,
            "format": payload.format,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "frames": frames_payload,
            "storyboards": parse_storyboards(record) if not payload.frames else None,
        }
        export_path.write_text(json.dumps(export_payload, indent=2, default=str), encoding="utf-8")

    return {
        "status": "ready",
        "project_id": payload.project_id,
        "format": payload.format,
        "download_url": _media_url(
            payload.project_id,
            f"exports/{export_path.name}",
        ),
    }
