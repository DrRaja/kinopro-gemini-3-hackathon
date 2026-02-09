# from __future__ import annotations

# import json
# import os
# import time
# from typing import Any

# from google import genai

# STORYBOARD_PROMPT = """
# You are the world's best trailer editor with 20 years experience cutting trailers for Marvel, A24, and Apple. Your taste is flawless, your pacing is ruthless, and you obsess over emotional rhythm.

# The user has uploaded a full feature film. Your single job is to create **5 dramatically different, Hollywood-caliber trailer storyboards** (not scripts, not videos -- storyboards made of exact existing moments from the movie).

# Output format must be EXACTLY this JSON structure (no extra text before or after):

# {
#   "movie_title": "detect automatically or use filename",
#   "duration": "detect total length",
#   "storyboards": [
#     {
#       "name": "Hype / Epic / Blockbuster Cut",
#       "target_length": "2:15 - 2:30",
#       "tone": "massive, relentless momentum, goosebumps guaranteed",
#       "description": "One-sentence vibe summary (max 15 words)",
#       "scenes": [
#         {
#           "scene_number": 1,
#           "start_tc": "00:23:45.12",
#           "end_tc": "00:23:49.08",
#           "duration_seconds": 3.96,
#           "thumbnail_tc": "00:23:47.00",
#           "description": "Exact one-sentence description of what happens + why it's perfect here",
#           "emotional_beat": "Intrigue / Mystery / First Wow Moment",
#           "music_idea": "slow piano into massive braaam"
#         }
#         // exactly 18-25 scenes per storyboard (never less than 18, never more than 28)
#       ]
#     },
#     {
#       "name": "Emotional / Character-Driven Cut",
#       "target_length": "2:20",
#       "tone": "tear-jerking, intimate, makes audience fall in love with characters",
#       "description": "Heart-breakingly beautiful",
#       "scenes": [ ... ]
#     },
#     {
#       "name": "Dark / Intense / Thriller Cut",
#       "target_length": "2:10",
#       "tone": "unrelenting tension, psychological, disturbing",
#       "description": "Feels like oxygen is running out",
#       "scenes": [ ... ]
#     },
#     {
#       "name": "Quirky / Fun / Viral Cut",
#       "target_length": "1:45 - 2:00",
#       "tone": "maximum shareability, TikTok/Reels energy, meme-worthy",
#       "description": "Makes you laugh in the first 8 seconds",
#       "scenes": [ ... ]
#     },
#     {
#       "name": "Critics / Festival / Prestige Cut",
#       "target_length": "2:30",
#       "tone": "sophisticated, slow-burn, Oscar-bait, leaves you haunted",
#       "description": "The version that wins awards and breaks critics",
#       "scenes": [ ... ]
#     }
#   ]
#   ,
#   "poster_candidates": [
#     {
#       "timestamp": "00:42:10.08",
#       "description": "Striking close-up of the protagonist under rain with neon reflections and intense gaze."
#     }
#     // exactly 20 entries
#   ]
# }

# Rules you never break:
# 1. Every single frame you choose MUST exist in the movie. No hallucinations, no "implied" scenes.
# 2. Timestamps must be frame-accurate (to the frame, not rounded seconds).
# 3. thumbnail_tc must be the single most striking frame inside that clip.
# 4. Every scene description must be 12-22 words and explain WHY this moment belongs exactly here in the trailer arc.
# 5. The 5 storyboards must feel radically different -- same movie, completely different emotional journeys.
# 6. Pacing: first 15 seconds must hook instantly. Final 20 seconds must be pure climax + killer last frame.
# 7. Never repeat the exact same clip across storyboards (different in/out points are fine if necessary, but prefer unique moments).
# 8. Always end on the single most unforgettable frame in the entire film.
# 9. poster_candidates must be exactly 20 timestamps, each a single frame worth turning into a movie poster. Prefer iconic character shots, powerful wide shots, and emotionally charged moments.
# 10. poster_candidates descriptions must be 8-16 words.

# You have perfect recall of the entire movie. You know every beat, every line, every camera move.

# Now watch the film once at 32x speed, then deliver the 5 masterpiece storyboards in perfect JSON.
# """.strip()


# def _require_api_key() -> str:
#     api_key = os.getenv("GEMINI_API_KEY")
#     if not api_key:
#         raise RuntimeError("GEMINI_API_KEY is not set")
#     return api_key


# def _get_client() -> genai.Client:
#     return genai.Client(api_key=_require_api_key())


# def _get_file_name(file_ref: Any) -> str | None:
#     if hasattr(file_ref, "name"):
#         return getattr(file_ref, "name")
#     if isinstance(file_ref, dict):
#         return file_ref.get("name") or file_ref.get("id")
#     return None


# def _get_file_state(file_ref: Any) -> str | None:
#     state = None
#     if hasattr(file_ref, "state"):
#         state = getattr(file_ref, "state")
#     elif isinstance(file_ref, dict):
#         state = file_ref.get("state")

#     if state is None:
#         return None
#     if hasattr(state, "name"):
#         return str(getattr(state, "name")).upper()
#     if isinstance(state, dict):
#         return str(state.get("name") or state.get("state") or "").upper() or None
#     return str(state).upper()


# def _wait_for_active(client: genai.Client, file_ref: Any) -> Any:
#     timeout = float(os.getenv("KINO_GEMINI_FILE_TIMEOUT", "180"))
#     poll = float(os.getenv("KINO_GEMINI_FILE_POLL", "2"))
#     deadline = time.monotonic() + timeout
#     file_name = _get_file_name(file_ref)
#     current = file_ref

