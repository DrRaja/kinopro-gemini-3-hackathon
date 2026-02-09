import { Project } from '../types';
import { motion } from 'motion/react';
import { Plus, Folder, Clock, Sparkles, Film, TrendingUp, Image as ImageIcon } from 'lucide-react';
import logoIcon from '../assets/kino-green-logo-icon.png';

interface DashboardProps {
  projects: Project[];
  onCreateNew: () => void;
  onViewProjects: () => void;
  onOpenProject: (project: Project) => void;
  onOpenPosterWall: (project: Project) => void;
}

export function Dashboard({
  projects,
  onCreateNew,
  onViewProjects,
  onOpenProject,
  onOpenPosterWall,
}: DashboardProps) {
  const recentProjects = projects.slice(0, 3);
  const totalFrames = projects.reduce((acc, p) => acc + p.selectedFrames.length, 0);

  return (
    <div className="spectacle-page">
      <div className="spectacle-bg">
        <div className="spectacle-orb orb-one" />
        <div className="spectacle-orb orb-two" />
        <div className="spectacle-orb orb-three" />
        <div className="spectacle-gridlines" />
      </div>

      <div className="app-shell app-shell-wide">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel app-header"
        >
          <div className="app-header-row">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 flex items-center justify-center">
                <img src={logoIcon} alt="KinoPro" className="w-16 h-16 object-contain" />
              </div>
              <div>
                <h1 className="app-title app-title-gradient">Kino Pro</h1>
                <p className="app-subtitle">Storyboards. Posters. Dubs.</p>
              </div>
            </div>
            <div className="app-kicker">Studio overview</div>
          </div>

          <div className="dashboard-stats-grid">
            <StatCard
              icon={<Folder className="w-5 h-5" />}
              label="Total Projects"
              value={projects.length}
            />
            <StatCard
              icon={<Film className="w-5 h-5" />}
              label="Frames Created"
              value={totalFrames}
              accent="accent-blue"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Hours Saved"
              value={Math.floor(projects.length * 2.5)}
              accent="accent-lime"
            />
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="dashboard-actions-grid"
        >
          {/* Create New Project */}
          <button onClick={onCreateNew} className="dashboard-action-card group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 rounded-3xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity" />
            <div className="dashboard-action-panel relative glass-panel rounded-3xl hover:border-slate-600 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="dashboard-action-icon bg-gradient-to-br from-violet-600 to-cyan-600">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <h2 className="dashboard-action-title">Create New Project</h2>
              </div>
              <p className="dashboard-action-copy">Upload a video and generate AI-powered storyboards</p>
            </div>
          </button>

          {/* View All Projects */}
          <button onClick={onViewProjects} className="dashboard-action-card group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-3xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity" />
            <div className="dashboard-action-panel relative glass-panel rounded-3xl hover:border-slate-600 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="dashboard-action-icon bg-gradient-to-br from-cyan-600 to-blue-600">
                  <Folder className="w-5 h-5 text-white" />
                </div>
                <h2 className="dashboard-action-title">View All Projects</h2>
              </div>
              <p className="dashboard-action-copy">Browse and manage your storyboard projects</p>
            </div>
          </button>
        </motion.div>

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Clock className="w-6 h-6 text-violet-400" />
                Recent Projects
              </h2>
              <button
                onClick={onViewProjects}
                className="text-violet-400 hover:text-violet-300 transition-colors text-sm font-medium"
              >
                View All
              </button>
            </div>

            <div className="dashboard-recent-grid">
              {recentProjects.map((project, idx) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                  className="group relative text-left"
                >
                  <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-2xl blur opacity-0 group-hover:opacity-50 transition-opacity" />
                  <div className="relative glass-panel rounded-2xl overflow-hidden group-hover:border-slate-700 transition-all">
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
                    <div className="p-4 bg-slate-900/40 backdrop-blur-sm">
                      <p className="text-sm text-slate-400 line-clamp-2">{project.description}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        Updated {new Date(project.updatedAt).toLocaleDateString()}
                      </p>
                      <div className="dashboard-card-actions">
                        <button
                          type="button"
                          className="dashboard-action-btn storyboard"
                          onClick={() => onOpenProject(project)}
                          disabled={project.status !== 'ready'}
                        >
                          <Film className="w-4 h-4" />
                          Storyboard
                        </button>
                        <button
                          type="button"
                          className="dashboard-action-btn poster"
                          onClick={() => onOpenPosterWall(project)}
                          disabled={project.status !== 'ready'}
                        >
                          <ImageIcon className="w-4 h-4" />
                          Poster Lab
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
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
            <button onClick={onCreateNew} className="app-primary-btn">
              <span className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create New Project
              </span>
            </button>
          </motion.div>
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

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className={`glass-card app-stat-card ${accent ?? ''}`}>
      <div className="app-stat-icon">{icon}</div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
    </div>
  );
}
