export type ProjectStatus = "created" | "uploading" | "processing" | "ready" | "failed";

export interface StoryboardFrame {
  id: string;
  imageUrl: string;
  videoUrl?: string;
  timestamp: string;
  duration: number;
  scene: string;
  description: string;
  cameraMove: string;
  shotType: string;
  storyboardId: string;
  storyboardName: string;
  emotionalBeat?: string;
  musicIdea?: string;
  sceneNumber?: number;
  startTc?: string;
  endTc?: string;
  thumbnailTc?: string;
}

export interface Storyboard {
  id: string;
  name: string;
  theme: string;
  color: string;
  targetLength?: string;
  description?: string;
  frames: StoryboardFrame[];
}

export interface PosterCandidate {
  id: string;
  timestamp: string;
  description?: string | null;
  imageUrl: string;
}

export interface PosterGeneration {
  id: string;
  imageUrl: string;
  size: string;
  prompt: string;
  createdAt: string;
  sourceCandidates: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  videoFileName: string;
  createdAt: Date;
  updatedAt: Date;
  status: ProjectStatus;
  progress: number;
  errorMessage?: string | null;
  durationSeconds: number;
  storyboards: Storyboard[];
  storyboardsCount: number;
  framesCount: number;
  selectedFrames: StoryboardFrame[];
  thumbnail: string;
  posterCandidates?: PosterCandidate[];
  posterGenerations?: PosterGeneration[];
}

export interface AuthState {
  username: string;
  password: string;
}