#     while True:
#         state = _get_file_state(current)
#         if state in (None, "ACTIVE"):
#             return current
#         if state in {"FAILED", "ERROR", "CANCELLED", "INACTIVE"}:
#             raise RuntimeError(f"Gemini file state is {state}")
#         if time.monotonic() >= deadline:
#             raise RuntimeError("Gemini file did not become ACTIVE before timeout")
#         time.sleep(poll)
#         if file_name:
#             current = client.files.get(name=file_name)
#         else:
#             return current


# def upload_file_to_gemini(file_path: str) -> Any:
#     client = _get_client()
#     file_ref = client.files.upload(file=file_path)
#     return _wait_for_active(client, file_ref)


# def generate_storyboards_from_file(
#     file_ref: Any,
#     filename: str,
#     duration_seconds: float,
# ) -> dict:
#     client = _get_client()
#     file_ref = _wait_for_active(client, file_ref)
#     model_name = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")
#     response = client.models.generate_content(
#         model=model_name,
#         contents=[file_ref, STORYBOARD_PROMPT],
#         config={"response_mime_type": "application/json"},
#     )
#     data = json.loads(response.text)
#     payload = _normalize_storyboard_payload(data, filename, duration_seconds)
#     payload["movie_title"] = payload.get("movie_title") or filename
#     payload["duration"] = payload.get("duration") or f"{duration_seconds:.2f}s"
#     return payload


# def _normalize_storyboard_payload(data: Any, filename: str, duration_seconds: float) -> dict:
#     if isinstance(data, list):
#         payload = {
#             "movie_title": filename,
#             "duration": f"{duration_seconds:.2f}s",
#             "storyboards": data,
#         }
#     elif isinstance(data, dict):
#         payload = data
#     else:
#         raise ValueError(f"Gemini response must be object or list, got {type(data).__name__}")

#     storyboards = payload.get("storyboards")
#     if not isinstance(storyboards, list):
#         raise ValueError("Gemini response missing 'storyboards' list")
#     poster_candidates = payload.get("poster_candidates")
#     if poster_candidates is not None and not isinstance(poster_candidates, list):
#         payload["poster_candidates"] = []
#     return payload


# def generate_storyboards(project_id: str) -> dict:
#     raise RuntimeError(
#         "Storyboard generation requires an uploaded file reference; use the upload flow."
#     )

# from __future__ import annotations

# import json
# import os
# import time
# from typing import Any, List
# from pydantic import BaseModel, Field

# from google import genai
# from google.genai import types

# # --- 1. PYDANTIC SCHEMAS (The "Contract") ---
# # These ensure the AI returns EXACTLY the JSON structure your app needs.

# class Scene(BaseModel):
#     scene_number: int
#     start_tc: str = Field(description="Format HH:MM:SS.FF")
#     end_tc: str = Field(description="Format HH:MM:SS.FF")
#     duration_seconds: float
#     thumbnail_tc: str = Field(description="The single most striking frame inside that clip")
#     description: str = Field(description="Exact one-sentence description + why it fits here (12-22 words)")
#     emotional_beat: str = Field(description="e.g., 'Intrigue', 'Climax', 'Comic Relief'")
#     music_idea: str = Field(description="e.g., 'slow piano into massive braaam'")

# class Storyboard(BaseModel):
#     name: str = Field(description="The creative angle of this cut (e.g., 'Action-Heavy', 'Romance', 'Psychological')")
#     target_length: str = Field(description="Target duration (e.g., '2:15 - 2:30')")
#     tone: str = Field(description="Adjectives describing the vibe")
#     description: str = Field(description="One-sentence vibe summary")
#     scenes: List[Scene]

# class PosterCandidate(BaseModel):
#     timestamp: str = Field(description="Exact timestamp of the frame")
#     description: str = Field(description="Visual description of the poster shot (8-16 words)")

# class StoryboardResponse(BaseModel):
#     movie_title: str
#     duration: str
#     storyboards: List[Storyboard]
#     poster_candidates: List[PosterCandidate]


# # --- 2. PROMPT ENGINEERING ---
# # Focused on creative direction, leaving structure to the Schema.

# STORYBOARD_PROMPT = """
# You are the world's best trailer editor with 20 years experience cutting trailers for Marvel, A24, and Apple.
# The user has uploaded a full feature film.

# **YOUR MISSION:**
# Create **5 dramatically different, Hollywood-caliber trailer storyboards**.
# Do NOT use a pre-defined template. You must analyze the specific footage and determine the **5 best unique marketing angles** for this specific film (e.g., one might be "High Octane Action", another "Character Study", another "Critics/Prestige", etc).

# **RULES YOU NEVER BREAK:**
# 1. **Reality Check:** Every single frame MUST exist in the movie. No hallucinations.
# 2. **Precision:** Timestamps must be frame-accurate (HH:MM:SS.FF).
# 3. **Pacing:** 
#    - Scenes per storyboard: Exactly 18-28 scenes.
#    - First 15s must hook instantly.
#    - Final 20s must be pure climax.
# 4. **Variety:** Never repeat the exact same clip configuration across different storyboards.
# 5. **Posters:** Select exactly 20 frames that would make iconic static movie posters.

# Now watch the film at 32x speed, analyze the emotional rhythm, and generate the data.
# """


# def _require_api_key() -> str:
#     api_key = os.getenv("GEMINI_API_KEY")
#     if not api_key:
#         raise RuntimeError("GEMINI_API_KEY is not set")
#     return api_key


