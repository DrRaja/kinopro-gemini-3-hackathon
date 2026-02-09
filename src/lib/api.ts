import placeholder from '../assets/placeholder.svg';
import { AuthState, PosterCandidate, PosterGeneration, Project, Storyboard, StoryboardFrame } from '../types';

type ApiScene = {
  scene_number: number;
  start_tc: string;
  end_tc: string;
  duration_seconds: number;
  thumbnail_tc: string;
  description: string;
  emotional_beat: string;
  music_idea: string;
  clip_url?: string | null;
  thumbnail_url?: string | null;
};

type ApiStoryboard = {
  name: string;
  target_length: string;
  tone: string;
  description: string;
  scenes: ApiScene[];
};

type ApiProject = {
  id: string;
  name: string;
  description?: string | null;
  video_filename?: string | null;
  duration_seconds?: number;
  poster_url?: string | null;
  status: Project['status'];
  progress: number;
  error_message?: string | null;
  storyboards?: ApiStoryboard[] | null;
  storyboards_count?: number;
  frames_count?: number;
  poster_candidates?: ApiPosterCandidate[] | null;
  poster_generations?: ApiPosterGeneration[] | null;
  created_at: string;
  updated_at: string;
};

type ApiPosterCandidate = {
  id: string;
  timestamp: string;
  description?: string | null;
  image_url?: string | null;
};

type ApiPosterGeneration = {
  id: string;
  image_url: string;
  size: string;
  prompt: string;
  created_at: string;
  source_candidates?: string[];
};

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const AUTH_KEY = 'kinopro_auth';

const storyboardPalette = [
  'sb-gradient-1',
  'sb-gradient-2',
  'sb-gradient-3',
  'sb-gradient-4',
  'sb-gradient-5',
];

function resolveMediaUrl(url?: string | null) {
  if (!url) {
    return placeholder;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${API_BASE}${url}`;
}

function toStoryboard(api: ApiStoryboard, idx: number): Storyboard {
  const color = storyboardPalette[idx % storyboardPalette.length];
  return {
    id: `sb-${idx}`,
    name: api.name,
    theme: api.tone,
    targetLength: api.target_length,
    description: api.description,
    color,
    frames: api.scenes.map((scene, sceneIdx) => toFrame(scene, idx, sceneIdx, api.name)),
  };
}

function toFrame(scene: ApiScene, boardIdx: number, sceneIdx: number, storyboardName: string): StoryboardFrame {
  return {
    id: `sb-${boardIdx}-scene-${scene.scene_number ?? sceneIdx + 1}`,
    sceneNumber: scene.scene_number ?? sceneIdx + 1,
    imageUrl: resolveMediaUrl(scene.thumbnail_url ?? undefined),
    videoUrl: scene.clip_url ? resolveMediaUrl(scene.clip_url) : undefined,
    timestamp: scene.start_tc,
    duration: scene.duration_seconds,
    scene: scene.emotional_beat || `Scene ${sceneIdx + 1}`,
    description: scene.description,
    cameraMove: scene.music_idea,
    shotType: storyboardName,
    storyboardId: `sb-${boardIdx}`,
    storyboardName,
    emotionalBeat: scene.emotional_beat,
    musicIdea: scene.music_idea,
    startTc: scene.start_tc,
    endTc: scene.end_tc,
    thumbnailTc: scene.thumbnail_tc,
  };
}

function toProject(api: ApiProject, previous?: Project): Project {
  const storyboards = api.storyboards
    ? api.storyboards.map((board, idx) => toStoryboard(board, idx))
    : previous?.storyboards ?? [];
  const posterCandidates: PosterCandidate[] = api.poster_candidates
    ? api.poster_candidates.map((candidate) => ({
        id: candidate.id,
        timestamp: candidate.timestamp,
        description: candidate.description ?? null,
        imageUrl: resolveMediaUrl(candidate.image_url ?? undefined),
      }))
    : previous?.posterCandidates ?? [];
  const posterGenerations: PosterGeneration[] = api.poster_generations
    ? api.poster_generations.map((poster) => ({
        id: poster.id,
        imageUrl: resolveMediaUrl(poster.image_url),
        size: poster.size,
        prompt: poster.prompt,
        createdAt: poster.created_at,
        sourceCandidates: poster.source_candidates ?? [],
      }))
    : previous?.posterGenerations ?? [];

  return {
    id: api.id,
    name: api.name,
    description: api.description ?? '',
    videoFileName: api.video_filename ?? '',
    createdAt: new Date(api.created_at),
    updatedAt: new Date(api.updated_at),
    status: api.status,
    progress: api.progress,
    errorMessage: api.error_message ?? null,
    durationSeconds: api.duration_seconds ?? 0,
    storyboards,
    storyboardsCount: api.storyboards_count ?? storyboards.length,
    framesCount: api.frames_count ?? storyboards.reduce((acc, board) => acc + board.frames.length, 0),
    selectedFrames: previous?.selectedFrames ?? [],
    thumbnail: resolveMediaUrl(api.poster_url ?? undefined),
    posterCandidates,
    posterGenerations,
  };
}

function getAuthHeader(auth: AuthState | null): string | undefined {
  if (!auth?.username || !auth.password) {
    return undefined;
  }
  const token = btoa(`${auth.username}:${auth.password}`);
  return `Basic ${token}`;
}

export function loadAuth(): AuthState | null {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    return null;
  }
}

export function saveAuth(auth: AuthState) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const auth = loadAuth();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', headers.get('Content-Type') || 'application/json');
  const authHeader = getAuthHeader(auth);
  if (authHeader) {
    headers.set('Authorization', authHeader);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

export async function registerUser(username: string, password: string) {
  return apiRequest('/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function loginUser(username: string, password: string) {
  const token = btoa(`${username}:${password}`);
  const response = await fetch(`${API_BASE}/v1/auth/login`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${token}`,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || 'Login failed');
  }
  return response.json();
}

