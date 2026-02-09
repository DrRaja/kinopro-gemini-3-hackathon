import { StoryboardFrame } from '../App';
import { motion } from 'motion/react';
import { X, GripVertical } from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface SelectedSequenceProps {
  selectedFrames: StoryboardFrame[];
  onReorder: (frames: StoryboardFrame[]) => void;
  onRemove: (frameId: string) => void;
}

export function SelectedSequence({ selectedFrames, onReorder, onRemove }: SelectedSequenceProps) {
  const moveFrame = (fromIndex: number, toIndex: number) => {
    const newFrames = [...selectedFrames];
    const [movedFrame] = newFrames.splice(fromIndex, 1);
    newFrames.splice(toIndex, 0, movedFrame);
    onReorder(newFrames);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <motion.div
        initial={{ y: 200, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 200, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800/50 backdrop-blur-2xl bg-slate-950/90"
      >
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Your Sequence
              </h3>
              <p className="text-sm text-slate-400">
                {selectedFrames.length} frames • Drag to reorder
              </p>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {selectedFrames.map((frame, index) => (
              <DraggableFrame
                key={frame.id}
                frame={frame}
                index={index}
                onMove={moveFrame}
                onRemove={() => onRemove(frame.id)}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </DndProvider>
  );
}

const FRAME_TYPE = 'SEQUENCE_FRAME';

function DraggableFrame({ 
  frame, 
  index, 
  onMove, 
  onRemove 
}: { 
  frame: StoryboardFrame; 
  index: number; 
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
}) {
  const [{ isDragging }, drag, preview] = useDrag({
    type: FRAME_TYPE,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const [{ isOver }, drop] = useDrop({
    accept: FRAME_TYPE,
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        onMove(item.index, index);
        item.index = index;
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

  return (
    <motion.div
      ref={(node) => preview(drop(node))}
      layout
      className={`relative flex-shrink-0 group ${
        isDragging ? 'opacity-50' : ''
      } ${isOver ? 'scale-110' : 'scale-100'} transition-transform`}
    >
      {/* Frame number badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
        <div className="w-6 h-6 bg-gradient-to-br from-violet-600 to-cyan-600 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg">
          {index + 1}
        </div>
      </div>

      {/* Drag handle */}
      <div
        ref={drag}
        className="absolute -top-2 left-2 z-20 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <div className="p-1.5 bg-slate-900 rounded-lg border border-slate-700">
          <GripVertical className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute -top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <div className="w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg">
          <X className="w-3.5 h-3.5 text-white" />
        </div>
      </button>

      {/* Frame card */}
      <div className="relative w-56">
        <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl blur opacity-50" />
        <div className="relative rounded-xl overflow-hidden border-2 border-slate-700 bg-slate-900">
          <div className="aspect-video relative">
            <img
              src={frame.imageUrl}
              alt={frame.scene}
              className="w-full h-full object-cover"
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-xs font-bold text-white truncate">{frame.scene}</p>
              <p className="text-xs text-slate-300 truncate">{frame.storyboardName}</p>
            </div>

            <div className="absolute top-2 left-2">
              <div className="px-2 py-0.5 bg-black/70 backdrop-blur-sm rounded text-xs font-mono text-white">
                {frame.timestamp}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