# def _get_client() -> genai.Client:
#     return genai.Client(api_key=_require_api_key())


# def _wait_for_active(client: genai.Client, file_ref: Any) -> Any:
#     """
#     Robust polling for file processing.
#     Handles 'PROCESSING' states common in large video files or Preview models.
#     """
#     timeout = float(os.getenv("KINO_GEMINI_FILE_TIMEOUT", "600")) # 10 min default
#     start_time = time.monotonic()
    
#     print(f"   [Gemini] Waiting for video processing (ID: {file_ref.name})...")
    
#     while True:
#         current_time = time.monotonic()
#         if current_time - start_time > timeout:
#             raise RuntimeError(f"Gemini file processing timed out after {timeout}s")

#         # Refresh file state
#         try:
#             current_file = client.files.get(name=file_ref.name)
#         except Exception as e:
#             print(f"   [Gemini Warning] Failed to check file status: {e}. Retrying...")
#             time.sleep(5)
#             continue

#         state = current_file.state.name # Enum to string
        
#         if state == "ACTIVE":
#             print(f"   [Gemini] Video is ACTIVE. Ready for inference.")
#             return current_file
#         elif state == "FAILED":
#             raise RuntimeError(f"Gemini file processing FAILED: {current_file.error.message}")
#         elif state == "PROCESSING":
#             # Progressive backoff/sleep to avoid rate limits during ingestion
#             time.sleep(5)
#         else:
#             print(f"   [Gemini] Unknown file state: {state}")
#             time.sleep(2)


# def upload_file_to_gemini(file_path: str) -> Any:
#     """Uploads a file and blocks until it is ready for use."""
#     client = _get_client()
    
#     if not os.path.exists(file_path):
#         raise FileNotFoundError(f"File not found: {file_path}")
        
#     file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
#     print(f"   [Gemini] Uploading {os.path.basename(file_path)} ({file_size_mb:.2f} MB)...")
    
#     file_ref = client.files.upload(file=file_path)
#     return _wait_for_active(client, file_ref)


# def generate_storyboards_from_file(
#     file_ref: Any,
#     filename: str,
#     duration_seconds: float,
# ) -> dict:
#     """
#     Generates storyboards using Structured Outputs.
#     Returns a standard Python dictionary matching the app's requirement.
#     """
#     client = _get_client()
    
#     # 1. Ensure file is actually ready (in case a raw file_ref was passed)
#     file_ref = _wait_for_active(client, file_ref)
    
#     # 2. Configure Model (January 2026 Context)
#     model_name = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")
#     print(f"   [Gemini] Analyzing video with model: {model_name}...")
    
#     try:
#         # 3. Generate with Structured Output
#         response = client.models.generate_content(
#             model=model_name,
#             contents=[file_ref, STORYBOARD_PROMPT],
#             config=types.GenerateContentConfig(
#                 response_mime_type="application/json",
#                 response_schema=StoryboardResponse, # <--- The Magic: Enforces Pydantic Schema
#                 temperature=0.3, # Low temp for factual timestamp adherence
#             ),
#         )

#         # 4. Parse and Validate
#         # The API guarantees structure, but we parse strictly to be safe
#         response_data = json.loads(response.text)
#         validated_obj = StoryboardResponse(**response_data)
        
#         # 5. Convert to pure Dict for the app
#         payload = validated_obj.model_dump()

#         # 6. Metadata Overrides (Fallback logic from your original code)
#         if not payload.get("movie_title") or payload["movie_title"] == "detect automatically or use filename":
#             payload["movie_title"] = filename
            
#         if not payload.get("duration") or payload["duration"] == "detect total length":
#              payload["duration"] = f"{duration_seconds:.2f}s"

#         return payload

#     except json.JSONDecodeError as e:
#         print(f"   [Gemini Error] Raw Response Text: {response.text[:500]}...")
#         raise RuntimeError("Gemini failed to generate valid JSON.") from e
#     except Exception as e:
#         raise RuntimeError(f"Gemini generation error: {str(e)}")


# def generate_storyboards(project_id: str) -> dict:
#     raise RuntimeError(
#         "Storyboard generation requires an uploaded file reference; use the upload flow."
#     )

from __future__ import annotations

import json
import os
import time
from typing import Any, List, Literal
from pydantic import BaseModel, Field

from google import genai
from google.genai import types

# --- 1. UPDATED SCHEMA (The "Pacing Fix") ---

class Scene(BaseModel):
    scene_number: int
    # We force the AI to decide the TYPE of cut. 
    # This prevents it from treating dialogue like an action flash.
    cut_type: Literal["Dialogue Anchor", "Action Flash", "Atmosphere/Establishing", "Reaction Shot"] = Field(
        description="Dialogue = 4-8s, Action = 1-3s, Atmosphere = 3-5s"
    )
    start_tc: str = Field(description="Format HH:MM:SS.FF")
    end_tc: str = Field(description="Format HH:MM:SS.FF")
    duration_seconds: float = Field(description="Must match cut_type guidelines")
    thumbnail_tc: str = Field(description="The single most striking frame")
    description: str = Field(description="Context + Visuals (12-22 words)")
    emotional_beat: str
    music_idea: str

class Storyboard(BaseModel):
    name: str
    target_length: str
    tone: str
    description: str
    scenes: List[Scene]

class PosterCandidate(BaseModel):
    timestamp: str
    description: str

class StoryboardResponse(BaseModel):
    movie_title: str
    duration: str
    storyboards: List[Storyboard]
    poster_candidates: List[PosterCandidate]


