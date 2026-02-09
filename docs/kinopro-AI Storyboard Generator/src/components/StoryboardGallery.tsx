import { Storyboard, StoryboardFrame } from '../App';
import { motion } from 'motion/react';
import { Check, Plus, Film } from 'lucide-react';

interface StoryboardGalleryProps {
  storyboards: Storyboard[];
  selectedFrames: StoryboardFrame[];
  viewMode: 'gallery' | 'compare';
  onToggleFrame: (frame: StoryboardFrame) => void;
  onSelectAll: (storyboard: Storyboard) => void;
}

export function StoryboardGallery({
  storyboards,
  selectedFrames,
  viewMode,
  onToggleFrame,
  onSelectAll
}: StoryboardGalleryProps) {
  const selectedIds = new Set(selectedFrames.map(f => f.id));

  if (viewMode === 'compare') {
    return <CompareView storyboards={storyboards} selectedIds={selectedIds} onToggleFrame={onToggleFrame} />;
  }

  return (
    <div className="px-8 py-8 space-y-12">
      {storyboards.map((storyboard, sbIdx) => {
        const selectedCount = storyboard.frames.filter(f => selectedIds.has(f.id)).length;
        const allSelected = selectedCount === storyboard.frames.length;

        return (
          <motion.div
            key={storyboard.id}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sbIdx * 0.1 }}
            className="relative group"
          >
            {/* Storyboard Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${storyboard.color} rounded-xl flex items-center justify-center relative`}>
                  <Film className="w-6 h-6 text-white relative z-10" />
                  <div className={`absolute inset-0 bg-gradient-to-br ${storyboard.color} rounded-xl blur-lg opacity-50`} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                    {storyboard.name}
                  </h2>
                  <p className="text-slate-400 text-sm">{storyboard.theme}</p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelectAll(storyboard)}
                className={`relative group/btn ${allSelected ? 'opacity-100' : 'opacity-60 hover:opacity-100'} transition-opacity`}
              >
                <div className={`absolute -inset-1 bg-gradient-to-r ${storyboard.color} rounded-xl blur ${allSelected ? 'opacity-75' : 'opacity-0 group-hover/btn:opacity-50'} transition-opacity`} />
                <div className={`relative px-6 py-3 ${
                  allSelected 
                    ? `bg-gradient-to-r ${storyboard.color}` 
                    : 'bg-slate-900 border border-slate-700'
                } rounded-xl font-medium flex items-center gap-2`}>
                  {allSelected ? (
                    <>
                      <Check className="w-4 h-4" />
                      All Selected
                    </>
                  ) : (
                    <>
                      Select All ({storyboard.frames.length})
                    </>
                  )}
                </div>
              </motion.button>
            </div>

            {/* Frames Grid */}
            <div className="grid grid-cols-6 gap-4">
              {storyboard.frames.map((frame, frameIdx) => {
                const isSelected = selectedIds.has(frame.id);

                return (
                  <motion.div
                    key={frame.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: sbIdx * 0.1 + frameIdx * 0.05 }}
                    className="relative group/frame"
                  >
                    <button
                      onClick={() => onToggleFrame(frame)}
                      className="w-full"
                    >
                      {/* Glow effect */}
                      <div className={`absolute -inset-1 bg-gradient-to-r ${storyboard.color} rounded-xl blur transition-opacity ${
                        isSelected ? 'opacity-75' : 'opacity-0 group-hover/frame:opacity-30'
                      }`} />
                      
                      {/* Frame card */}
                      <div className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                        isSelected 
                          ? 'border-white shadow-2xl scale-105' 
                          : 'border-slate-800 group-hover/frame:border-slate-600 group-hover/frame:scale-105'
                      }`}>
                        {/* Image */}
                        <div className="aspect-video bg-slate-900 relative overflow-hidden">
                          <img
                            src={frame.imageUrl}
                            alt={frame.scene}
                            className="w-full h-full object-cover"
                          />
                          
                          {/* Gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          
                          {/* Info */}
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <p className="text-xs font-bold text-white mb-0.5">{frame.scene}</p>
                            <p className="text-xs text-slate-300">{frame.cameraMove}</p>
                          </div>

                          {/* Timestamp */}
                          <div className="absolute top-2 left-2">
                            <div className="px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-xs font-mono text-white">
                              {frame.timestamp}
                            </div>
                          </div>

                          {/* Selection indicator */}
                          <div className="absolute top-2 right-2">
                            <motion.div
                              initial={false}
                              animate={{ scale: isSelected ? 1 : 0 }}
                              className={`w-7 h-7 bg-gradient-to-br ${storyboard.color} rounded-full flex items-center justify-center shadow-lg`}
                            >
                              <Check className="w-4 h-4 text-white" />
                            </motion.div>
                            {!isSelected && (
                              <div className="w-7 h-7 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover/frame:opacity-100 transition-opacity">
                                <Plus className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function CompareView({ storyboards, selectedIds, onToggleFrame }: {
  storyboards: Storyboard[];
  selectedIds: Set<string>;
  onToggleFrame: (frame: StoryboardFrame) => void;
}) {
  const sceneCount = storyboards[0]?.frames.length || 0;

  return (
    <div className="px-8 py-8 space-y-16">
      {Array.from({ length: sceneCount }, (_, sceneIdx) => (
        <motion.div
          key={sceneIdx}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: sceneIdx * 0.1 }}
        >
          {/* Scene Header */}
          <div className="mb-6">
            <h3 className="text-3xl font-bold bg-gradient-to-r from-white via-violet-200 to-cyan-200 bg-clip-text text-transparent mb-2">
              {storyboards[0].frames[sceneIdx].scene}
            </h3>
            <p className="text-slate-400">
              {storyboards[0].frames[sceneIdx].description} • {storyboards[0].frames[sceneIdx].timestamp}
            </p>
          </div>

          {/* Compare Grid */}
          <div className="grid grid-cols-4 gap-6">
            {storyboards.map((storyboard) => {
              const frame = storyboard.frames[sceneIdx];
              const isSelected = selectedIds.has(frame.id);

              return (
                <motion.button
                  key={frame.id}
                  onClick={() => onToggleFrame(frame)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative group"
                >
                  <div className={`absolute -inset-1 bg-gradient-to-r ${storyboard.color} rounded-2xl blur-lg transition-opacity ${
                    isSelected ? 'opacity-75' : 'opacity-0 group-hover:opacity-30'
                  }`} />
                  
                  <div className={`relative rounded-2xl overflow-hidden border-2 transition-all ${
                    isSelected ? 'border-white' : 'border-slate-800 group-hover:border-slate-600'
                  }`}>
                    <div className="aspect-video bg-slate-900 relative">
                      <img
                        src={frame.imageUrl}
                        alt={frame.scene}
                        className="w-full h-full object-cover"
                      />
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                      
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className={`inline-block px-3 py-1 bg-gradient-to-r ${storyboard.color} rounded-full text-xs font-bold text-white mb-2`}>
                          {storyboard.name}
                        </div>
                        <p className="text-sm text-white font-medium">{frame.cameraMove}</p>
                      </div>

                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-4 right-4"
                        >
                          <div className={`w-10 h-10 bg-gradient-to-br ${storyboard.color} rounded-full flex items-center justify-center shadow-2xl`}>
                            <Check className="w-5 h-5 text-white" />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
