import { useEffect, useState } from 'react';
import { Project, StoryboardFrame } from '../types';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Download,
  Video,
  FileCode,
  Grid3x3,
  Grid2x2,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  Clock,
  Camera,
  Film,
  CheckCircle2,
} from 'lucide-react';
import { requestExport } from '../lib/api';

interface ExportPageProps {
  project: Project;
  onBack: () => void;
}

type GridSize = 2 | 3 | 4 | 6;

type ExportFormat = 'video' | 'edl' | 'xml' | 'json';

export function ExportPage({ project, onBack }: ExportPageProps) {
  const [gridSize, setGridSize] = useState<GridSize>(4);
  const [expandedFrames, setExpandedFrames] = useState<Set<string>>(
    () => new Set(project.selectedFrames.map((frame) => frame.id))
  );
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('video');
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    setExpandedFrames(new Set(project.selectedFrames.map((frame) => frame.id)));
  }, [project.id, project.selectedFrames.length]);

  const toggleFrameExpanded = (frameId: string) => {
    setExpandedFrames((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(frameId)) {
        newSet.delete(frameId);
      } else {
        newSet.add(frameId);
      }
      return newSet;
    });
  };

  const triggerDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Download failed');
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${project.name.replace(/\s+/g, '_')}.${selectedFormat}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error(error);
      window.open(url, '_blank', 'noopener');
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportMessage(null);

    try {
      const response = await requestExport(project.id, selectedFormat, project.selectedFrames);
      setExportMessage(`Export ready: ${selectedFormat.toUpperCase()}`);
      if (response?.download_url) {
        await triggerDownload(response.download_url as string);
      }
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const totalDuration = project.selectedFrames.reduce((acc, frame) => acc + frame.duration, 0);

  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    6: 'grid-cols-6',
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
        className="relative z-50 glass-panel sticky top-0"
      >
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              Back to Studio
            </button>

            <button onClick={handleExport} disabled={isExporting} className="app-primary-btn">
              <span className="flex items-center gap-2">
                <Download className={`w-5 h-5 ${isExporting ? 'animate-bounce' : ''}`} />
                {isExporting ? 'Exporting...' : `Export ${selectedFormat.toUpperCase()}`}
              </span>
            </button>
          </div>

          {/* Project Info */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="app-section-title app-title-gradient">{project.name}</h1>
              <p className="app-section-subtitle">
                {project.selectedFrames.length} frames - {totalDuration.toFixed(1)}s total duration
              </p>
            </div>

            {/* Grid Size Control */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400 mr-2">Grid:</span>
              <div className="app-toggle-group">
                <button
                  onClick={() => setGridSize(2)}
                  className={`app-toggle-btn ${gridSize === 2 ? 'is-active' : ''}`}
                  title="2 columns"
                >
                  <Grid2x2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setGridSize(3)}
                  className={`app-toggle-btn ${gridSize === 3 ? 'is-active' : ''}`}
                  title="3 columns"
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setGridSize(4)}
                  className={`app-toggle-btn ${gridSize === 4 ? 'is-active' : ''}`}
                  title="4 columns"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setGridSize(6)}
                  className={`app-toggle-btn ${gridSize === 6 ? 'is-active' : ''}`}
                  title="6 columns"
                >
                  <LayoutGrid className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Export Format Selector */}
        <div className="px-8 pb-6">
          <div className="export-format-grid">
            <FormatButton
              icon={<Video className="w-5 h-5" />}
              label="Video"
              description="MP4 animatic"
              selected={selectedFormat === 'video'}
              onClick={() => setSelectedFormat('video')}
            />
            <FormatButton
              icon={<FileCode className="w-5 h-5" />}
              label="EDL"
              description="Premiere Pro"
              selected={selectedFormat === 'edl'}
              onClick={() => setSelectedFormat('edl')}
            />
            <FormatButton
              icon={<FileCode className="w-5 h-5" />}
              label="XML"
              description="Final Cut / DaVinci"
              selected={selectedFormat === 'xml'}
              onClick={() => setSelectedFormat('xml')}
            />
            <FormatButton
              icon={<FileCode className="w-5 h-5" />}
              label="JSON"
              description="CapCut / Custom"
              selected={selectedFormat === 'json'}
              onClick={() => setSelectedFormat('json')}
            />
          </div>

          {exportMessage && (
            <div className="export-ready flex items-center gap-3 text-sm text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{exportMessage}</span>
            </div>
          )}
        </div>
      </motion.header>

      {/* Storyboard Grid */}
      <div className="relative z-10 app-shell app-shell-wide pt-8">
        <div className={`grid ${gridCols[gridSize]} gap-6`}>
          {project.selectedFrames.map((frame, index) => (
            <StoryboardCell
              key={frame.id}
              frame={frame}
              index={index}
              isExpanded={expandedFrames.has(frame.id)}
              onToggleExpand={() => toggleFrameExpanded(frame.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function FormatButton({
  icon,
  label,
  description,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`export-format-option ${selected ? 'is-selected' : ''}`}
    >
      <div className="export-format-option-glow" />
      <div
        className={`export-format-option-card ${selected ? 'is-selected' : ''}`}
      >
        <div className={`export-format-option-icon ${selected ? 'is-selected' : ''}`}>{icon}</div>
        <div className="export-format-option-copy">
          <div className="export-format-option-label">{label}</div>
          <div className="export-format-option-desc">{description}</div>
        </div>
      </div>
    </button>
  );
}

function StoryboardCell({
  frame,
  index,
  isExpanded,
  onToggleExpand,
}: {
  frame: StoryboardFrame;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03 }}
      className="relative group"
    >
      <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl blur opacity-0 group-hover:opacity-30 transition-opacity" />
      <div className="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group-hover:border-slate-700 transition-all">
        {/* Frame Number Badge */}
        <div className="absolute top-3 left-3 z-10">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-cyan-600 rounded-lg flex items-center justify-center text-sm font-bold text-white shadow-lg">
            {index + 1}
          </div>
        </div>

        {/* Image */}
        <div className="aspect-video bg-slate-800 relative overflow-hidden">
          <img src={frame.imageUrl} alt={frame.scene} className="w-full h-full object-cover" />

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          {/* Basic Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="font-bold text-white text-sm mb-1">{frame.emotionalBeat ?? frame.scene}</h3>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {frame.timestamp}
              </span>
              <span>-</span>
              <span>{frame.duration.toFixed(1)}s</span>
            </div>
          </div>
        </div>

        {/* Expandable Metadata */}
        <div className="bg-slate-900/80 backdrop-blur-sm">
          <button
            onClick={onToggleExpand}
            className="w-full px-4 py-3 flex items-center justify-between text-sm text-slate-400 hover:text-white transition-colors"
          >
            <span className="font-medium">Details</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pb-4 space-y-3 border-t border-slate-800/50"
            >
              <MetadataRow icon={<Film className="w-4 h-4" />} label="Storyboard" value={frame.storyboardName} />
              <MetadataRow icon={<Camera className="w-4 h-4" />} label="Music Idea" value={frame.musicIdea ?? frame.cameraMove} />
              <MetadataRow icon={<Clock className="w-4 h-4" />} label="Duration" value={`${frame.duration.toFixed(2)}s`} />
              <MetadataRow label="Timestamp" value={frame.timestamp} />
              <MetadataRow label="Beat" value={frame.emotionalBeat ?? frame.scene} />
              <div className="pt-2 border-t border-slate-800/50">
                <p className="text-xs text-slate-500 leading-relaxed">{frame.description}</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function MetadataRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-white font-medium text-right">{value}</span>
    </div>
  );
}