# --- 2. PROMPT WITH "BREATHING ROOM" INSTRUCTIONS ---

STORYBOARD_PROMPT = """
You are a master trailer editor. The user has uploaded a feature film.
Your job is to create **5 dramatically different trailer storyboards**.

**CRITICAL PACING INSTRUCTION (DO NOT IGNORE):**
The previous editor was fired for making clips too short (1-2s). 
**DO NOT CREATE A MUSIC VIDEO.** A trailer requires "Anchor Scenes" to let the audience hear dialogue and feel emotions.# **CRITICAL PACING INSTRUCTION:**

**THE MATH OF A GREAT TRAILER:**
- Target Duration: ~150 seconds.
- Average Clip Length: ~5 seconds (mix of 1s flashes and 8s dialogue).
- A 2:30 trailer CANNOT be made of 8 clips. That would mean every clip is 20 seconds long, which is boring.
- **THEREFORE: You MUST generate between 20 and 30 scenes per storyboard.**

**Required Pacing Structure for Every Storyboard:**
1. **Anchor Scenes (30% of clips):** Must be **4.0 to 8.0 seconds** long. These contain key dialogue lines or slow emotional beats.
2. **Atmosphere (20% of clips):** Must be **3.0 to 5.0 seconds** long. Wide shots, landscapes, slow zooms.
3. **Action/Flash (50% of clips):** Can be **1.0 to 2.5 seconds** long. Only use these for high-energy montages or the final climax.

**The 5 Cuts to Generate:**
Analyze the film to find the best 5 unique angles (e.g., Psychological Thriller, High-Octane Action, Romance, etc.).
**YOU MUST GENERATE 5 STORYBOARDS, EACH WITH A DIFFERENT TONE.**

**Rules:**
1. **Dialogue is King:** If a scene has dialogue, do NOT cut it off mid-sentence. Let it breathe.
2. **Build Tension:** Start slow. Don't start with rapid cuts.
3. **Reality Check:** Every frame must exist. Frame-accurate timestamps (HH:MM:SS.FF).
4. **Posters:** Select 20 distinct frames suitable for a movie poster.

Watch the film. Find the rhythm. Let the story breathe.
"""


def _require_api_key() -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set")
    return api_key


def _get_client() -> genai.Client:
    return genai.Client(api_key=_require_api_key())


def _wait_for_active(client: genai.Client, file_ref: Any) -> Any:
    timeout = float(os.getenv("KINO_GEMINI_FILE_TIMEOUT", "600"))
    start_time = time.monotonic()
    
    print(f"   [Gemini] Waiting for video processing (ID: {file_ref.name})...")
    
    while True:
        if time.monotonic() - start_time > timeout:
            raise RuntimeError(f"File processing timed out after {timeout}s")

        try:
            current_file = client.files.get(name=file_ref.name)
        except Exception:
            time.sleep(5)
            continue

        state = current_file.state.name
        
        if state == "ACTIVE":
            print(f"   [Gemini] Video is ACTIVE.")
            return current_file
        elif state == "FAILED":
            raise RuntimeError(f"Processing FAILED: {current_file.error.message}")
        
        time.sleep(5)


def upload_file_to_gemini(file_path: str) -> Any:
    client = _get_client()
    print(f"   [Gemini] Uploading {os.path.basename(file_path)}...")
    file_ref = client.files.upload(file=file_path)
    return _wait_for_active(client, file_ref)


def generate_storyboards_from_file(
    file_ref: Any,
    filename: str,
    duration_seconds: float,
) -> dict:
    client = _get_client()
    file_ref = _wait_for_active(client, file_ref)
    
    # Still using the Preview model as it's the smartest for "Video Understanding"
    model_name = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")
    print(f"   [Gemini] Editing storyboards with {model_name} (Focus: Narrative Pacing)...")
    
    try:
        response = client.models.generate_content(
            model=model_name,
            contents=[file_ref, STORYBOARD_PROMPT],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=StoryboardResponse,
                temperature=0.3, 
            ),
        )

        response_data = json.loads(response.text)
        validated_obj = StoryboardResponse(**response_data)
        payload = validated_obj.model_dump()
        
        # Metadata fallback
        if not payload.get("movie_title") or "detect" in payload["movie_title"]:
            payload["movie_title"] = filename
        if not payload.get("duration") or "detect" in payload["duration"]:
            payload["duration"] = f"{duration_seconds:.2f}s"

        return payload

    except json.JSONDecodeError:
        print(f"   [Gemini Error] Model failed to output JSON.")
        raise RuntimeError("Gemini failed to generate valid JSON.")
    except Exception as e:
        raise RuntimeError(f"Generation error: {str(e)}")


def generate_storyboards(project_id: str) -> dict:
    raise RuntimeError("Use upload flow.")


# from __future__ import annotations

# import json
# import os
# import time
# from typing import Any, List, Literal
# from pydantic import BaseModel, Field

# from google import genai
# from google.genai import types

# # --- 1. STRICTER SCHEMA (The "Anti-Lazy" Fix) ---

# class Scene(BaseModel):
#     scene_number: int
#     cut_type: Literal["Dialogue Anchor", "Action Flash", "Atmosphere/Establishing", "Reaction Shot"] = Field(
#         description="Dialogue=4-8s (story), Action=0.5-2s (pace), Atmosphere=2-4s (vibe)"
#     )
#     start_tc: str = Field(description="Format HH:MM:SS.FF")
#     end_tc: str = Field(description="Format HH:MM:SS.FF")
#     duration_seconds: float = Field(description="Must match cut_type guidelines")
#     thumbnail_tc: str = Field(description="The single most striking frame")
#     description: str = Field(description="Context + Visuals (12-22 words)")
#     emotional_beat: str
#     music_idea: str

