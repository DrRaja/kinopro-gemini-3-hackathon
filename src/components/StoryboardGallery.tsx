import { useEffect, useRef, useState } from 'react';
import { Storyboard, StoryboardFrame } from '../types';
import { motion } from 'motion/react';
import { Check, Plus, Film, Play, Square } from 'lucide-react';

interface StoryboardGalleryProps {
  storyboards: Storyboard[];
  selectedFrames: StoryboardFrame[];
  viewMode: 'gallery' | 'compare';
  onToggleFrame: (frame: StoryboardFrame) => void;
  onToggleAll: (storyboard: Storyboard, shouldSelect: boolean) => void;
}

export function StoryboardGallery({
  storyboards,
  selectedFrames,
  viewMode,
  onToggleFrame,
  onToggleAll,
}: StoryboardGalleryProps) {
  const selectedIds = new Set(selectedFrames.map((f) => f.id));
  const totalFrames = storyboards.reduce((sum, storyboard) => sum + storyboard.frames.length, 0);
  const reduceMotion = totalFrames > 36;
  const [previewState, setPreviewState] = useState<{ storyboardId: string; index: number } | null>(
    null,
  );

  const handlePreviewToggle = (storyboardId: string) => {
    setPreviewState((prev) => {
      if (prev?.storyboardId === storyboardId) {
        return null;
      }
      return { storyboardId, index: 0 };
    });
  };

  const advancePreview = () => {
    setPreviewState((prev) => {
      if (!prev) {
        return prev;
      }
      const storyboard = storyboards.find((item) => item.id === prev.storyboardId);
      if (!storyboard) {
        return null;
      }
      const nextIndex = prev.index + 1;
      if (nextIndex >= storyboard.frames.length) {
        return null;
      }
      return { storyboardId: prev.storyboardId, index: nextIndex };
    });
  };

  useEffect(() => {
    if (!previewState) {
      return;
    }
    const storyboard = storyboards.find((item) => item.id === previewState.storyboardId);
    const frame = storyboard?.frames[previewState.index];
    if (!frame) {
      setPreviewState(null);
      return;
    }
    if (!frame.videoUrl) {
      const timeout = window.setTimeout(() => {
        advancePreview();
      }, 700);
      return () => window.clearTimeout(timeout);
    }
    return;
  }, [previewState, storyboards]);

  if (viewMode === 'compare') {
    return <CompareView storyboards={storyboards} selectedIds={selectedIds} onToggleFrame={onToggleFrame} />;
  }

  return (
    <div className="px-8 py-8 space-y-12">
      {storyboards.map((storyboard, sbIdx) => {
        const selectedCount = storyboard.frames.filter((f) => selectedIds.has(f.id)).length;
        const allSelected = selectedCount === storyboard.frames.length;
        const isPreviewing = previewState?.storyboardId === storyboard.id;

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
                <div
                  className={`w-12 h-12 bg-gradient-to-br ${storyboard.color} rounded-xl flex items-center justify-center relative`}
                >
                  <Film className="w-6 h-6 text-white relative z-10" />
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${storyboard.color} rounded-xl blur-lg opacity-50`}
                  />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                    {storyboard.name}
                  </h2>
                  <p className="text-slate-400 text-sm">{storyboard.theme}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePreviewToggle(storyboard.id)}
                  className="relative group/btn"
                >
                  <div
                    className={`absolute -inset-1 bg-gradient-to-r ${storyboard.color} rounded-xl blur ${
                      isPreviewing ? 'opacity-75' : 'opacity-0 group-hover/btn:opacity-50'
                    } transition-opacity`}
                  />
                  <div
                    className={`relative px-6 py-3 ${
                      isPreviewing
                        ? `bg-gradient-to-r ${storyboard.color} text-white`
                        : 'bg-slate-900 border border-slate-700 text-slate-200 hover:text-white'
                    } rounded-xl font-medium flex items-center gap-2`}
                  >
                    {isPreviewing ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {isPreviewing ? 'Stop Preview' : 'Preview Strip'}
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onToggleAll(storyboard, !allSelected)}
                  className={`relative group/btn ${
                    allSelected ? 'opacity-100' : 'opacity-60 hover:opacity-100'
                  } transition-opacity`}
                >
                  <div
                    className={`absolute -inset-1 bg-gradient-to-r ${storyboard.color} rounded-xl blur ${
                      allSelected ? 'opacity-75' : 'opacity-0 group-hover/btn:opacity-50'
                    } transition-opacity`}
                  />
                  <div
                    className={`relative px-6 py-3 ${
                      allSelected ? `bg-gradient-to-r ${storyboard.color}` : 'bg-slate-900 border border-slate-700'
                    } rounded-xl font-medium flex items-center gap-2`}
                  >
                    {allSelected ? (
                      <>
                        <Check className="w-4 h-4" />
                        Unselect All
                      </>
                    ) : (
                      <>Select All ({storyboard.frames.length})</>
                    )}
                  </div>
                </motion.button>
              </div>
            </div>

            {/* Frames Grid */}
            <div className="grid grid-cols-6 gap-4">
              {storyboard.frames.map((frame, frameIdx) => {
                const isSelected = selectedIds.has(frame.id);

                return (
                  <FrameTile
                    key={frame.id}
                    frame={frame}
                    storyboardColor={storyboard.color}
                    isSelected={isSelected}
                    isPreviewing={isPreviewing}
                    isPreviewActive={isPreviewing && previewState?.index === frameIdx}
                    onToggleFrame={onToggleFrame}
                    onPreviewEnded={advancePreview}
                    delay={reduceMotion ? 0 : sbIdx * 0.1 + frameIdx * 0.05}
                    reduceMotion={reduceMotion}
                  />
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function FrameTile({
  frame,
  storyboardColor,
  isSelected,
  isPreviewing,
  isPreviewActive,
  onToggleFrame,
  onPreviewEnded,
  delay,
  reduceMotion,
}: {
  frame: StoryboardFrame;
  storyboardColor: string;
  isSelected: boolean;
  isPreviewing: boolean;
  isPreviewActive: boolean;
  onToggleFrame: (frame: StoryboardFrame) => void;
  onPreviewEnded: () => void;
  delay: number;
  reduceMotion: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !frame.videoUrl) {
      return;
    }

    if (isPreviewing) {
      if (isPreviewActive) {
        video.currentTime = 0;
        video.play().catch(() => undefined);
      } else {
        video.pause();
        video.currentTime = 0;
      }
      return;
    }

    video.pause();
    video.currentTime = 0;
  }, [frame.videoUrl, isPreviewActive, isPreviewing]);

  const handleHover = (isHovering: boolean) => {
    const video = videoRef.current;
    if (!video || !frame.videoUrl) {
      return;
    }
    if (isPreviewing) {
      return;
    }

    if (isHovering) {
      video.currentTime = 0;
      video.play().catch(() => undefined);
    } else {
      video.pause();
      video.currentTime = 0;
    }
  };

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
      animate={{
        opacity: 1,
        scale: isPreviewActive ? 1.06 : 1,
        y: isPreviewActive ? -6 : 0,
      }}
      transition={
        reduceMotion
          ? { duration: 0.15 }
          : {
              delay,
              opacity: { duration: 0.3 },
              scale: { duration: 0.25 },
              y: { duration: 0.25 },
            }
      }
      className="relative group/frame"
    >
      <button
        onClick={() => onToggleFrame(frame)}
        onMouseEnter={() => handleHover(true)}
        onMouseLeave={() => handleHover(false)}
        className="w-full"
      >
        <div
          className={`absolute -inset-1 bg-gradient-to-r ${storyboardColor} rounded-xl blur transition-opacity ${
            isSelected ? 'opacity-75' : 'opacity-0 group-hover/frame:opacity-30'
          }`}
        />

        <div
          className={`relative rounded-xl overflow-hidden border-2 transition-all ${
            isSelected
              ? 'border-white shadow-2xl scale-105'
              : 'border-slate-800 group-hover/frame:border-slate-600 group-hover/frame:scale-105'
          } ${isPreviewActive ? 'preview-highlight' : ''}`}
        >
          <div className="aspect-video bg-slate-900 relative overflow-hidden">
            {frame.videoUrl ? (
              <video
                ref={videoRef}
                src={frame.videoUrl}
                poster={frame.imageUrl}
                muted
                loop={!isPreviewing}
                playsInline
                preload="metadata"
                onEnded={isPreviewActive ? onPreviewEnded : undefined}
                onError={isPreviewActive ? onPreviewEnded : undefined}
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={frame.imageUrl}
                alt={frame.scene}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-xs font-bold text-white mb-0.5">{frame.emotionalBeat ?? frame.scene}</p>
              <p className="text-xs text-slate-300">{frame.musicIdea ?? frame.cameraMove}</p>
            </div>

            <div className="absolute top-2 left-2">
              <div className="px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-xs font-mono text-white">
                {frame.timestamp}
              </div>
            </div>

            <div className="absolute top-2 right-2">
              <motion.div
                initial={false}
                animate={{ scale: isSelected ? 1 : 0 }}
                className={`w-7 h-7 bg-gradient-to-br ${storyboardColor} rounded-full flex items-center justify-center shadow-lg`}
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
}

function CompareView({
  storyboards,
  selectedIds,
  onToggleFrame,
}: {
  storyboards: Storyboard[];
  selectedIds: Set<string>;
  onToggleFrame: (frame: StoryboardFrame) => void;
}) {
  if (!storyboards.length) {
    return (
      <div className="px-8 py-8">
        <p className="text-slate-400">No storyboards available for compare view yet.</p>
      </div>
    );
  }

  const columnCount = Math.max(storyboards.length, 1);
  const compareGridStyle = {
    gridTemplateColumns: `repeat(${columnCount}, minmax(240px, 1fr))`,
  };

  return (
    <div className="px-8 py-8">
      <div className="mb-6">
        <h3 className="app-section-title app-title-gradient mb-2">Parallel Reel Compare</h3>
        <p className="text-slate-400">Each storyboard is a vertical reel. Compare scenes top-to-bottom across columns.</p>
      </div>
      <div className="overflow-x-auto pb-6">
        <div className="min-w-[1220px] grid gap-6 items-start" style={compareGridStyle}>
          {storyboards.map((storyboard, storyboardIdx) => {
            const holeCount = Math.max(storyboard.frames.length + 2, 10);
            return (
              <motion.div
                key={storyboard.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: storyboardIdx * 0.08 }}
                className="relative"
              >
                <div className={`absolute -inset-1 bg-gradient-to-b ${storyboard.color} rounded-[30px] blur-xl opacity-40`} />
                <div className="relative rounded-[30px] border border-cyan-500/35 bg-slate-950/90 px-6 py-5 shadow-[0_0_30px_rgba(6,182,212,0.12)]">
                  <div className="pointer-events-none absolute left-2 top-4 bottom-4 w-2 flex flex-col justify-between">
                    {Array.from({ length: holeCount }, (_, holeIdx) => (
                      <span
                        key={`left-hole-${storyboard.id}-${holeIdx}`}
                        className="h-2 w-2 rounded-[2px] bg-slate-100/75 shadow-[0_0_0_1px_rgba(15,23,42,0.9)]"
                      />
                    ))}
                  </div>
                  <div className="pointer-events-none absolute right-2 top-4 bottom-4 w-2 flex flex-col justify-between">
                    {Array.from({ length: holeCount }, (_, holeIdx) => (
                      <span
                        key={`right-hole-${storyboard.id}-${holeIdx}`}
                        className="h-2 w-2 rounded-[2px] bg-slate-100/75 shadow-[0_0_0_1px_rgba(15,23,42,0.9)]"
                      />
                    ))}
                  </div>

                  <div className="sticky top-24 z-20 mb-6 rounded-xl border border-cyan-400/30 bg-slate-900/95 px-3 py-2 text-center backdrop-blur">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-200">Storyboard</p>
                    <p className="text-sm font-bold text-white truncate">{storyboard.name}</p>
                    <p className="text-xs text-slate-400 truncate">{storyboard.theme}</p>
                  </div>

                  <div className="space-y-6">
                    {storyboard.frames.map((frame, sceneIdx) => {
                      const isSelected = selectedIds.has(frame.id);

                      return (
                        <motion.button
                          key={frame.id}
                          onClick={() => onToggleFrame(frame)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.985 }}
                          className="block w-full text-left relative group"
                        >
                          <div
                            className={`absolute -inset-1 bg-gradient-to-r ${storyboard.color} rounded-2xl blur-lg transition-opacity ${
                              isSelected ? 'opacity-75' : 'opacity-0 group-hover:opacity-45'
                            }`}
                          />
                          <div
                            className={`relative rounded-2xl overflow-hidden border-2 transition-all ${
                              isSelected ? 'border-white' : 'border-slate-700 group-hover:border-cyan-400/60'
                            }`}
                          >
                            <div className="aspect-video bg-slate-900 relative">
                              <img
                                src={frame.imageUrl}
                                alt={frame.scene}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

                              <div className="absolute top-2 left-2">
                                <div className="px-2 py-0.5 bg-black/70 rounded text-[11px] font-mono text-white">
                                  #{sceneIdx + 1}
                                </div>
                              </div>
                              <div className="absolute top-2 right-2">
                                <div className="px-2 py-0.5 bg-black/70 rounded text-[11px] font-mono text-slate-200">
                                  {frame.timestamp}
                                </div>
                              </div>

                              <div className="absolute bottom-0 left-0 right-0 p-3">
                                <p className="text-xs font-semibold text-white line-clamp-1">
                                  {frame.emotionalBeat ?? frame.scene}
                                </p>
                                <p className="text-[11px] text-slate-300 line-clamp-1">
                                  {frame.musicIdea ?? frame.cameraMove}
                                </p>
                              </div>

                              {isSelected && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute bottom-2 right-2">
                                  <div
                                    className={`w-8 h-8 bg-gradient-to-br ${storyboard.color} rounded-full flex items-center justify-center shadow-2xl`}
                                  >
                                    <Check className="w-4 h-4 text-white" />
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
