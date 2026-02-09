from __future__ import annotations

import base64
import json
import math
import os
import uuid
from pathlib import Path
from typing import Iterable
from urllib.error import HTTPError
from urllib.request import Request, urlopen

try:
    from openai import OpenAI
except Exception:  # pragma: no cover - optional dependency
    OpenAI = None


def _require_openrouter_key() -> str:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY is not set")
    return api_key


def _openrouter_headers(content_type: str) -> dict[str, str]:
    headers = {
        "Authorization": f"Bearer {_require_openrouter_key()}",
        "Content-Type": content_type,
        "User-Agent": "KinoPro/1.0",
    }
    referer = os.getenv("OPENROUTER_REFERER", "http://localhost")
    headers["HTTP-Referer"] = referer
    headers["X-Title"] = os.getenv("OPENROUTER_APP_TITLE", "KinoPro")
    return headers


def _get_openrouter_client() -> OpenAI:
    if OpenAI is None:
        raise RuntimeError("openai library is not installed")
    return OpenAI(
        api_key=_require_openrouter_key(),
        base_url="https://openrouter.ai/api/v1",
        default_headers={
            "HTTP-Referer": os.getenv("OPENROUTER_REFERER", "http://localhost"),
            "X-Title": os.getenv("OPENROUTER_APP_TITLE", "KinoPro"),
        },
    )


def _post_json(url: str, payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    request = Request(url, data=data, headers=_openrouter_headers("application/json"))
    try:
        with urlopen(request, timeout=180) as response:
            body = response.read().decode("utf-8")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"OpenRouter error {exc.code}: {detail}") from exc
    return json.loads(body)


def _encode_multipart(fields: dict[str, str], files: dict[str, tuple[str, bytes, str]]) -> tuple[bytes, str]:
    boundary = f"----kino-{uuid.uuid4().hex}"
    body = bytearray()

    for name, value in fields.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"))
        body.extend(str(value).encode("utf-8"))
        body.extend(b"\r\n")

    for name, (filename, content, content_type) in files.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(
            f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'.encode("utf-8")
        )
        body.extend(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
        body.extend(content)
        body.extend(b"\r\n")

    body.extend(f"--{boundary}--\r\n".encode("utf-8"))
    return bytes(body), f"multipart/form-data; boundary={boundary}"


def _post_multipart(url: str, fields: dict[str, str], files: dict[str, tuple[str, bytes, str]]) -> dict:
    body, content_type = _encode_multipart(fields, files)
    request = Request(url, data=body, headers=_openrouter_headers(content_type))
    try:
        with urlopen(request, timeout=240) as response:
            raw = response.read().decode("utf-8")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"OpenRouter error {exc.code}: {detail}") from exc
    return json.loads(raw)


def _post_json_with_fallback(payload: dict, endpoints: list[str]) -> dict:
    last_exc: RuntimeError | None = None
    for url in endpoints:
        try:
            return _post_json(url, payload)
        except RuntimeError as exc:
            if "OpenRouter error 405" in str(exc) or "OpenRouter error 404" in str(exc):
                last_exc = exc
                continue
            raise
    raise last_exc or RuntimeError("OpenRouter images endpoint not available")


def _post_multipart_with_fallback(
    fields: dict[str, str],
    files: dict[str, tuple[str, bytes, str]],
    endpoints: list[str],
) -> dict:
    last_exc: RuntimeError | None = None
    for url in endpoints:
        try:
            return _post_multipart(url, fields, files)
        except RuntimeError as exc:
            if "OpenRouter error 405" in str(exc) or "OpenRouter error 404" in str(exc):
                last_exc = exc
                continue
            raise
    raise last_exc or RuntimeError("OpenRouter images endpoint not available")


def _download_url(url: str) -> bytes:
    request = Request(url)
    with urlopen(request, timeout=120) as response:
        return response.read()


def _extract_images(response: dict) -> list[bytes]:
    images: list[bytes] = []
    data = response.get("data") if isinstance(response, dict) else None
    if not isinstance(data, list):
        raise RuntimeError("OpenRouter response missing image data")

    for item in data:
        if not isinstance(item, dict):
            continue
        if "b64_json" in item and item["b64_json"]:
            images.append(base64.b64decode(item["b64_json"]))
            continue
        if "url" in item and item["url"]:
            images.append(_download_url(item["url"]))
    if not images:
        raise RuntimeError("OpenRouter returned no images")
    return images


