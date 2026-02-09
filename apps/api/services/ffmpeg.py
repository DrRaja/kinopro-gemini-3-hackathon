from __future__ import annotations

from dataclasses import dataclass
import os
import subprocess


def _parse_thumbnail_offsets(raw: str | None) -> tuple[int, ...]:
    if raw is None or not raw.strip():
        return (0,)

    parsed: list[int] = []
    for part in raw.split(","):
        token = part.strip()
        if not token:
            continue
        try:
            parsed.append(int(token))
        except ValueError:
            continue

    if not parsed:
        return (0,)

    # Preserve order while removing duplicates.
    return tuple(dict.fromkeys(parsed))


@dataclass(frozen=True)
class ClipRequest:
    input_path: str
    start_tc: str
    end_tc: str
    output_path: str


def build_nvenc_clip_command(request: ClipRequest) -> list[str]:
    return [
        "ffmpeg",
        "-y",
        "-ss",
        request.start_tc,
        "-to",
        request.end_tc,
        "-i",
        request.input_path,
        "-c:v",
        "h264_nvenc",
        "-preset",
        "p1",
        "-tune",
        "ll",
        "-rc",
        "vbr",
        "-cq",
        "23",
        "-b:v",
        "0",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        request.output_path,
    ]


def build_x264_clip_command(request: ClipRequest) -> list[str]:
    preset = os.getenv("KINO_FFMPEG_PRESET", "ultrafast")
    crf = os.getenv("KINO_FFMPEG_CRF", "18")
    return [
        "ffmpeg",
        "-y",
        "-ss",
        request.start_tc,
        "-to",
        request.end_tc,
        "-i",
        request.input_path,
        "-c:v",
        "libx264",
        "-preset",
        preset,
        "-crf",
        crf,
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        request.output_path,
    ]


def timecode_to_seconds(timecode: str, fps: int) -> float:
    parts = timecode.split(":")
    if len(parts) == 3:
        hours, minutes, rest = parts
    elif len(parts) == 2:
        hours = "0"
        minutes, rest = parts
    elif len(parts) == 1:
        hours = "0"
        minutes = "0"
        rest = parts[0]
    else:
        raise ValueError(f"Invalid timecode format: {timecode}")

    if "." in rest:
        seconds_str, frames_str = rest.split(".", 1)
    else:
        seconds_str, frames_str = rest, "0"

    total_seconds = (int(hours) * 3600) + (int(minutes) * 60) + int(seconds_str)
    return total_seconds + (int(frames_str) / fps)


def seconds_to_timecode(seconds: float, fps: int) -> str:
    clamped = max(0, seconds)
    total_frames = int(clamped * fps)
    frame = total_frames % fps
    total_seconds = total_frames // fps
    sec = total_seconds % 60
    minutes = (total_seconds // 60) % 60
    hours = total_seconds // 3600
    return f"{hours:02d}:{minutes:02d}:{sec:02d}.{frame:02d}"


def build_thumbnail_commands(
    input_path: str,
    thumbnail_tc: str,
    output_dir: str,
    offsets: tuple[int, ...] | None = None,
    fps: int = 24,
) -> list[list[str]]:
    if offsets is None:
        offsets = _parse_thumbnail_offsets(os.getenv("KINO_THUMBNAIL_OFFSETS", "0"))

    commands = []
    base_seconds = timecode_to_seconds(thumbnail_tc, fps)

    for offset in offsets:
        suffix = f"{offset:+d}".replace("+", "p").replace("-", "m")
        output_path = f"{output_dir}/thumb_{suffix}.webp"
        offset_seconds = base_seconds + (offset / fps)
        candidate_tc = seconds_to_timecode(offset_seconds, fps)
        commands.append(
            [
                "ffmpeg",
                "-y",
                "-ss",
                candidate_tc,
                "-i",
                input_path,
                "-frames:v",
                "1",
                "-vf",
                "scale=1280:-2",
                "-c:v",
                "libwebp",
                "-quality",
                "80",
                output_path,
            ]
        )
    return commands


def probe_duration(input_path: str) -> float:
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=nokey=1:noprint_wrappers=1",
                input_path,
            ],
            check=True,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError:
        return 0.0
    except subprocess.CalledProcessError:
        return 0.0

    try:
        return float(result.stdout.strip())
    except ValueError:
        return 0.0