export async function listProjects(): Promise<Project[]> {
  const apiProjects = await apiRequest<ApiProject[]>('/v1/projects');
  return apiProjects.map((project) => toProject(project));
}

export async function getProject(projectId: string, previous?: Project): Promise<Project> {
  const apiProject = await apiRequest<ApiProject>(`/v1/projects/${projectId}`);
  return toProject(apiProject, previous);
}

export async function getProjectPosters(projectId: string): Promise<{
  candidates: PosterCandidate[];
  posters: PosterGeneration[];
}> {
  const payload = await apiRequest<{ candidates: ApiPosterCandidate[]; posters: ApiPosterGeneration[] }>(
    `/v1/projects/${projectId}/posters`,
  );
  return {
    candidates: payload.candidates.map((candidate) => ({
      id: candidate.id,
      timestamp: candidate.timestamp,
      description: candidate.description ?? null,
      imageUrl: resolveMediaUrl(candidate.image_url ?? undefined),
    })),
    posters: payload.posters.map((poster) => ({
      id: poster.id,
      imageUrl: resolveMediaUrl(poster.image_url),
      size: poster.size,
      prompt: poster.prompt,
      createdAt: poster.created_at,
      sourceCandidates: poster.source_candidates ?? [],
    })),
  };
}

export async function generateProjectPosters(payload: {
  projectId: string;
  candidateIds: string[];
  prompt?: string;
  text?: string;
  size: string;
  variants?: number;
}): Promise<{ candidates: PosterCandidate[]; posters: PosterGeneration[] }> {
  const response = await apiRequest<{ candidates: ApiPosterCandidate[]; posters: ApiPosterGeneration[] }>(
    `/v1/projects/${payload.projectId}/posters/generate`,
    {
      method: 'POST',
      body: JSON.stringify({
        candidate_ids: payload.candidateIds,
        prompt: payload.prompt,
        text: payload.text,
        size: payload.size,
        variants: 1,
      }),
    },
  );
  return {
    candidates: response.candidates.map((candidate) => ({
      id: candidate.id,
      timestamp: candidate.timestamp,
      description: candidate.description ?? null,
      imageUrl: resolveMediaUrl(candidate.image_url ?? undefined),
    })),
    posters: response.posters.map((poster) => ({
      id: poster.id,
      imageUrl: resolveMediaUrl(poster.image_url),
      size: poster.size,
      prompt: poster.prompt,
      createdAt: poster.created_at,
      sourceCandidates: poster.source_candidates ?? [],
    })),
  };
}

export async function deleteProjectPoster(projectId: string, posterId: string): Promise<{
  candidates: PosterCandidate[];
  posters: PosterGeneration[];
}> {
  const response = await apiRequest<{ candidates: ApiPosterCandidate[]; posters: ApiPosterGeneration[] }>(
    `/v1/projects/${projectId}/posters/${posterId}`,
    { method: 'DELETE' },
  );
  return {
    candidates: response.candidates.map((candidate) => ({
      id: candidate.id,
      timestamp: candidate.timestamp,
      description: candidate.description ?? null,
      imageUrl: resolveMediaUrl(candidate.image_url ?? undefined),
    })),
    posters: response.posters.map((poster) => ({
      id: poster.id,
      imageUrl: resolveMediaUrl(poster.image_url),
      size: poster.size,
      prompt: poster.prompt,
      createdAt: poster.created_at,
      sourceCandidates: poster.source_candidates ?? [],
    })),
  };
}

export async function deleteProject(projectId: string) {
  return apiRequest(`/v1/projects/${projectId}`, {
    method: 'DELETE',
  });
}

export async function retryProject(projectId: string, previous?: Project): Promise<Project> {
  const apiProject = await apiRequest<ApiProject>(`/v1/projects/${projectId}/retry`, {
    method: 'POST',
  });
  return toProject(apiProject, previous);
}

export async function createProject(payload: {
  name: string;
  description?: string;
  videoFilename?: string;
  durationSeconds?: number;
}): Promise<Project> {
  const apiProject = await apiRequest<ApiProject>('/v1/projects', {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name,
      description: payload.description,
      video_filename: payload.videoFilename,
      duration_seconds: payload.durationSeconds ?? 0,
    }),
  });
  return toProject(apiProject);
}

export function uploadProjectFile(
  projectId: string,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<void> {
  const auth = loadAuth();
  const authHeader = getAuthHeader(auth);

  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/v1/projects/${projectId}/upload`);
    if (authHeader) {
      xhr.setRequestHeader('Authorization', authHeader);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(xhr.responseText || 'Upload failed'));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Upload failed'));
    };

    xhr.send(formData);
  });
}

export async function requestExport(projectId: string, format: string, frames: StoryboardFrame[]) {
  const response = await apiRequest<{ download_url?: string }>('/v1/exports', {
    method: 'POST',
    body: JSON.stringify({
      project_id: projectId,
      format,
      frames: frames.map((frame) => ({
        scene_number: Number(frame.sceneNumber ?? 0) || 0,
        start_tc: frame.startTc ?? frame.timestamp,
        end_tc: frame.endTc ?? frame.timestamp,
        duration_seconds: frame.duration,
        thumbnail_tc: frame.thumbnailTc ?? frame.timestamp,
        description: frame.description,
        emotional_beat: frame.emotionalBeat ?? frame.scene,
        music_idea: frame.musicIdea ?? frame.cameraMove,
      })),
    }),
  });
  if (response.download_url) {
    response.download_url = resolveMediaUrl(response.download_url);
  }
  return response;
}

export { API_BASE };