def _extract_chat_images(response: dict) -> list[bytes]:
    images: list[bytes] = []
    choices = response.get("choices") if isinstance(response, dict) else None
    if not isinstance(choices, list):
        raise RuntimeError("OpenRouter response missing choices")

    if os.getenv("KINO_POSTER_DEBUG", "").lower() in {"1", "true", "yes"}:
        _debug_log_choices(choices)

    for choice in choices:
        if not isinstance(choice, dict):
            continue
        finish_reason = choice.get("finish_reason")
        native_finish = choice.get("native_finish_reason")
        if finish_reason == "IMAGE_SAFETY" or native_finish == "IMAGE_SAFETY":
            raise RuntimeError(
                "OpenRouter blocked image generation due to IMAGE_SAFETY. "
                "Try a safer prompt or deselect violent frames."
            )

    for choice in choices:
        if not isinstance(choice, dict):
            continue
        message = choice.get("message")
        if not isinstance(message, dict):
            continue
        images_field = message.get("images")
        if isinstance(images_field, list):
            for item in images_field:
                if not isinstance(item, dict):
                    continue
                item_type = item.get("type")
                _collect_images_from_part(images, item_type, item)
        content = message.get("content")
        if isinstance(content, list):
            for part in content:
                if not isinstance(part, dict):
                    continue
                part_type = part.get("type")
                _collect_images_from_part(images, part_type, part)
        elif isinstance(content, str):
            _collect_images_from_string(images, content)
    if not images:
        raise RuntimeError("OpenRouter returned no images in chat response")
    return images


def _debug_log_choices(choices: list) -> None:
    print(f"DEBUG: choices count={len(choices)}")
    for idx, choice in enumerate(choices):
        if not isinstance(choice, dict):
            print(f"DEBUG: choice[{idx}] type={type(choice).__name__}")
            continue
        print(f"DEBUG: choice[{idx}] keys={list(choice.keys())}")
        print(
            "DEBUG: choice[{idx}] finish_reason={finish} native_finish_reason={native}".format(
                idx=idx,
                finish=choice.get("finish_reason"),
                native=choice.get("native_finish_reason"),
            )
        )
        message = choice.get("message")
        if not isinstance(message, dict):
            print(f"DEBUG: choice[{idx}] message type={type(message).__name__}")
            continue
        print(f"DEBUG: choice[{idx}] message keys={list(message.keys())}")
        content = message.get("content")
        if isinstance(content, list):
            print(f"DEBUG: choice[{idx}] content list length={len(content)}")
            for part_idx, part in enumerate(content[:5]):
                if not isinstance(part, dict):
                    print(f"DEBUG: choice[{idx}] part[{part_idx}] type={type(part).__name__}")
                    continue
                part_type = part.get("type")
                keys = list(part.keys())
                print(f"DEBUG: choice[{idx}] part[{part_idx}] type={part_type} keys={keys}")
                if "image_url" in part and isinstance(part.get("image_url"), dict):
                    image_url = part.get("image_url") or {}
                    url = image_url.get("url")
                    url_type = type(url).__name__ if url is not None else None
                    url_len = len(url) if isinstance(url, str) else None
                    print(
                        "DEBUG: choice[{idx}] part[{part_idx}] image_url keys={keys} url_type={url_type} url_len={url_len}".format(
                            idx=idx,
                            part_idx=part_idx,
                            keys=list(image_url.keys()),
                            url_type=url_type,
                            url_len=url_len,
                        )
                    )
                if "image" in part and isinstance(part.get("image"), str):
                    print(
                        f"DEBUG: choice[{idx}] part[{part_idx}] image length={len(part.get('image'))}"
                    )
                if "text" in part and isinstance(part.get("text"), str):
                    text_len = len(part.get("text") or "")
                    print(f"DEBUG: choice[{idx}] part[{part_idx}] text length={text_len}")
        elif isinstance(content, str):
            print(f"DEBUG: choice[{idx}] content string length={len(content)}")
        else:
            print(f"DEBUG: choice[{idx}] content type={type(content).__name__}")


