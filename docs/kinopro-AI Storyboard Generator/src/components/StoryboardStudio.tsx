import { useState } from "react";
import { Storyboard, StoryboardFrame, Project } from "../App";
import { StoryboardGallery } from "./StoryboardGallery";
import { SelectedSequence } from "./SelectedSequence";
import {
  Film,
  Layers,
  ArrowLeft,
  Download,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface StoryboardStudioProps {
  project: Project;
  onBack: () => void;
  onUpdateProject: (project: Project) => void;
  onExport: () => void;
}

export function StoryboardStudio({
  project,
  onBack,
  onUpdateProject,
  onExport,
}: StoryboardStudioProps) {
  const [selectedFrames, setSelectedFrames] = useState<
    StoryboardFrame[]
  >(project.selectedFrames);
  const [viewMode, setViewMode] = useState<
    "gallery" | "compare"
  >("gallery");

  const handleToggleFrame = (frame: StoryboardFrame) => {
    setSelectedFrames((prev) => {
      const exists = prev.find((f) => f.id === frame.id);
      const newFrames = exists
        ? prev.filter((f) => f.id !== frame.id)
        : [...prev, frame];

      // Update project
      const updatedProject = {
        ...project,
        selectedFrames: newFrames,
        updatedAt: new Date(),
      };
      onUpdateProject(updatedProject);

      return newFrames;
    });
  };

  const handleSelectAll = (storyboard: Storyboard) => {
    setSelectedFrames(storyboard.frames);
    const updatedProject = {
      ...project,
      selectedFrames: storyboard.frames,
      updatedAt: new Date(),
    };
    onUpdateProject(updatedProject);
  };

  const handleReorder = (frames: StoryboardFrame[]) => {
    setSelectedFrames(frames);
    const updatedProject = {
      ...project,
      selectedFrames: frames,
      updatedAt: new Date(),
    };
    onUpdateProject(updatedProject);
  };

  const handleExportClick = () => {
    const updatedProject = {
      ...project,
      selectedFrames,
      updatedAt: new Date(),
    };
    onUpdateProject(updatedProject);
    onExport();
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/50 via-black to-cyan-950/50" />
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-violet-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="relative z-50 border-b border-slate-800/50 backdrop-blur-xl bg-black/40"
      >
        <div className="px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Dashboard</span>
            </button>

            <div className="w-px h-8 bg-slate-700" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <Film className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">
                  {project.name}
                </h1>
                <p className="text-sm text-slate-400">
                  {project.storyboards.length} variations ready
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex gap-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-1 border border-slate-700/50">
              <button
                onClick={() => setViewMode("gallery")}
                className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                  viewMode === "gallery"
                    ? "bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Layers className="w-4 h-4 inline mr-2" />
                Gallery
              </button>
              <button
                onClick={() => setViewMode("compare")}
                className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                  viewMode === "compare"
                    ? "bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Compare
              </button>
            </div>

            {/* Export Button */}
            {selectedFrames.length > 0 && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={handleExportClick}
                className="relative group"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity" />
                <div className="relative px-6 py-2.5 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl font-medium flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export ({selectedFrames.length})
                </div>
              </motion.button>
            )}
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="relative z-10">
        <div
          className={selectedFrames.length > 0 ? "pb-80" : ""}
        >
          <StoryboardGallery
            storyboards={project.storyboards}
            selectedFrames={selectedFrames}
            viewMode={viewMode}
            onToggleFrame={handleToggleFrame}
            onSelectAll={handleSelectAll}
          />
        </div>

        {/* Selected Sequence */}
        <AnimatePresence>
          {selectedFrames.length > 0 && (
            <SelectedSequence
              selectedFrames={selectedFrames}
              onReorder={handleReorder}
              onRemove={(frameId) => {
                const newFrames = selectedFrames.filter(
                  (f) => f.id !== frameId,
                );
                setSelectedFrames(newFrames);
                const updatedProject = {
                  ...project,
                  selectedFrames: newFrames,
                  updatedAt: new Date(),
                };
                onUpdateProject(updatedProject);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}