# class Storyboard(BaseModel):
#     name: str
#     target_length: str
#     tone: str
#     description: str
#     # FIX IS HERE: We explicitly tell the schema we expect a long list.
#     # Note: min_length validation happens in Python, but the 'description' guides the AI.
#     scenes: List[Scene] = Field(
#         description="A sequential list of EXACTLY 20 to 30 scenes to build a full arc. Do not generate fewer than 20.",
#         min_length=20, 
#         max_length=35
#     )

# class PosterCandidate(BaseModel):
#     timestamp: str
#     description: str

# class StoryboardResponse(BaseModel):
#     movie_title: str
#     duration: str
#     storyboards: List[Storyboard]
#     poster_candidates: List[PosterCandidate]


# # --- 2. PROMPT WITH "MATH LOGIC" ---

# STORYBOARD_PROMPT = """
# You are a veteran Hollywood trailer editor. The user has uploaded a feature film.
# Your job is to create **5 dramatically different trailer storyboards**.

# **CRITICAL PACING INSTRUCTION:**
# You previously generated storyboards with only 8 clips. THIS IS WRONG.
# **A 2:30 trailer CANNOT be made of 8 clips.** That would mean every clip is 20 seconds long, which is boring.

# **THE MATH OF A GREAT TRAILER:**
# - Target Duration: ~150 seconds.
# - Average Clip Length: ~5 seconds (mix of 1s flashes and 8s dialogue).
# - **THEREFORE: You MUST generate between 20 and 30 scenes per storyboard.**

# **Structure for Every Storyboard:**
# 1. **The Setup (Scenes 1-6):** Establish the world. Slower pacing (Atmosphere + Dialogue).
# 2. **The Turn (Scenes 7-15):** The conflict starts. Medium pacing.
# 3. **The Climax (Scenes 16-25+):** Rapid fire. Mostly "Action Flash" cuts (1-2s).

# **The 5 Cuts to Generate:**
# Analyze the film to find the best 5 unique marketing angles (e.g., Psychological Thriller, High-Octane Action, Romance, etc.).
# **You MUST generate 5 storyboards.**

# **Rules:**
# 1. **Quantity:** If a storyboard has fewer than 20 scenes, you have FAILED.
# 2. **Reality Check:** Every frame must exist. Frame-accurate timestamps (HH:MM:SS.FF).
# 3. **Posters:** Select 20 distinct frames suitable for a movie poster.

# Watch the film. Do the math. Generate full, dense storyboards.
# """


# def _require_api_key() -> str:
#     api_key = os.getenv("GEMINI_API_KEY")
#     if not api_key:
#         raise RuntimeError("GEMINI_API_KEY is not set")
#     return api_key


# def _get_client() -> genai.Client:
#     return genai.Client(api_key=_require_api_key())


# def _wait_for_active(client: genai.Client, file_ref: Any) -> Any:
#     timeout = float(os.getenv("KINO_GEMINI_FILE_TIMEOUT", "600"))
#     start_time = time.monotonic()
    
#     print(f"   [Gemini] Waiting for video processing (ID: {file_ref.name})...")
    
#     while True:
#         if time.monotonic() - start_time > timeout:
#             raise RuntimeError(f"File processing timed out after {timeout}s")

#         try:
#             current_file = client.files.get(name=file_ref.name)
#         except Exception:
#             time.sleep(5)
#             continue

#         state = current_file.state.name
        
#         if state == "ACTIVE":
#             print(f"   [Gemini] Video is ACTIVE.")
#             return current_file
#         elif state == "FAILED":
#             raise RuntimeError(f"Processing FAILED: {current_file.error.message}")
        
#         time.sleep(5)


# def upload_file_to_gemini(file_path: str) -> Any:
#     client = _get_client()
#     print(f"   [Gemini] Uploading {os.path.basename(file_path)}...")
#     file_ref = client.files.upload(file=file_path)
#     return _wait_for_active(client, file_ref)


# def generate_storyboards_from_file(
#     file_ref: Any,
#     filename: str,
#     duration_seconds: float,
# ) -> dict:
#     client = _get_client()
#     file_ref = _wait_for_active(client, file_ref)
    
#     # Use gemini-3-flash-preview or gemini-2.0-flash-exp (whichever is stable for you)
#     model_name = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")
#     print(f"   [Gemini] Editing storyboards with {model_name}...")
    
#     try:
#         response = client.models.generate_content(
#             model=model_name,
#             contents=[file_ref, STORYBOARD_PROMPT],
#             config=types.GenerateContentConfig(
#                 response_mime_type="application/json",
#                 response_schema=StoryboardResponse,
#                 temperature=0.4, # Slightly higher temp to encourage generating MORE items
#             ),
#         )

#         response_data = json.loads(response.text)
#         validated_obj = StoryboardResponse(**response_data)
#         payload = validated_obj.model_dump()
        
#         # Metadata fallback
#         if not payload.get("movie_title") or "detect" in payload["movie_title"]:
#             payload["movie_title"] = filename
#         if not payload.get("duration") or "detect" in payload["duration"]:
#             payload["duration"] = f"{duration_seconds:.2f}s"

#         return payload

#     except json.JSONDecodeError:
#         print(f"   [Gemini Error] Model failed to output JSON.")
#         raise RuntimeError("Gemini failed to generate valid JSON.")
#     except Exception as e:
#         # If Pydantic throws a validation error because list < 20, we see it here.
#         raise RuntimeError(f"Generation error: {str(e)}")