def _collect_images_from_string(images: list[bytes], content: str) -> None:
    if content.startswith("data:image"):
        try:
            _, encoded = content.split(",", 1)
        except ValueError:
            encoded = ""
        if encoded:
            images.append(base64.b64decode(encoded))
        return

    # Strip markdown code blocks if present
    cleaned_content = content.strip()
    if cleaned_content.startswith("```json"):
        cleaned_content = cleaned_content[7:]
    elif cleaned_content.startswith("```"):
        cleaned_content = cleaned_content[3:]
    if cleaned_content.endswith("```"):
        cleaned_content = cleaned_content[:-3]
    cleaned_content = cleaned_content.strip()

    try:
        payload = json.loads(cleaned_content)
    except json.JSONDecodeError:
        try:
            payload = json.loads(content)
        except json.JSONDecodeError:
            return

    if isinstance(payload, dict):
        print(f"DEBUG: Payload keys: {list(payload.keys())}")

        # Handle nested response object (model hallucinating API response)
        if "choices" in payload and isinstance(payload["choices"], list):
            print("DEBUG: Found nested choices, recursing")
            try:
                nested_images = _extract_chat_images(payload)
                images.extend(nested_images)
            except RuntimeError:
                pass  # Ignore if nested response has no images
            return

        _collect_images_from_value(images, payload.get("image"))
        _collect_images_from_value(images, payload.get("image_url"))
        _collect_images_from_value(images, payload.get("output_image"))
        image_b64 = payload.get("image") or payload.get("b64")
        if image_b64:
            _collect_images_from_value(images, image_b64)

        # Handle Gemini/Google format
        gemini_images = payload.get("images")
        if isinstance(gemini_images, list):
            print(f"DEBUG: Found gemini_images list with {len(gemini_images)} items")
            for item in gemini_images:
                _collect_images_from_value(images, item)


def _collect_images_from_part(images: list[bytes], part_type: str | None, part: dict) -> None:
    if part_type == "image_url" or part_type == "output_image":
        _collect_images_from_value(images, part.get("image_url"))
        _collect_images_from_value(images, part.get("output_image"))
        return
    if part_type == "image":
        _collect_images_from_value(images, part.get("image"))
        return
    if part_type == "text":
        text_value = part.get("text")
        if isinstance(text_value, str):
            _collect_images_from_string(images, text_value)
        return

    _collect_images_from_value(images, part.get("image_url"))
    _collect_images_from_value(images, part.get("image"))
    _collect_images_from_value(images, part.get("output_image"))


def _collect_images_from_value(images: list[bytes], value: object) -> None:
    if value is None:
        return
    if isinstance(value, dict):
        url = value.get("url")
        if isinstance(url, str):
            _collect_images_from_value(images, url)
            return
        b64_json = (
            value.get("b64_json")
            or value.get("data")
            or value.get("base64")
            or value.get("bytes")
        )
        if isinstance(b64_json, str):
            _collect_images_from_value(images, b64_json)
        return
    if isinstance(value, str):
        if value.startswith("data:"):
            try:
                _, encoded = value.split(",", 1)
            except ValueError:
                encoded = ""
            if encoded:
                images.append(base64.b64decode(encoded))
            return
        if value.startswith("http://") or value.startswith("https://"):
            images.append(_download_url(value))
            return
        try:
            images.append(base64.b64decode(value))
        except Exception as e:
            print(f"DEBUG: Failed to decode base64: {e}")
            return


def _response_to_dict(response: object) -> dict:
    if hasattr(response, "model_dump"):
        return getattr(response, "model_dump")()
    if hasattr(response, "to_dict"):
        return getattr(response, "to_dict")()
    if hasattr(response, "model_dump_json"):
        return json.loads(getattr(response, "model_dump_json")())
    try:
        return json.loads(json.dumps(response, default=lambda o: getattr(o, "__dict__", str(o))))
    except Exception:
        return {}


def _detect_content_type(path: Path) -> str:
    ext = path.suffix.lower()
    if ext == ".png":
        return "image/png"
    if ext in {".jpg", ".jpeg"}:
        return "image/jpeg"
    if ext == ".webp":
        return "image/webp"
    return "application/octet-stream"


