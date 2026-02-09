import { Project } from '../App';
import { motion } from 'motion/react';
import { ArrowLeft, Plus, Trash2, Film, Calendar, Layers } from 'lucide-react';
import { useState } from 'react';

interface ProjectsListProps {
  projects: Project[];
  onBack: () => void;
  onCreateNew: () => void;
  onOpenProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
}

export function ProjectsList({ 
  projects, 
  onBack, 
  onCreateNew, 
  onOpenProject,
  onDeleteProject 
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

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/50 via-black to-cyan-950/50" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-500/20 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-violet-200 to-cyan-200 bg-clip-text text-transparent mb-2">
                All Projects
              </h1>
              <p className="text-slate-400">{projects.length} total projects</p>
            </div>

            <button
              onClick={onCreateNew}
              className="relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity" />
              <div className="relative px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl font-medium flex items-center gap-2">
                <Plus className="w-5 h-5" />
                New Project
              </div>
            </button>
          </div>
        </motion.div>

        {/* Projects Grid */}
        {projects.length > 0 ? (
          <div className="grid grid-cols-3 gap-6">
            {projects.map((project, idx) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl blur opacity-0 group-hover:opacity-50 transition-opacity" />
                <div className="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group-hover:border-slate-700 transition-all">
                  {/* Thumbnail */}
                  <button
                    onClick={() => onOpenProject(project)}
                    className="w-full"
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
                            {project.selectedFrames.length} frames
                          </span>
                          <span className="flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            {project.storyboards.length} variations
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Info */}
                  <div className="p-4 bg-slate-900/50 backdrop-blur-sm">
                    <p className="text-sm text-slate-400 line-clamp-2 mb-3">
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

                    {deleteConfirm === project.id && (
                      <p className="text-xs text-red-400 mt-2">Click again to confirm delete</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Film className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400 mb-2">No projects yet</h3>
            <p className="text-slate-500 mb-6">Create your first project to get started</p>
            <button
              onClick={onCreateNew}
              className="relative group inline-flex"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity" />
              <div className="relative px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl font-medium flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create Project
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