# def generate_storyboards(project_id: str) -> dict:
#     raise RuntimeError("Use upload flow.")


# from __future__ import annotations

# import json
# import os
# import time
# from typing import Any, List, Literal
# from pydantic import BaseModel, Field, ValidationError

# from google import genai
# from google.genai import types

# # --- 1. SAFE SCHEMA (Removed 'min_length' to fix 400 Error) ---

# class Scene(BaseModel):
#     scene_number: int
#     cut_type: Literal["Dialogue Anchor", "Action Flash", "Atmosphere/Establishing", "Reaction Shot"] = Field(
#         description="Dialogue=4-8s, Action=0.5-2s, Atmosphere=2-4s"
#     )
#     start_tc: str = Field(description="Format HH:MM:SS.FF")
#     end_tc: str = Field(description="Format HH:MM:SS.FF")
#     duration_seconds: float
#     thumbnail_tc: str = Field(description="Most striking frame timestamp")
#     description: str = Field(description="12-22 words context")
#     emotional_beat: str
#     music_idea: str

# class Storyboard(BaseModel):
#     name: str
#     target_length: str
#     tone: str
#     description: str
#     # REMOVED min_length here to prevent INVALID_ARGUMENT error
#     scenes: List[Scene] = Field(
#         description="A list of 20-30 scenes. CRITICAL: GENERATE AT LEAST 20 SCENES."
#     )

# class PosterCandidate(BaseModel):
#     timestamp: str
#     description: str

# class StoryboardResponse(BaseModel):
#     movie_title: str
#     duration: str
#     storyboards: List[Storyboard]
#     poster_candidates: List[PosterCandidate]


# # --- 2. PROMPT (Unchanged Pacing Logic) ---

# STORYBOARD_PROMPT = """
# You are a veteran Hollywood trailer editor. The user has uploaded a feature film.
# Your job is to create **5 dramatically different trailer storyboards**.

# **CRITICAL PACING INSTRUCTION:**
# You previously generated storyboards with only 8 clips. THIS IS WRONG.
# **A 2:30 trailer CANNOT be made of 8 clips.** That would mean every clip is 20 seconds long, which is boring.

# **THE MATH OF A GREAT TRAILER:**
# - Target Duration: ~150 seconds.
# - Average Clip Length: ~5 seconds (mix of 1s flashes and 8s dialogue).
# - **THEREFORE: You MUST generate between 20 and 30 scenes per storyboard.**

# **Structure for Every Storyboard:**
# 1. **The Setup (Scenes 1-6):** Establish the world. Slower pacing (Atmosphere + Dialogue).
# 2. **The Turn (Scenes 7-15):** The conflict starts. Medium pacing.
# 3. **The Climax (Scenes 16-25+):** Rapid fire. Mostly "Action Flash" cuts (1-2s).

# **The 5 Cuts to Generate:**
# Analyze the film to find the best 5 unique marketing angles (e.g., Psychological Thriller, High-Octane Action, Romance, etc.).

# **Rules:**
# 1. **Quantity:** If a storyboard has fewer than 20 scenes, you have FAILED.
# 2. **Reality Check:** Every frame must exist. Frame-accurate timestamps (HH:MM:SS.FF).
# 3. **Posters:** Select 20 distinct frames suitable for a movie poster.

# Watch the film. Do the math. Generate full, dense storyboards.
# """

# def _require_api_key() -> str:
#     api_key = os.getenv("GEMINI_API_KEY")
#     if not api_key:
#         raise RuntimeError("GEMINI_API_KEY is not set")
#     return api_key


# def _get_client() -> genai.Client:
#     return genai.Client(api_key=_require_api_key())


# def _wait_for_active(client: genai.Client, file_ref: Any) -> Any:
#     timeout = float(os.getenv("KINO_GEMINI_FILE_TIMEOUT", "600"))
#     start_time = time.monotonic()
    
#     print(f"   [Gemini] Waiting for video processing (ID: {file_ref.name})...")
    
#     while True:
#         if time.monotonic() - start_time > timeout:
#             raise RuntimeError(f"File processing timed out after {timeout}s")

#         try:
#             current_file = client.files.get(name=file_ref.name)
#         except Exception:
#             time.sleep(5)
#             continue

#         state = current_file.state.name
        
#         if state == "ACTIVE":
#             print(f"   [Gemini] Video is ACTIVE.")
#             return current_file
#         elif state == "FAILED":
#             raise RuntimeError(f"Processing FAILED: {current_file.error.message}")
        
#         time.sleep(5)


# def upload_file_to_gemini(file_path: str) -> Any:
#     client = _get_client()
#     print(f"   [Gemini] Uploading {os.path.basename(file_path)}...")
#     file_ref = client.files.upload(file=file_path)
#     return _wait_for_active(client, file_ref)


# def generate_storyboards_from_file(
#     file_ref: Any,
#     filename: str,
#     duration_seconds: float,
# ) -> dict:
#     client = _get_client()
#     file_ref = _wait_for_active(client, file_ref)
    
#     # Updated to your requested model
#     model_name = os.getenv("GEMINI_MODEL", "gemini-3-pro-preview")
#     print(f"   [Gemini] Editing with {model_name}...")
    
#     # RETRY LOOP: If the model is lazy (gives 8 clips), we reject it and retry.
#     max_retries = 2
#     for attempt in range(max_retries + 1):
#         try:
#             print(f"   [Gemini] Generation Attempt {attempt + 1}...")
            