def _image_to_data_url(path: Path) -> str:
    content_type = _detect_content_type(path)
    encoded = base64.b64encode(path.read_bytes()).decode("utf-8")
    return f"data:{content_type};base64,{encoded}"


def _fit_cover(image, width: int, height: int):
    import cv2  # type: ignore

    img_h, img_w = image.shape[:2]
    scale = max(width / img_w, height / img_h)
    resized = cv2.resize(
        image,
        (int(img_w * scale), int(img_h * scale)),
        interpolation=cv2.INTER_AREA,
    )
    start_y = max(0, (resized.shape[0] - height) // 2)
    start_x = max(0, (resized.shape[1] - width) // 2)
    return resized[start_y:start_y + height, start_x:start_x + width]


def _build_reference_collage(images: list[Path], output_dir: Path) -> tuple[Path | None, bool]:
    if not images:
        return None, False

    if len(images) == 1:
        return images[0], False

    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore
    except Exception:
        return images[0], False

    max_refs = int(os.getenv("KINO_POSTER_REF_MAX", "6"))
    tile_w = int(os.getenv("KINO_POSTER_REF_TILE_W", "512"))
    tile_h = int(os.getenv("KINO_POSTER_REF_TILE_H", "512"))

    usable = [path for path in images if path.exists()]
    usable = usable[:max_refs] if usable else images[:1]
    if len(usable) == 1:
        return usable[0], False

    count = len(usable)
    cols = int(math.ceil(math.sqrt(count)))
    rows = int(math.ceil(count / cols))

    canvas = np.zeros((rows * tile_h, cols * tile_w, 3), dtype=np.uint8)

    for idx, path in enumerate(usable):
        image = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
        if image is None:
            continue
        if image.shape[-1] == 4:
            image = cv2.cvtColor(image, cv2.COLOR_BGRA2BGR)
        image = _fit_cover(image, tile_w, tile_h)
        row = idx // cols
        col = idx % cols
        y0 = row * tile_h
        x0 = col * tile_w
        canvas[y0:y0 + tile_h, x0:x0 + tile_w] = image

    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"poster_ref_{uuid.uuid4().hex[:10]}.png"
    cv2.imwrite(str(output_path), canvas)
    return output_path, True


def generate_posters(
    prompt: str,
    size: str,
    variants: int,
    reference_images: list[Path] | None = None,
    reference_dir: Path | None = None,
) -> list[bytes]:
    model = os.getenv("OPENROUTER_IMAGE_MODEL", "google/gemini-2.5-flash-image")
    reference_images = [path for path in (reference_images or []) if path.exists()]
    max_refs = int(os.getenv("KINO_POSTER_REF_MAX", "6"))
    reference_images = reference_images[:max_refs]

    content = [
        {
            "type": "text",
            "text": f"{prompt}\nTarget size: {size}.",
        }
    ]

    for path in reference_images:
        content.append(
            {
                "type": "image_url",
                "image_url": {"url": _image_to_data_url(path)},
            }
        )

    payload = {
        "model": model,
        "n": variants,
        "modalities": ["text", "image"],
        "max_tokens": 1024,
        "messages": [
            {
                "role": "user",
                "content": content,
            }
        ],
    }

    try:
        client = _get_openrouter_client()
        response = client.chat.completions.create(**payload)
        response_dict = _response_to_dict(response)
    except Exception:
        response_dict = _post_json("https://openrouter.ai/api/v1/chat/completions", payload)

    # print(f"RESPONSE DICT::::::::::{response_dict}")
    print(f"DEBUG: Payload keys: {list(response_dict.keys())}")
    # print(f"DEBUG: Response choices: {response_dict.get('choices')}")
    images = _extract_chat_images(response_dict)

    if len(images) < variants:
        remaining = variants - len(images)
        attempts = 0
        while remaining > 0 and attempts < 3:
            payload["n"] = remaining
            try:
                client = _get_openrouter_client()
                response = client.chat.completions.create(**payload)
                response_dict = _response_to_dict(response)
            except Exception:
                response_dict = _post_json("https://openrouter.ai/api/v1/chat/completions", payload)
            extra = _extract_chat_images(response_dict)
            images.extend(extra)
            remaining = variants - len(images)
            attempts += 1

    return images[:variants]
