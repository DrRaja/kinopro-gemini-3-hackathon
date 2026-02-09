import { useEffect, useState } from "react";
import { Storyboard, StoryboardFrame, Project } from "../types";
import { StoryboardGallery } from "./StoryboardGallery";
import { SelectedSequence } from "./SelectedSequence";
import {
  Film,
  Layers,
  ArrowLeft,
  Download,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import logoIcon from "../assets/kino-green-logo-icon.png";
import { preloadImages } from "../lib/imageCache";

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
  const hasExpectedFrames = project.framesCount > 0 || project.storyboardsCount > 0;
  const [isLoading, setIsLoading] = useState(hasExpectedFrames && project.storyboards.length === 0);

  useEffect(() => {
    let active = true;
    const urls = project.storyboards
      .flatMap((storyboard) => storyboard.frames.map((frame) => frame.imageUrl))
      .filter(Boolean);
    const initialBatch = urls.slice(0, 6);
    if (!hasExpectedFrames) {
      setIsLoading(false);
      return () => {
        active = false;
      };
    }
    if (urls.length === 0) {
      setIsLoading(true);
      return () => {
        active = false;
      };
    }
    setIsLoading(true);

    const finish = () => {
      if (active) {
        setIsLoading(false);
      }
    };

    if (initialBatch.length === 0) {
      finish();
    } else {
      preloadImages(initialBatch).then(finish);
    }

    if (urls.length > initialBatch.length) {
      preloadImages(urls.slice(0, 48));
    }

    return () => {
      active = false;
    };
  }, [project.id, project.storyboards, project.framesCount, project.storyboardsCount, hasExpectedFrames]);

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

  const handleToggleAll = (storyboard: Storyboard, shouldSelect: boolean) => {
    setSelectedFrames((prev) => {
      let nextFrames: StoryboardFrame[];
      if (shouldSelect) {
        const merged = new Map(prev.map((frame) => [frame.id, frame]));
        storyboard.frames.forEach((frame) => merged.set(frame.id, frame));
        nextFrames = Array.from(merged.values());
      } else {
        const removeIds = new Set(storyboard.frames.map((frame) => frame.id));
        nextFrames = prev.filter((frame) => !removeIds.has(frame.id));
      }

      const updatedProject = {
        ...project,
        selectedFrames: nextFrames,
        updatedAt: new Date(),
      };
      onUpdateProject(updatedProject);
      return nextFrames;
    });
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
    <div className="spectacle-page storyboard-page">
      <div className="spectacle-bg">
        <div className="spectacle-orb orb-one" />
        <div className="spectacle-orb orb-two" />
        <div className="spectacle-orb orb-three" />
        <div className="spectacle-gridlines" />
      </div>

      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="relative z-50 glass-panel sticky top-0"
      >
        <div className="px-8 py-6 flex items-center justify-between flex-wrap gap-4">
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
              <div className="w-12 h-12 flex items-center justify-center">
                <img src={logoIcon} alt="KinoPro" className="w-12 h-12 object-contain" />
              </div>
              <div>
                <h1 className="font-bold text-lg">
                  {project.name}
                </h1>
                <p className="text-sm text-slate-400">
                  {project.storyboardsCount || project.storyboards.length} variations ready
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            <div className="app-toggle-group">
              <button
                onClick={() => setViewMode("gallery")}
                className={`app-toggle-btn ${viewMode === "gallery" ? "is-active" : ""}`}
              >
                <Layers className="w-4 h-4 inline mr-2" />
                Gallery
              </button>
              <button
                onClick={() => setViewMode("compare")}
                className={`app-toggle-btn ${viewMode === "compare" ? "is-active" : ""}`}
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
                className="app-primary-btn"
              >
                <span className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export ({selectedFrames.length})
                </span>
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
            onToggleAll={handleToggleAll}
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

      {isLoading && (
        <div className="storyboard-loader" role="status" aria-live="polite">
          <div className="storyboard-loader-card glass-panel">
            <img src={logoIcon} alt="Loading" className="storyboard-loader-icon" />
            <p className="storyboard-loader-text">Loading storyboards</p>
          </div>
        </div>
      )}
    </div>
  );
}
