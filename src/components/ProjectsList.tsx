import { Project } from '../types';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Film,
  Calendar,
  Layers,
  Hourglass,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { useState } from 'react';
import logoIcon from '../assets/kino-green-logo-icon.png';

interface ProjectsListProps {
  projects: Project[];
  notice?: string | null;
  onClearNotice: () => void;
  onBack: () => void;
  onCreateNew: () => void;
  onOpenProject: (project: Project) => void;
  onOpenPosterWall: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onRetryProject: (projectId: string) => void;
}

export function ProjectsList({
  projects,
  notice,
  onClearNotice,
  onBack,
  onCreateNew,
  onOpenProject,
  onOpenPosterWall,
  onDeleteProject,
  onRetryProject,
}: ProjectsListProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleDelete = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (deleteConfirm === projectId) {
      onDeleteProject(projectId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(projectId);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const statusStyles = (status: Project['status']) => {
    switch (status) {
      case 'ready':
        return 'projects-status-ready';
      case 'processing':
        return 'projects-status-processing';
      case 'uploading':
        return 'projects-status-uploading';
      case 'failed':
        return 'projects-status-failed';
      default:
        return 'projects-status-created';
    }
  };

  const statusLabel = (status: Project['status']) => {
    switch (status) {
      case 'ready':
        return 'Ready';
      case 'processing':
        return 'Processing';
      case 'uploading':
        return 'Uploading';
      case 'failed':
        return 'Failed';
      default:
        return 'Created';
    }
  };

  const statusIcon = (status: Project['status']) => {
    switch (status) {
      case 'ready':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Hourglass className="w-4 h-4" />;
    }
  };

  return (
    <div className="spectacle-page">
      <div className="spectacle-bg">
        <div className="spectacle-orb orb-one" />
        <div className="spectacle-orb orb-two" />
        <div className="spectacle-orb orb-three" />
        <div className="spectacle-gridlines" />
      </div>

      <div className="app-shell app-shell-wide">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel app-header">
          <div className="app-header-row">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 flex items-center justify-center">
                <img src={logoIcon} alt="KinoPro" className="w-10 h-10 object-contain" />
              </div>
              <div>
                <h1 className="app-title app-title-gradient">Kino Pro</h1>
                <p className="app-subtitle">Storyboards. Posters. Dubs.</p>
              </div>
            </div>

            <button
              onClick={onBack}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              Back to Dashboard
            </button>
          </div>

          <div className="app-header-row">
            <div>
              <h2 className="app-section-title">All Projects</h2>
              <p className="app-section-subtitle">{projects.length} total projects</p>
            </div>
            <button onClick={onCreateNew} className="app-primary-btn">
              <span className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                New Project
              </span>
            </button>
          </div>
        </motion.div>

        {notice && (
          <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex items-center justify-between glass-panel">
            <p className="text-sm text-slate-300">{notice}</p>
            <button onClick={onClearNotice} className="text-xs text-slate-500 hover:text-white">
              Dismiss
            </button>
          </div>
        )}

        {/* Projects Grid */}
        {projects.length > 0 ? (
          <div className="projects-grid">
            {projects.map((project, idx) => {
              const isReady = project.status === 'ready';
              const isPending = project.status === 'uploading' || project.status === 'processing';

              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative"
                >
                  <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl blur opacity-0 group-hover:opacity-50 transition-opacity" />
                  <div className="relative glass-panel rounded-xl overflow-hidden group-hover:border-slate-700 transition-all">
                    {/* Thumbnail */}
                    <button
                      onClick={() => isReady && onOpenProject(project)}
                      className={`w-full ${isReady ? '' : 'cursor-not-allowed'}`}
                    >
                      <div className="aspect-video bg-slate-800 relative overflow-hidden">
                        <img
                          src={project.thumbnail}
                          alt={project.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4">
                          <h3 className="font-bold text-white text-lg mb-1">{project.name}</h3>
                          <div className="flex items-center gap-3 text-xs text-slate-300">
                            <span className="flex items-center gap-1">
                              <Film className="w-3 h-3" />
                              {project.framesCount} frames
                            </span>
                            <span className="flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              {project.storyboardsCount} cuts
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Info */}
                    <div className="p-4 bg-slate-900/40 backdrop-blur-sm space-y-3">
                      <p className="text-sm text-slate-400 line-clamp-2">
                        {project.description || 'No description'}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Calendar className="w-3 h-3" />
                          {new Date(project.updatedAt).toLocaleDateString()}
                        </div>

                        <button
                          onClick={(e) => handleDelete(e, project.id)}
                          className={`p-2 rounded-lg transition-all ${
                            deleteConfirm === project.id
                              ? 'bg-red-500 text-white'
                              : 'hover:bg-slate-800 text-slate-500 hover:text-red-400'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs ${statusStyles(
                            project.status,
                          )}`}
                        >
                          {statusIcon(project.status)}
                          {statusLabel(project.status)}
                        </div>
                        {isReady && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onOpenPosterWall(project)}
                              className="projects-poster-wall"
                            >
                              Poster Lab
                            </button>
                            <button
                              onClick={() => onOpenProject(project)}
                              className="projects-view-board"
                            >
                              View Board
                            </button>
                          </div>
                        )}
                      </div>

                      {isPending && (
                        <div>
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                            <span>Progress</span>
                            <span>{project.progress}%</span>
                          </div>
                          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-2 bg-gradient-to-r from-violet-500 to-cyan-500"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {project.status === 'failed' && (
                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                          <p>{project.errorMessage || 'Processing failed. Check API logs for details.'}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRetryProject(project.id);
                            }}
                            className="projects-retry mt-2"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Retry
                          </button>
                        </div>
                      )}

                      {deleteConfirm === project.id && (
                        <p className="text-xs text-red-400">Click again to confirm delete</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <Film className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400 mb-2">No projects yet</h3>
            <p className="text-slate-500 mb-6">Create your first project to get started</p>
            <button onClick={onCreateNew} className="app-primary-btn">
              <span className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create Project
              </span>
            </button>
          </div>
        )}

        <footer className="spectacle-footer glass-panel">
          <div>
            <p className="spectacle-footer-title">KinoPro Studio</p>
            <p className="spectacle-footer-copy">Story to screen. Instant. Intelligent.</p>
          </div>
          <p className="spectacle-footer-copy spectacle-footer-rights">
            © {new Date().getFullYear()} KinoPro. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
