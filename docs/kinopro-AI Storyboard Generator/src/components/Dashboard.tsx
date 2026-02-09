import { Project } from '../App';
import { motion } from 'motion/react';
import { Plus, Folder, Clock, Sparkles, Film, TrendingUp } from 'lucide-react';

interface DashboardProps {
  projects: Project[];
  onCreateNew: () => void;
  onViewProjects: () => void;
  onOpenProject: (project: Project) => void;
}

export function Dashboard({ projects, onCreateNew, onViewProjects, onOpenProject }: DashboardProps) {
  const recentProjects = projects.slice(0, 3);
  const totalFrames = projects.reduce((acc, p) => acc + p.selectedFrames.length, 0);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/50 via-black to-cyan-950/50" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-2xl flex items-center justify-center relative">
              <Film className="w-8 h-8 text-white relative z-10" />
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-2xl blur-xl opacity-50" />
            </div>
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-violet-200 to-cyan-200 bg-clip-text text-transparent">
                AI Storyboard Studio
              </h1>
              <p className="text-slate-400 text-lg mt-1">Transform your vision into cinematic storyboards</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <StatCard
              icon={<Folder className="w-5 h-5" />}
              label="Total Projects"
              value={projects.length}
              color="from-violet-500 to-purple-500"
            />
            <StatCard
              icon={<Film className="w-5 h-5" />}
              label="Frames Created"
              value={totalFrames}
              color="from-cyan-500 to-blue-500"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Hours Saved"
              value={Math.floor(projects.length * 2.5)}
              color="from-emerald-500 to-teal-500"
            />
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-6 mb-12"
        >
          {/* Create New Project */}
          <button
            onClick={onCreateNew}
            className="group relative overflow-hidden"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-8 hover:border-slate-600 transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-cyan-600 rounded-xl flex items-center justify-center">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold">Create New Project</h2>
              </div>
              <p className="text-slate-400">Upload a video and generate AI-powered storyboards</p>
            </div>
          </button>

          {/* View All Projects */}
          <button
            onClick={onViewProjects}
            className="group relative overflow-hidden"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />
            <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-8 hover:border-slate-600 transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-xl flex items-center justify-center">
                  <Folder className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold">View All Projects</h2>
              </div>
              <p className="text-slate-400">Browse and manage your storyboard projects</p>
            </div>
          </button>
        </motion.div>

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Clock className="w-6 h-6 text-violet-400" />
                Recent Projects
              </h2>
              <button
                onClick={onViewProjects}
                className="text-violet-400 hover:text-violet-300 transition-colors text-sm font-medium"
              >
                View All →
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {recentProjects.map((project, idx) => (
                <motion.button
                  key={project.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                  onClick={() => onOpenProject(project)}
                  className="group relative text-left"
                >
                  <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl blur opacity-0 group-hover:opacity-50 transition-opacity" />
                  <div className="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group-hover:border-slate-700 transition-all">
                    <div className="aspect-video bg-slate-800 relative overflow-hidden">
                      <img
                        src={project.thumbnail}
                        alt={project.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="font-bold text-white mb-1">{project.name}</h3>
                        <p className="text-xs text-slate-300">{project.selectedFrames.length} frames selected</p>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-900/50 backdrop-blur-sm">
                      <p className="text-sm text-slate-400 line-clamp-2">{project.description}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        Updated {new Date(project.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {projects.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center py-20"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-violet-500/20 to-cyan-500/20 rounded-2xl mb-6">
              <Sparkles className="w-10 h-10 text-violet-400" />
            </div>
            <h3 className="text-2xl font-bold mb-3">No projects yet</h3>
            <p className="text-slate-400 mb-6">Create your first storyboard project to get started</p>
            <button
              onClick={onCreateNew}
              className="relative group inline-flex"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity" />
              <div className="relative px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl font-medium flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create New Project
              </div>
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="relative group">
      <div className={`absolute -inset-1 bg-gradient-to-r ${color} rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity`} />
      <div className="relative bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className={`inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br ${color} rounded-lg mb-3 text-white`}>
          {icon}
        </div>
        <div className="text-3xl font-bold mb-1">{value}</div>
        <div className="text-sm text-slate-400">{label}</div>
      </div>
    </div>
  );
}