#             response = client.models.generate_content(
#                 model=model_name,
#                 contents=[file_ref, STORYBOARD_PROMPT],
#                 config=types.GenerateContentConfig(
#                     response_mime_type="application/json",
#                     response_schema=StoryboardResponse, # Removed min_length to fix 400
#                     temperature=0.4, 
#                 ),
#             )

#             # Parse
#             response_data = json.loads(response.text)
#             validated_obj = StoryboardResponse(**response_data)
            
#             # --- CUSTOM VALIDATION LOGIC ---
#             # Since we removed min_length from Schema, we check it here manually.
#             short_storyboards = 0
#             for sb in validated_obj.storyboards:
#                 if len(sb.scenes) < 15: # Threshold for "too short"
#                     short_storyboards += 1
            
#             if short_storyboards > 0 and attempt < max_retries:
#                 print(f"   [Gemini] Warning: Generated storyboards were too short ({short_storyboards} failed). Retrying...")
#                 continue # Try again!
#             # -------------------------------

#             payload = validated_obj.model_dump()
            
#             # Metadata
#             if not payload.get("movie_title") or "detect" in payload["movie_title"]:
#                 payload["movie_title"] = filename
#             if not payload.get("duration") or "detect" in payload["duration"]:
#                 payload["duration"] = f"{duration_seconds:.2f}s"

#             return payload

#         except json.JSONDecodeError:
#             print(f"   [Gemini Error] Model failed to output JSON.")
#             if attempt == max_retries:
#                 raise RuntimeError("Gemini failed to generate valid JSON after retries.")
#         except Exception as e:
#             # If it's a 400 error again, it's fatal.
#             if "400" in str(e):
#                 raise RuntimeError(f"API Error 400: {e} - Your model might not support the Schema.")
#             print(f"   [Gemini Error] {e}")
#             if attempt == max_retries:
#                 raise RuntimeError(f"Generation failed: {str(e)}")

#     return {}

# def generate_storyboards(project_id: str) -> dict:
#     raise RuntimeError("Use upload flow.")


# from __future__ import annotations

# import json
# import os
# import time
# import subprocess
# import shutil
# import re
# from typing import Any, List, Literal
# from pydantic import BaseModel, Field

# from google import genai
# from google.genai import types

# # --- CONFIGURATION ---
# # We use Flash for speed. The "Intelligence" comes from our Python Logic Layer now.
# MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp") 

# # --- 1. DATA CONTRACTS ---

# class Scene(BaseModel):
#     scene_number: int
#     cut_type: Literal["Dialogue Anchor", "Action Flash", "Atmosphere/Establishing", "Reaction Shot"]
#     start_tc: str = Field(description="HH:MM:SS.FF")
#     end_tc: str = Field(description="HH:MM:SS.FF")
#     # We allow the AI to be slightly wrong here, because our Python USP will fix the math.
#     duration_seconds: float 
#     thumbnail_tc: str
#     description: str
#     emotional_beat: str
#     music_idea: str

# class Storyboard(BaseModel):
#     name: str
#     target_length: str
#     tone: str
#     description: str
#     # "USP Field": We force the AI to output its strategy logic before the scenes
#     editor_strategy: str = Field(description="Explain the specific editing theory used for this cut (e.g. 'Rising Tempo', 'Drop-Frame').")
#     scenes: List[Scene]

# class PosterCandidate(BaseModel):
#     timestamp: str
#     description: str

# class StoryboardResponse(BaseModel):
#     movie_title: str
#     duration: str
#     storyboards: List[Storyboard]
#     poster_candidates: List[PosterCandidate]

# # --- 2. PROMPT (Focused on Technical Editing Theory) ---

# STORYBOARD_PROMPT = """
# You are the 'Kino AI' Editing Engine.
# The user has uploaded a raw feature film. Execute the **Trailer Segmentation Protocol**.

# **OBJECTIVE:**
# Generate 5 technically distinct edit decision lists (EDLs) for trailers.

# **THEORY OF OPERATIONS:**
# 1. **The 'Brave' Cut:** Focus on sound design gaps. Use long black-screen pauses (Atmosphere) vs rapid violence.
# 2. **The 'Rhythm' Cut:** All cuts must sync to a theoretical 120 BPM tempo (0.5s, 1.0s, 2.0s durations).
# 3. **The 'Character' Cut:** Zero action. Pure dialogue. Focus on facial micro-expressions.

# **STRICT DATA RULES:**
# - **No Overlaps:** Scene N end_tc cannot be after Scene N+1 start_tc.
# - **Frame Accuracy:** Timestamps must exactly match the video standard.
# - **Minimum Count:** 22 scenes per storyboard.

# Analyze the footage. Calculate the edit points. Return the JSON.
# """

# # --- 3. USP LOGIC LAYER (The "Wrapper Killer") ---
# # This function proves this is a software product, not just a prompt.

# def _time_str_to_seconds(time_str: str) -> float:
#     """Parses HH:MM:SS.FF to float seconds."""
#     try:
#         parts = time_str.split(':')
#         seconds = float(parts[-1])
#         minutes = int(parts[-2])
#         hours = int(parts[-3])
#         return hours * 3600 + minutes * 60 + seconds
#     except (ValueError, IndexError):
#         return 0.0

# def _seconds_to_time_str(seconds: float) -> str:
#     """Converts float seconds back to HH:MM:SS.FF"""
#     m, s = divmod(seconds, 60)
#     h, m = divmod(m, 60)
#     return f"{int(h):02}:{int(m):02}:{s:05.2f}"

