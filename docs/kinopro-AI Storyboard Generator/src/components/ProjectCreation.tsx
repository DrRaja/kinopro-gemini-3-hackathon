import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Upload, Film, Sparkles, Zap } from 'lucide-react';

interface ProjectCreationProps {
  onBack: () => void;
  onCreate: (file: File, name: string, description: string) => Promise<void>;
}

export function ProjectCreation({ onBack, onCreate }: ProjectCreationProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
      if (!name) {
        setName(e.dataTransfer.files[0].name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      if (!name) {
        setName(e.target.files[0].name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleCreate = async () => {
    if (file && name) {
      setIsGenerating(true);
      await onCreate(file, name, description);
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/50 via-black to-cyan-950/50" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back
          </button>

          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-2xl mb-6 relative">
              <Film className="w-10 h-10 text-white relative z-10" />
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-2xl blur-xl opacity-50" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-violet-200 to-cyan-200 bg-clip-text text-transparent mb-3">
              Create New Project
            </h1>
            <p className="text-xl text-slate-400">Upload your video and let AI generate stunning storyboards</p>
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
            <div className={`absolute -inset-1 bg-gradient-to-r ${
              file ? 'from-green-500 to-emerald-500' : 'from-violet-500 to-cyan-500'
            } rounded-3xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity`} />
            
            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-12">
              <input
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              
              <div className="text-center relative z-0">
                {file ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center">
                      <Film className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">{file.name}</h3>
                    <p className="text-slate-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • Click to change file
                    </p>
                  </motion.div>
                ) : (
                  <>
                    <Upload className="w-20 h-20 text-slate-600 mx-auto mb-6" />
                    <h3 className="text-2xl font-bold text-white mb-2">Drop your video here</h3>
                    <p className="text-slate-400 mb-4">or click to browse your files</p>
                    <p className="text-sm text-slate-500">Supports MP4, MOV, AVI • Up to 500MB</p>
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
                className="relative w-full px-6 py-4 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
              />
            </div>

            <div className="relative group">
              <label className="block text-sm font-medium text-slate-300 mb-2">Description (Optional)</label>
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-xl blur-lg opacity-0 group-hover:opacity-20 transition-opacity" />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your project, style preferences, or any specific directions..."
                className="relative w-full px-6 py-4 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 resize-none"
                rows={4}
              />
            </div>
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreate}
            disabled={!file || !name || isGenerating}
            className="relative w-full group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity" />
            <div className="relative px-8 py-5 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-2xl font-bold text-xl text-white flex items-center justify-center gap-3">
              {isGenerating ? (
                <>
                  <Sparkles className="w-6 h-6 animate-spin" />
                  Generating Storyboards...
                </>
              ) : (
                <>
                  <Zap className="w-6 h-6" />
                  Create Project & Generate
                </>
              )}
            </div>
          </button>
        </motion.div>
      </div>
    </div>
  );
}
