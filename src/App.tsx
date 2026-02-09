import { useEffect, useMemo, useRef, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { ProjectsList } from './components/ProjectsList';
import { ProjectCreation } from './components/ProjectCreation';
import { StoryboardStudio } from './components/StoryboardStudio';
import { ExportPage } from './components/ExportPage';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
import { PosterWall } from './components/PosterWall';
import { AuthState, Project } from './types';
import { Toaster } from 'sonner';
import logoIcon from './assets/kino-green-logo-icon.png';
import {
  clearAuth,
  createProject,
  deleteProject,
  getProject,
  getProjectPosters,
  listProjects,
  loadAuth,
  loginUser,
  registerUser,
  retryProject,
  saveAuth,
  uploadProjectFile,
} from './lib/api';

type Page =
  | 'landing'
  | 'login'
  | 'register'
  | 'dashboard'
  | 'projects'
  | 'create'
  | 'studio'
  | 'export'
  | 'posters';

export default function App() {
  const savedAuth = useMemo(() => loadAuth(), []);
  const [auth, setAuth] = useState<AuthState | null>(savedAuth);
  const [currentPage, setCurrentPage] = useState<Page>(savedAuth ? 'dashboard' : 'landing');
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const pendingDeleteIdsRef = useRef<Set<string>>(new Set());

  const refreshProjects = async () => {
    if (!auth) {
      return;
    }
    try {
      const incoming = await listProjects();
      const visibleIncoming = incoming.filter(
        (project) => !pendingDeleteIdsRef.current.has(project.id),
      );
      setProjects((prev) =>
        visibleIncoming.map((project) => {
          const previous = prev.find((p) => p.id === project.id);
          return previous
            ? { ...project, selectedFrames: previous.selectedFrames }
            : project;
        }),
      );
      if (notice?.startsWith('Upload started')) {
        const hasActive = visibleIncoming.some(
          (project) => project.status === 'uploading' || project.status === 'processing',
        );
        if (!hasActive) {
          setNotice(null);
        }
      }
    } catch (error) {
      console.error(error);
      if (!notice?.startsWith('Could not load projects')) {
        setNotice('Could not load projects. Check the API and your login, then refresh.');
      }
    }
  };

  useEffect(() => {
    if (!auth) {
      return;
    }
    refreshProjects();
    const interval = setInterval(refreshProjects, currentPage === 'projects' ? 4000 : 8000);
    return () => clearInterval(interval);
  }, [auth, currentPage]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [currentPage]);

  const updateProjectInState = (projectId: string, updates: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((project) => (project.id === projectId ? { ...project, ...updates } : project)),
    );
  };

  const handleLogin = async (username: string, password: string) => {
    await loginUser(username, password);
    const authState = { username, password };
    saveAuth(authState);
    setAuth(authState);
    setCurrentPage('dashboard');
  };

  const handleRegister = async (username: string, password: string) => {
    await registerUser(username, password);
    await handleLogin(username, password);
  };

  const handleCreateProject = async (
    file: File,
    name: string,
    description: string,
    durationSeconds: number,
  ) => {
    const created = await createProject({
      name,
      description,
      videoFilename: file.name,
      durationSeconds,
    });

    const uploadingProject = {
      ...created,
      status: 'uploading' as const,
      progress: 0,
    };

    setProjects((prev) => [uploadingProject, ...prev]);
    setNotice('Upload started. Progress will update here.');
    setCurrentPage('projects');

    void uploadProjectFile(created.id, file, (progress) => {
      updateProjectInState(created.id, {
        status: 'uploading',
        progress,
      });
    })
      .then(() => {
        updateProjectInState(created.id, {
          status: 'processing',
          progress: 20,
        });
        refreshProjects();
      })
      .catch((error) => {
        console.error(error);
        updateProjectInState(created.id, { status: 'failed', progress: 0 });
        setNotice('Upload or processing failed. Check the project card for details.');
      });
  };

  const handleOpenProject = async (project: Project) => {
    if (project.status !== 'ready') {
      return;
    }
    setCurrentProject(project);
    setCurrentPage('studio');
    setIsTransitioning(true);
    try {
      const hydrated = await getProject(project.id, project);
      const preserved = projects.find((p) => p.id === project.id);
      const merged = preserved
        ? { ...hydrated, selectedFrames: preserved.selectedFrames }
        : hydrated;
      setCurrentProject(merged);
    } catch (error) {
      console.error(error);
      setNotice('Could not load storyboards. Please try again.');
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleOpenPosterWall = async (project: Project) => {
    if (project.status !== 'ready') {
      return;
    }
    setCurrentProject(project);
    setCurrentPage('posters');
    setIsTransitioning(true);
    try {
      const hydrated = await getProject(project.id, project);
      const posterPayload = await getProjectPosters(project.id);
      const merged = {
        ...hydrated,
        posterCandidates: posterPayload.candidates,
        posterGenerations: posterPayload.posters,
      };
      setCurrentProject(merged);
    } catch (error) {
      console.error(error);
      setNotice('Could not load poster lab. Please try again.');
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
    setCurrentProject(updatedProject);
  };

  const handleDeleteProject = async (projectId: string) => {
    pendingDeleteIdsRef.current.add(projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (currentProject?.id === projectId) {
      setCurrentProject(null);
      setCurrentPage('dashboard');
    }
    try {
      await deleteProject(projectId);
      await refreshProjects();
    } catch (error) {
      console.error(error);
      pendingDeleteIdsRef.current.delete(projectId);
      setNotice('Delete failed. Refreshing project list...');
      await refreshProjects();
      return;
    }
    pendingDeleteIdsRef.current.delete(projectId);
  };

  const handleRetryProject = async (projectId: string) => {
    const existing = projects.find((project) => project.id === projectId);
    if (!existing) {
      return;
    }
    updateProjectInState(projectId, { status: 'processing', progress: 20, errorMessage: null });
    setNotice('Retry started. Progress will update here.');

    try {
      const refreshed = await retryProject(projectId, existing);
      setProjects((prev) =>
        prev.map((project) =>
          project.id === projectId
            ? { ...refreshed, selectedFrames: project.selectedFrames }
            : project,
        ),
      );
    } catch (error) {
      console.error(error);
      updateProjectInState(projectId, {
        status: 'failed',
        progress: 0,
        errorMessage: error instanceof Error ? error.message : 'Retry failed to start',
      });
      setNotice('Retry failed to start. Check API logs for details.');
    }
  };

  const handleExport = () => {
    if (currentProject) {
      setCurrentPage('export');
    }
  };

  const handleSignOut = () => {
    clearAuth();
    setAuth(null);
    setProjects([]);
    setCurrentProject(null);
    setNotice(null);
    setCurrentPage('landing');
  };

  return (
    <>
      <Toaster position="top-right" richColors />
      {auth && !['landing', 'login', 'register', 'studio'].includes(currentPage) && (
        <button type="button" onClick={handleSignOut} className="app-signout">
          Sign out
        </button>
      )}
      {currentPage === 'landing' && (
        <LandingPage onLogin={() => setCurrentPage('login')} onRegister={() => setCurrentPage('register')} />
      )}

      {currentPage === 'login' && (
        <AuthPage
          mode="login"
          onBack={() => setCurrentPage('landing')}
          onSubmit={handleLogin}
          onSwitch={() => setCurrentPage('register')}
        />
      )}

      {currentPage === 'register' && (
        <AuthPage
          mode="register"
          onBack={() => setCurrentPage('landing')}
          onSubmit={handleRegister}
          onSwitch={() => setCurrentPage('login')}
        />
      )}

      {currentPage === 'dashboard' && (
        <Dashboard
          projects={projects}
          onCreateNew={() => setCurrentPage('create')}
          onViewProjects={() => setCurrentPage('projects')}
          onOpenProject={handleOpenProject}
          onOpenPosterWall={handleOpenPosterWall}
        />
      )}

      {currentPage === 'projects' && (
        <ProjectsList
          projects={projects}
          notice={notice}
          onClearNotice={() => setNotice(null)}
          onBack={() => setCurrentPage('dashboard')}
          onCreateNew={() => setCurrentPage('create')}
          onOpenProject={handleOpenProject}
          onOpenPosterWall={handleOpenPosterWall}
          onDeleteProject={handleDeleteProject}
          onRetryProject={handleRetryProject}
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
        <ExportPage project={currentProject} onBack={() => setCurrentPage('studio')} />
      )}

      {currentPage === 'posters' && currentProject && (
        <PosterWall
          project={currentProject}
          onBack={() => setCurrentPage('projects')}
          onUpdateProject={handleUpdateProject}
        />
      )}

      {isTransitioning && (
        <div className="app-transition-loader" role="status" aria-live="polite">
          <div className="app-transition-card glass-panel">
            <img src={logoIcon} alt="Loading" className="app-transition-icon" />
            <p className="app-transition-text">Loading workspace</p>
          </div>
        </div>
      )}
    </>
  );
}
