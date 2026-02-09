import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { ArrowLeft, Download, Image as ImageIcon, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { PosterCandidate, PosterGeneration, Project } from '../types';
import { deleteProjectPoster, generateProjectPosters, getProjectPosters } from '../lib/api';
import logoIcon from '../assets/kino-green-logo-icon.png';

interface PosterWallProps {
  project: Project;
  onBack: () => void;
  onUpdateProject: (project: Project) => void;
}

const sizeOptions = [
  { label: '2:3 Movie Poster (1024x1536)', value: '1024x1536' },
  { label: '3:4 Vertical (1024x1365)', value: '1024x1365' },
  { label: '4:5 Social Portrait (1024x1280)', value: '1024x1280' },
  { label: '1:1 Square (1024x1024)', value: '1024x1024' },
  { label: '16:9 Wide (1280x720)', value: '1280x720' },
  { label: '9:16 Story (720x1280)', value: '720x1280' },
];

export function PosterWall({ project, onBack, onUpdateProject }: PosterWallProps) {
  const [candidates, setCandidates] = useState<PosterCandidate[]>(project.posterCandidates ?? []);
  const [posters, setPosters] = useState<PosterGeneration[]>(project.posterGenerations ?? []);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [posterText, setPosterText] = useState('');
  const [size, setSize] = useState(sizeOptions[0].value);
  const variants = 1;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getProjectPosters(project.id)
      .then((payload) => {
        if (!mounted) return;
        setCandidates(payload.candidates);
        setPosters(payload.posters);
        onUpdateProject({
          ...project,
          posterCandidates: payload.candidates,
          posterGenerations: payload.posters,
          updatedAt: new Date(),
        });
      })
      .catch((err) => {
        if (!mounted) return;
        console.error(err);
        setError('Could not load poster candidates. Check the API and try again.');
        toast.error('Could not load poster candidates.');
      });
    return () => {
      mounted = false;
    };
  }, [project.id]);

  const selectedCandidates = useMemo(
    () => candidates.filter((candidate) => selectedIds.includes(candidate.id)),
    [candidates, selectedIds],
  );

  const sortedPosters = useMemo(() => {
    return [...posters].sort((a, b) => {
      const aTime = Date.parse(a.createdAt || '');
      const bTime = Date.parse(b.createdAt || '');
      if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) {
        return bTime - aTime;
      }
      return b.id.localeCompare(a.id);
    });
  }, [posters]);

  const toggleCandidate = (candidateId: string) => {
    setSelectedIds((prev) =>
      prev.includes(candidateId) ? prev.filter((id) => id !== candidateId) : [...prev, candidateId],
    );
  };

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await generateProjectPosters({
        projectId: project.id,
        candidateIds: selectedIds,
        prompt: prompt.trim() || undefined,
        text: posterText.trim() || undefined,
        size,
        variants,
      });
      setCandidates(result.candidates);
      setPosters(result.posters);
      onUpdateProject({
        ...project,
        posterCandidates: result.candidates,
        posterGenerations: result.posters,
        updatedAt: new Date(),
      });
      toast.success(`Generated ${result.posters.length} posters.`);
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Poster generation failed. Check your OpenRouter key or try fewer variants.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePoster = async (posterId: string) => {
    try {
      const result = await deleteProjectPoster(project.id, posterId);
      setPosters(result.posters);
      onUpdateProject({
        ...project,
        posterCandidates: result.candidates,
        posterGenerations: result.posters,
        updatedAt: new Date(),
      });
      toast.success('Poster deleted.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete poster.');
    }
  };

  const handleDeleteClick = (posterId: string) => {
    if (deleteConfirmId === posterId) {
      setDeleteConfirmId(null);
      handleDeletePoster(posterId);
      return;
    }
    setDeleteConfirmId(posterId);
    setTimeout(() => {
      setDeleteConfirmId((current) => (current === posterId ? null : current));
    }, 3000);
  };

  return (
    <div className="spectacle-page">
      <div className="spectacle-bg">
        <div className="spectacle-orb orb-one" />
        <div className="spectacle-orb orb-two" />
        <div className="spectacle-orb orb-three" />
        <div className="spectacle-gridlines" />
      </div>

      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="relative z-50 glass-panel"
        style={{ marginBottom: 30 }}
      >
        <div className="px-8 py-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center">
                <img src={logoIcon} alt="KinoPro" className="w-11 h-11 object-contain" />
              </div>
              <div>
                <h1 className="font-bold text-lg">{project.name}</h1>
                <p className="text-sm text-slate-400">Poster Lab</p>
              </div>
            </div>
          </div>

          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Projects
          </button>
        </div>
      </motion.header>

      <div className="relative z-10 app-shell app-shell-wide pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-6 mt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br sb-gradient-2 rounded-xl flex items-center justify-center relative">
                  <ImageIcon className="w-6 h-6 text-white relative z-10" />
                  <div className="absolute inset-0 bg-gradient-to-br sb-gradient-2 rounded-xl blur-lg opacity-50" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                    Poster Candidates
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">
                    Select frames to guide the poster look.
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-400">{selectedIds.length} selected</p>
            </div>
            {candidates.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center glass-panel">
                <ImageIcon className="w-10 h-10 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Generating poster candidates. Refresh in a moment.</p>
              </div>
            ) : (
              <div className="poster-candidates-grid poster-candidates-spacing">
                {candidates.map((candidate, idx) => {
                  const isSelected = selectedIds.includes(candidate.id);
                  return (
                    <motion.button
                      key={candidate.id}
                      onClick={() => toggleCandidate(candidate.id)}
                      whileHover={{ y: -4 }}
                      className={`poster-candidate-card ${isSelected ? 'poster-candidate-selected' : ''}`}
                    >
                      <div className="relative">
                        <img
                          src={candidate.imageUrl}
                          alt={`Poster candidate ${idx + 1}`}
                          className="w-full h-44 object-cover"
                        />
                        <div className="absolute top-2 right-2">
                          <span className={`poster-candidate-pill ${isSelected ? 'is-selected' : ''}`}>
                            {isSelected ? 'Selected' : 'Select'}
                          </span>
                        </div>
                      </div>
                      <div className="p-3 text-left">
                        <p className="text-xs text-slate-400">{candidate.timestamp}</p>
                        <p className="text-sm text-slate-200 mt-1 line-clamp-2">
                          {candidate.description || 'Poster-worthy frame'}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-4 mt-10 lg:mt-0">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6 glass-panel">
              <div className="flex items-center gap-3 text-lg font-semibold">
                <div className="w-10 h-10 bg-gradient-to-br sb-gradient-3 rounded-xl flex items-center justify-center relative">
                  <Sparkles className="w-5 h-5 text-white relative z-10" />
                  <div className="absolute inset-0 bg-gradient-to-br sb-gradient-3 rounded-xl blur-lg opacity-50" />
                </div>
                <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  Poster Generator
                </span>
              </div>

              <div>
                <label className="text-sm text-slate-400">Creative direction</label>
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  className="poster-input mt-2 h-24"
                  placeholder="Cinematic, moody, high-contrast thriller with neon rain..."
                />
              </div>

              <div>
                <label className="text-sm text-slate-400">Text to include (optional)</label>
                <input
                  value={posterText}
                  onChange={(event) => setPosterText(event.target.value)}
                  className="poster-input mt-2"
                  placeholder="Film title / tagline / credits"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400">Dimensions</label>
                <select
                  value={size}
                  onChange={(event) => setSize(event.target.value)}
                  className="poster-input mt-2"
                >
                  {sizeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {error}
                </div>
              )}

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerate}
                disabled={loading}
                className="poster-generate-button mt-2"
              >
                <Wand2 className="w-4 h-4" />
                {loading ? 'Generating...' : 'Generate Posters'}
              </motion.button>

              <p className="text-xs text-slate-500">
                {selectedCandidates.length > 0
                  ? `Using ${selectedCandidates.length} selected still(s) as reference.`
                  : 'No still selected. Poster will be generated from prompt only.'}
              </p>
            </div>
          </div>
        </div>
        <div className="h-16" />

        <div className="mt-6 pb-16">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br sb-gradient-5 rounded-xl flex items-center justify-center relative">
                <Sparkles className="w-5 h-5 text-white relative z-10" />
                <div className="absolute inset-0 bg-gradient-to-br sb-gradient-5 rounded-xl blur-lg opacity-50" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  Generated Posters
                </h2>
                <p className="text-slate-400 text-sm mt-1">Newest results appear first.</p>
              </div>
            </div>
            <span className="text-sm text-slate-500">{posters.length} total</span>
          </div>
          {posters.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center glass-panel">
              <Sparkles className="w-10 h-10 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No posters yet. Generate your first set.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-6">
              {sortedPosters.map((poster) => (
                <motion.div
                  key={poster.id}
                  whileHover={{ y: -4 }}
                  className="poster-output-card"
                >
                  <img src={poster.imageUrl} alt="Generated poster" className="w-full h-56 object-cover" />
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-xs text-slate-400">{poster.size}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="poster-download-button"
                        onClick={() => {
                          fetch(poster.imageUrl)
                            .then((response) => {
                              if (!response.ok) {
                                throw new Error('Download failed');
                              }
                              return response.blob();
                            })
                            .then((blob) => {
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `${project.name}-${poster.id}.png`;
                              document.body.appendChild(link);
                              link.click();
                              link.remove();
                              URL.revokeObjectURL(url);
                            })
                            .catch((error) => {
                              console.error(error);
                              toast.error('Download failed.');
                            });
                        }}
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                      <button
                        type="button"
                        className={`poster-delete-button ${
                          deleteConfirmId === poster.id ? 'is-confirm' : ''
                        }`}
                        onClick={() => handleDeleteClick(poster.id)}
                        aria-label="Delete poster"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {deleteConfirmId === poster.id && (
                    <p className="poster-delete-confirm">Click delete again to confirm</p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
