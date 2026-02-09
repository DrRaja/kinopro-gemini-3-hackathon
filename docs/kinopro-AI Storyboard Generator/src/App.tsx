import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { ProjectsList } from './components/ProjectsList';
import { ProjectCreation } from './components/ProjectCreation';
import { StoryboardStudio } from './components/StoryboardStudio';
import { ExportPage } from './components/ExportPage';

export interface StoryboardFrame {
  id: string;
  imageUrl: string;
  timestamp: string;
  duration: number;
  scene: string;
  description: string;
  cameraMove: string;
  shotType: string;
  storyboardId: string;
  storyboardName: string;
}

export interface Storyboard {
  id: string;
  name: string;
  theme: string;
  color: string;
  frames: StoryboardFrame[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  videoFileName: string;
  createdAt: Date;
  updatedAt: Date;
  storyboards: Storyboard[];
  selectedFrames: StoryboardFrame[];
  thumbnail: string;
}

type Page = 'dashboard' | 'projects' | 'create' | 'studio' | 'export';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  const handleCreateProject = async (file: File, name: string, description: string) => {
    // Simulate AI generation
    const storyboards = generateMockStoryboards();
    
    const newProject: Project = {
      id: `project-${Date.now()}`,
      name,
      description,
      videoFileName: file.name,
      createdAt: new Date(),
      updatedAt: new Date(),
      storyboards,
      selectedFrames: [],
      thumbnail: storyboards[0].frames[0].imageUrl
    };

    setProjects([newProject, ...projects]);
    setCurrentProject(newProject);
    setCurrentPage('studio');
  };

  const handleOpenProject = (project: Project) => {
    setCurrentProject(project);
    setCurrentPage('studio');
  };

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
    setCurrentProject(updatedProject);
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects(projects.filter(p => p.id !== projectId));
    if (currentProject?.id === projectId) {
      setCurrentProject(null);
      setCurrentPage('dashboard');
    }
  };

  const handleExport = () => {
    if (currentProject) {
      setCurrentPage('export');
    }
  };

  return (
    <>
      {currentPage === 'dashboard' && (
        <Dashboard
          projects={projects}
          onCreateNew={() => setCurrentPage('create')}
          onViewProjects={() => setCurrentPage('projects')}
          onOpenProject={handleOpenProject}
        />
      )}

      {currentPage === 'projects' && (
        <ProjectsList
          projects={projects}
          onBack={() => setCurrentPage('dashboard')}
          onCreateNew={() => setCurrentPage('create')}
          onOpenProject={handleOpenProject}
          onDeleteProject={handleDeleteProject}
        />
      )}

      {currentPage === 'create' && (
        <ProjectCreation
          onBack={() => setCurrentPage('dashboard')}
          onCreate={handleCreateProject}
        />
      )}

      {currentPage === 'studio' && currentProject && (
        <StoryboardStudio
          project={currentProject}
          onBack={() => setCurrentPage('dashboard')}
          onUpdateProject={handleUpdateProject}
          onExport={handleExport}
        />
      )}

      {currentPage === 'export' && currentProject && (
        <ExportPage
          project={currentProject}
          onBack={() => setCurrentPage('studio')}
        />
      )}
    </>
  );
}

function generateMockStoryboards(): Storyboard[] {
  const themes = [
    { 
      name: 'Cinematic Epic', 
      theme: 'Wide sweeping shots, dramatic lighting',
      color: 'from-amber-500 via-orange-500 to-red-500'
    },
    { 
      name: 'Intimate Drama', 
      theme: 'Close-ups, emotional depth, shallow focus',
      color: 'from-purple-500 via-pink-500 to-rose-500'
    },
    { 
      name: 'Action Thriller', 
      theme: 'Dynamic angles, fast cuts, high energy',
      color: 'from-cyan-500 via-blue-500 to-indigo-500'
    },
    { 
      name: 'Art House', 
      theme: 'Abstract compositions, creative framing',
      color: 'from-emerald-500 via-teal-500 to-cyan-500'
    },
  ];

  const scenes = [
    { scene: 'Opening Shot', description: 'Establishing the world and setting the mood', move: 'Slow push in', type: 'Wide Shot' },
    { scene: 'Meet the Hero', description: 'Character introduction and personality reveal', move: 'Circle around', type: 'Medium Shot' },
    { scene: 'The Discovery', description: 'Finding crucial information that changes everything', move: 'Handheld track', type: 'Close-up' },
    { scene: 'Rising Tension', description: 'Stakes increase as conflict builds', move: 'Zoom & pan', type: 'Over-shoulder' },
    { scene: 'The Confrontation', description: 'Face to face with the antagonist', move: 'Static intensity', type: 'Two Shot' },
    { scene: 'Resolution', description: 'A new beginning and hope restored', move: 'Pull back wide', type: 'Wide Shot' },
  ];

  return themes.map((theme, themeIdx) => ({
    id: `sb-${themeIdx}`,
    name: theme.name,
    theme: theme.theme,
    color: theme.color,
    frames: scenes.map((scene, sceneIdx) => ({
      id: `sb-${themeIdx}-f-${sceneIdx}`,
      imageUrl: `https://images.unsplash.com/photo-${1600000000000 + themeIdx * 50000 + sceneIdx * 5000}?w=1200&h=675&fit=crop`,
      timestamp: `00:${String(sceneIdx * 15).padStart(2, '0')}`,
      duration: 2.5 + Math.random() * 2,
      scene: scene.scene,
      description: scene.description,
      cameraMove: scene.move,
      shotType: scene.type,
      storyboardId: `sb-${themeIdx}`,
      storyboardName: theme.name
    }))
  }));
}
