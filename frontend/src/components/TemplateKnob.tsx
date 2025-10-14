'use client';

import { Template } from '@/types/template';
import React, { useRef, useState } from 'react';

interface TemplateKnobProps {
  templates: Template[];
  index: number;
  paginate: (newDirection: number) => void;
}

export default function TemplateKnob({
  templates,
  index,
  paginate,
}: TemplateKnobProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const startX = useRef<number | null>(null);
  const isDragging = useRef(false);

  const center = Math.floor(templates.length / 2);
  const spacing = 40; // px distance between numbers

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (startX.current === null) return;
    const delta = e.touches[0].clientX - startX.current;
    setDragOffset(delta);
  };

  const handleTouchEnd = () => {
    if (startX.current === null) return;
    isDragging.current = false;
    const movedIndexes = dragOffset / spacing;
    const nearest = Math.round(movedIndexes);
    if (nearest !== 0) paginate(-nearest);
    setDragOffset(0);
    startX.current = null;
  };

  return (
    <div className="flex flex-col items-center gap-4 select-none touch-none">
      <div
        className="relative h-10 w-full flex justify-center items-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {templates.map((_, i) => {
          const offset = i - index;
          const wrappedOffset =
            ((offset + templates.length + center) % templates.length) - center;

          const dragShift = dragOffset / spacing;
          const virtualOffset = wrappedOffset + dragShift;

          // allow continuous looping visual
          const adjustedOffset =
            ((virtualOffset + templates.length * 10) % templates.length) - center;

          const x = adjustedOffset * spacing;
          const scale = Math.max(0.5, 1 - Math.abs(adjustedOffset) * 0.15);
          const opacity = Math.max(0, 1 - Math.abs(adjustedOffset) / center);

          const style: React.CSSProperties = {
            transform: `translateX(${x}px) scale(${scale})`,
            opacity,
            transition: isDragging.current ? 'none' : 'transform 0.2s ease, opacity 0.2s ease',
          };

          return (
            <div
              key={i}
              className="absolute text-xl font-bold text-gray-300"
              style={style}
            >
              {i + 1}
            </div>
          );
        })}
      </div>

      {/* <div className="flex gap-4">
        <button
          onClick={() => paginate(-1)}
          className="bg-white/70 hover:bg-white text-blue-700 rounded-full p-3 shadow-lg"
        >
          ←
        </button>
        <button
          onClick={() => paginate(1)}
          className="bg-white/70 hover:bg-white text-blue-700 rounded-full p-3 shadow-lg"
        >
          →
        </button>
      </div> */}
    </div>
  );
}




// 'use client';

// import { Template } from '@/types/template'

// interface TemplateKnobProps {
//     templates: Template[]; // or a more specific type if templates hold objects
//     index: number;
//     paginate: (newDirection: number) => void;
// }

// export default function TemplateKnob({
//     templates,
//     index,
//     paginate,
// }: TemplateKnobProps) {
//     const radius = 120; // controls depth curve
//     const angleStep = 20; // degrees between items
//     const center = Math.floor(templates.length / 2);

//     return (
//         <div className="flex flex-col items-center gap-4">
//             <div className="relative h-16 w-full flex justify-center items-center [perspective:600px]">
//                 {templates.map((_, i) => {
//                     const offset = i - index;
//                     const wrappedOffset =
//                         ((offset + templates.length + center) % templates.length) - center;

//                     const x = wrappedOffset * 40; // horizontal spacing
//                     const scale = Math.max(0.5, 1 - Math.abs(wrappedOffset) * 0.15);
//                     const opacity = Math.max(0, 1 - Math.abs(wrappedOffset) / center);

//                     const style: React.CSSProperties = {
//                         transform: `translateX(${x}px) scale(${scale})`,
//                         opacity,
//                     };

//                     return (
//                         <div
//                             key={i}
//                             className="absolute text-xl font-bold text-gray-300 transition-all duration-300"
//                             style={style}
//                         >
//                             {i + 1}
//                         </div>
//                     );
//                 })}
//             </div>

//             {/* <div className="flex gap-4">
//                 <button
//                     onClick={() => paginate(-1)}
//                     className="bg-white/70 hover:bg-white text-blue-700 rounded-full p-3 shadow-lg"
//                 >
//                     ←
//                 </button>
//                 <button
//                     onClick={() => paginate(1)}
//                     className="bg-white/70 hover:bg-white text-blue-700 rounded-full p-3 shadow-lg"
//                 >
//                     →
//                 </button>
//             </div> */}
//         </div>
//     );
// }
