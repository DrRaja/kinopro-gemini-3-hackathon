import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Upload, Film, Sparkles, Zap, Clock } from 'lucide-react';
import logoIcon from '../assets/kino-green-logo-icon.png';

interface ProjectCreationProps {
  onBack: () => void;
  onCreate: (file: File, name: string, description: string, durationSeconds: number) => Promise<void>;
}

export function ProjectCreation({ onBack, onCreate }: ProjectCreationProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [durationLabel, setDurationLabel] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const extractDuration = (selectedFile: File) => {
    const url = URL.createObjectURL(selectedFile);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const seconds = video.duration || 0;
      setDurationSeconds(seconds);
      setDurationLabel(formatDuration(seconds));
      URL.revokeObjectURL(url);
    };
    video.src = url;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      const selected = e.dataTransfer.files[0];
      setFile(selected);
      if (!name) {
        setName(selected.name.replace(/\.[^/.]+$/, ''));
      }
      extractDuration(selected);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!name) {
        setName(selected.name.replace(/\.[^/.]+$/, ''));
      }
      extractDuration(selected);
    }
  };

  const handleCreate = async () => {
    if (file && name) {
      setIsGenerating(true);
      await onCreate(file, name, description, durationSeconds ?? 0);
      if (isMounted.current) {
        setIsGenerating(false);
      }
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

      <div className="app-shell app-shell-tight">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back
          </button>

          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6">
              <img src={logoIcon} alt="KinoPro" className="w-12 h-12 object-contain" />
            </div>
            <h1 className="app-title app-title-gradient mb-3">Create New Project</h1>
            <p className="app-subtitle text-base">
              Upload your video and let AI generate stunning storyboards
            </p>
          </div>

          {/* Upload Area */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`relative group mb-6 ${
              dragActive ? 'scale-105' : file ? 'scale-100' : 'hover:scale-[1.02]'
            } transition-transform duration-300`}
          >
            <div
              className={`absolute -inset-1 bg-gradient-to-r ${
                file ? 'from-green-500 to-emerald-500' : 'from-violet-500 to-cyan-500'
              } rounded-3xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity`}
            />

            <div className="relative glass-panel rounded-3xl p-12">
              <input
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />

              <div className="text-center relative z-0">
                {file ? (
                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center">
                      <Film className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">{file.name}</h3>
                    <p className="text-slate-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB - Click to change file
                    </p>
                    {durationLabel && (
                      <p className="text-sm text-slate-500 mt-2 flex items-center justify-center gap-2">
                        <Clock className="w-4 h-4" />
                        Detected duration: {durationLabel}
                      </p>
                    )}
                  </motion.div>
                ) : (
                  <>
                    <Upload className="w-20 h-20 text-slate-600 mx-auto mb-6" />
                    <h3 className="text-2xl font-bold text-white mb-2">Drop your video here</h3>
                    <p className="text-slate-400 mb-4">or click to browse your files</p>
                    <p className="text-sm text-slate-500">Supports MP4, MOV, AVI - Up to 500MB</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Project Details */}
          <div className="space-y-6 mb-8">
            <div className="relative group">
              <label className="block text-sm font-medium text-slate-300 mb-2">Project Name *</label>
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-xl blur-lg opacity-0 group-hover:opacity-20 transition-opacity" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Amazing Storyboard"
                className="relative app-input"
              />
            </div>

            <div className="relative group">
              <label className="block text-sm font-medium text-slate-300 mb-2">Description (Optional)</label>
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-xl blur-lg opacity-0 group-hover:opacity-20 transition-opacity" />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your project, style preferences, or any specific directions..."
                className="relative app-input resize-none"
                rows={4}
              />
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-300 glass-panel">
            Uploading can take a while depending on your file size. You will be redirected to your project list once the upload begins.
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreate}
            disabled={!file || !name || isGenerating}
            className="app-primary-btn app-primary-lg w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="flex items-center justify-center gap-3">
              {isGenerating ? (
                <>
                  <Sparkles className="w-6 h-6 animate-spin" />
                  Uploading and processing...
                </>
              ) : (
                <>
                  <Zap className="w-6 h-6" />
                  Create Project & Generate
                </>
              )}
            </span>
          </button>
        </motion.div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;
  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
}