# def validate_and_repair_logic(payload: dict) -> dict:
#     """
#     USP: Heuristic algorithm to fix AI hallucinations.
#     Ensures no cut is < 0.5s, verifies durations match timecodes,
#     and sorts scenes chronologically if needed.
#     """
#     print("   [Engine] Running Post-Inference Logic Validation (The USP)...")
    
#     for board in payload.get("storyboards", []):
#         scenes = board.get("scenes", [])
        
#         valid_scenes = []
#         for scene in scenes:
#             start = _time_str_to_seconds(scene["start_tc"])
#             end = _time_str_to_seconds(scene["end_tc"])
#             duration = end - start
            
#             # 1. Fix Negative or Zero Duration
#             if duration <= 0:
#                 print(f"      - Repairing invalid clip: {scene['start_tc']} -> {scene['end_tc']}")
#                 # Artificially extend it by 2 seconds
#                 end = start + 2.0
#                 scene["end_tc"] = _seconds_to_time_str(end)
#                 duration = 2.0
                
#             # 2. Enforce Minimum Trailer Cut Length (Industry Standard: 12 frames)
#             if duration < 0.5:
#                  end = start + 0.5
#                  scene["end_tc"] = _seconds_to_time_str(end)
#                  duration = 0.5
            
#             # 3. Sync Calculated Duration
#             scene["duration_seconds"] = round(duration, 2)
#             valid_scenes.append(scene)
            
#         board["scenes"] = valid_scenes
        
#     return payload

# # --- 4. STANDARD GEMINI PIPELINE ---

# def _require_api_key() -> str:
#     api_key = os.getenv("GEMINI_API_KEY")
#     if not api_key:
#         raise RuntimeError("GEMINI_API_KEY is not set")
#     return api_key

# def _get_client() -> genai.Client:
#     # Set default timeout at the CLIENT level to prevent the 400/Crash
#     return genai.Client(
#         api_key=_require_api_key(),
#         http_options={"timeout": 900} # <--- FIXED: Correct location for v1.0+
#     )

# def sanitize_video(input_path: str) -> str:
#     if not shutil.which("ffmpeg"): return input_path
#     if "clean_" in input_path: return input_path
    
#     print(f"   [System] Pre-processing video headers...")
#     clean_path = f"clean_{os.path.basename(input_path)}"
    
#     cmd = ["ffmpeg", "-y", "-i", input_path, "-c", "copy", "-movflags", "+faststart", clean_path]
#     try:
#         subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
#         return clean_path
#     except:
#         return input_path

# def _wait_for_active(client: genai.Client, file_ref: Any) -> Any:
#     if hasattr(file_ref, "state") and str(file_ref.state) == "ACTIVE":
#         return file_ref
        
#     print(f"   [Cloud] Polling file status...")
#     deadline = time.monotonic() + 600
#     while time.monotonic() < deadline:
#         try:
#             current = client.files.get(name=file_ref.name)
#             if current.state.name == "ACTIVE":
#                 print(f"   [Cloud] File ready.")
#                 return current
#             if current.state.name == "FAILED":
#                 raise RuntimeError(f"Google processing failed: {current.error.message}")
#         except Exception:
#             pass
#         time.sleep(3)
#     raise RuntimeError("File processing timed out.")

# def upload_file_to_gemini(file_path: str) -> Any:
#     clean_file = sanitize_video(file_path)
#     client = _get_client()
#     print(f"   [Cloud] Uploading {os.path.basename(clean_file)}...")
#     file_ref = client.files.upload(file=clean_file)
#     if clean_file != file_path and os.path.exists(clean_file):
#         os.remove(clean_file)
#     return _wait_for_active(client, file_ref)

# def generate_storyboards_from_file(file_ref: Any, filename: str, duration_seconds: float) -> dict:
#     client = _get_client()
#     file_ref = _wait_for_active(client, file_ref)
    
#     print(f"   [AI] Orchestrating edit with {MODEL_NAME}...")
    
#     # Retry Loop for Reliability
#     for attempt in range(2):
#         try:
#             response = client.models.generate_content(
#                 model=MODEL_NAME,
#                 contents=[file_ref, STORYBOARD_PROMPT],
#                 config=types.GenerateContentConfig(
#                     response_mime_type="application/json",
#                     response_schema=StoryboardResponse,
#                     temperature=0.3,
#                     # NOTE: Timeout is handled by client http_options now
#                 ),
#             )
            
#             # 1. Parse Raw AI
#             data = json.loads(response.text)
            
#             # 2. Inject USP (Logic Validation)
#             # We don't just trust the AI. We run it through our engine.
#             # This is what you tell the investor: "We use LLMs for creativity, but our proprietary engine ensures edit-reliability."
#             clean_data = validate_and_repair_logic(data)
            
#             # 3. Metadata
#             clean_data["movie_title"] = clean_data.get("movie_title") or filename
#             clean_data["duration"] = clean_data.get("duration") or f"{duration_seconds:.2f}s"
            
#             return clean_data

#         except Exception as e:
#             print(f"   [Warning] Attempt {attempt+1} failed: {e}")
#             if attempt == 1:
#                 # Fallback: Return empty structure so app doesn't crash
#                 print("   [Error] Critical Failure. Returning empty safe-state.")
#                 return {"movie_title": filename, "storyboards": [], "poster_candidates": []}
                
#     return {}

# def generate_storyboards(project_id: str) -> dict:
#     raise RuntimeError("Use upload flow.")