import { useState } from 'react';
import { Project, StoryboardFrame } from '../App';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  Image, 
  Video, 
  FileCode,
  Grid3x3,
  Grid2x2,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  Clock,
  Camera,
  Film
} from 'lucide-react';

interface ExportPageProps {
  project: Project;
  onBack: () => void;
}

type GridSize = 2 | 3 | 4 | 6;
type ExportFormat = 'pdf' | 'images' | 'video' | 'edl' | 'xml' | 'json';

export function ExportPage({ project, onBack }: ExportPageProps) {
  const [gridSize, setGridSize] = useState<GridSize>(3);
  const [expandedFrames, setExpandedFrames] = useState<Set<string>>(new Set());
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [isExporting, setIsExporting] = useState(false);

  const toggleFrameExpanded = (frameId: string) => {
    setExpandedFrames(prev => {
      const newSet = new Set(prev);
      if (newSet.has(frameId)) {
        newSet.delete(frameId);
      } else {
        newSet.add(frameId);
      }
      return newSet;
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate download
    const formatNames = {
      pdf: 'PDF Document',
      images: 'Image Sequence (ZIP)',
      video: 'Video Preview',
      edl: 'EDL for Premiere Pro',
      xml: 'Final Cut Pro XML',
      json: 'JSON Metadata'
    };
    
    alert(`Exporting ${project.selectedFrames.length} frames as ${formatNames[selectedFormat]}...`);
    setIsExporting(false);
  };

  const totalDuration = project.selectedFrames.reduce((acc, frame) => acc + frame.duration, 0);

  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    6: 'grid-cols-6'
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/50 via-black to-cyan-950/50" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-500/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="relative z-50 border-b border-slate-800/50 backdrop-blur-xl bg-black/40 sticky top-0"
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

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity" />
              <div className="relative px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl font-medium flex items-center gap-2">
                {isExporting ? (
                  <>
                    <Download className="w-5 h-5 animate-bounce" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Export {selectedFormat.toUpperCase()}
                  </>
                )}
              </div>
            </button>
          </div>

          {/* Project Info */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-violet-200 to-cyan-200 bg-clip-text text-transparent">
                {project.name}
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                {project.selectedFrames.length} frames • {totalDuration.toFixed(1)}s total duration
              </p>
            </div>

            {/* Grid Size Control */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400 mr-2">Grid:</span>
              <div className="flex gap-2 bg-slate-900/50 backdrop-blur-sm rounded-lg p-1 border border-slate-700/50">
                <button
                  onClick={() => setGridSize(2)}
                  className={`p-2 rounded transition-all ${
                    gridSize === 2 ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="2 columns"
                >
                  <Grid2x2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setGridSize(3)}
                  className={`p-2 rounded transition-all ${
                    gridSize === 3 ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="3 columns"
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setGridSize(4)}
                  className={`p-2 rounded transition-all ${
                    gridSize === 4 ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="4 columns"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setGridSize(6)}
                  className={`p-2 rounded transition-all ${
                    gridSize === 6 ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
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
          <div className="grid grid-cols-6 gap-3">
            <FormatButton
              icon={<FileText className="w-5 h-5" />}
              label="PDF"
              description="Document with layouts"
              selected={selectedFormat === 'pdf'}
              onClick={() => setSelectedFormat('pdf')}
            />
            <FormatButton
              icon={<Image className="w-5 h-5" />}
              label="Images"
              description="PNG sequence (ZIP)"
              selected={selectedFormat === 'images'}
              onClick={() => setSelectedFormat('images')}
            />
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
        </div>
      </motion.header>

      {/* Storyboard Grid */}
      <div className="relative z-10 px-8 py-8">
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
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  description: string; 
  selected: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative group transition-all ${
        selected ? 'scale-105' : 'hover:scale-105'
      }`}
    >
      <div className={`absolute -inset-1 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl blur transition-opacity ${
        selected ? 'opacity-75' : 'opacity-0 group-hover:opacity-30'
      }`} />
      <div className={`relative p-4 rounded-xl border-2 transition-all ${
        selected 
          ? 'bg-slate-900 border-violet-500' 
          : 'bg-slate-900/50 border-slate-800 group-hover:border-slate-700'
      }`}>
        <div className={`mb-2 ${selected ? 'text-violet-400' : 'text-slate-400'}`}>
          {icon}
        </div>
        <div className="font-medium text-white text-sm">{label}</div>
        <div className="text-xs text-slate-500 mt-1">{description}</div>
      </div>
    </button>
  );
}

function StoryboardCell({ 
  frame, 
  index, 
  isExpanded, 
  onToggleExpand 
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
          <img
            src={frame.imageUrl}
            alt={frame.scene}
            className="w-full h-full object-cover"
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          
          {/* Basic Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="font-bold text-white text-sm mb-1">{frame.scene}</h3>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {frame.timestamp}
              </span>
              <span>•</span>
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
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pb-4 space-y-3 border-t border-slate-800/50"
            >
              <MetadataRow 
                icon={<Film className="w-4 h-4" />}
                label="Shot Type" 
                value={frame.shotType} 
              />
              <MetadataRow 
                icon={<Camera className="w-4 h-4" />}
                label="Camera Move" 
                value={frame.cameraMove} 
              />
              <MetadataRow 
                icon={<Clock className="w-4 h-4" />}
                label="Duration" 
                value={`${frame.duration.toFixed(2)}s`} 
              />
              <MetadataRow 
                label="Timestamp" 
                value={frame.timestamp} 
              />
              <MetadataRow 
                label="Style" 
                value={frame.storyboardName} 
              />
              <div className="pt-2 border-t border-slate-800/50">
                <p className="text-xs text-slate-500 leading-relaxed">
                  {frame.description}
                </p>
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
  value 
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
