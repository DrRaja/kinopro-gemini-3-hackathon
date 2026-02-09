from typing import List, Literal

from pydantic import BaseModel, Field


class Scene(BaseModel):
    scene_number: int = Field(..., ge=1)
    start_tc: str
    end_tc: str
    duration_seconds: float = Field(..., gt=0)
    thumbnail_tc: str
    description: str
    emotional_beat: str
    music_idea: str
    clip_url: str | None = None
    thumbnail_url: str | None = None


class Storyboard(BaseModel):
    name: str
    target_length: str
    tone: str
    description: str
    scenes: List[Scene]


class StoryboardResponse(BaseModel):
    movie_title: str
    duration: str
    storyboards: List[Storyboard]


class PosterCandidate(BaseModel):
    id: str
    timestamp: str
    description: str | None = None
    image_url: str | None = None


class PosterGeneration(BaseModel):
    id: str
    image_url: str
    size: str
    prompt: str
    created_at: str
    source_candidates: List[str] = Field(default_factory=list)


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    video_filename: str | None = None
    duration_seconds: float = 0
    poster_url: str | None = None


class Project(BaseModel):
    id: str
    name: str
    description: str | None = None
    video_filename: str | None = None
    duration_seconds: float = 0
    poster_url: str | None = None
    status: Literal["created", "uploading", "processing", "ready", "failed"]
    progress: int = Field(0, ge=0, le=100)
    error_message: str | None = None
    storyboards: List[Storyboard] | None = None
    storyboards_count: int = 0
    frames_count: int = 0
    poster_candidates: List[PosterCandidate] | None = None
    poster_generations: List[PosterGeneration] | None = None
    created_at: str
    updated_at: str


class ExportRequest(BaseModel):
    project_id: str
    format: str
    frames: List[Scene] | None = None


class PosterWallResponse(BaseModel):
    project_id: str
    candidates: List[PosterCandidate]
    posters: List[PosterGeneration]


class PosterGenerateRequest(BaseModel):
    candidate_ids: List[str] = Field(default_factory=list)
    prompt: str | None = None
    text: str | None = None
    size: str = "1024x1536"
    variants: int = Field(1, ge=1, le=1)
