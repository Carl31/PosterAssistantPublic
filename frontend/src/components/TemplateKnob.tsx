'use client';

import { Template } from '@/types/template';
import React, { useRef, useState } from 'react';

interface TemplateKnobProps {
  templates: Template[];
  index: number;
  paginate: (newDirection: number) => void;
}

export default function TemplateKnob({ templates, index, paginate }: TemplateKnobProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const startX = useRef<number | null>(null);
  const isDragging = useRef(false);

  const center = Math.floor(templates.length / 2);
  const spacing = 80; // increased spacing for clarity

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
    <div className="flex flex-col items-center gap-6 select-none">
      <div
        className="relative h-14 w-full flex justify-center items-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {templates.map((template, i) => {
          const offset = i - index;
          const wrappedOffset = ((offset + templates.length + center) % templates.length) - center;
          const dragShift = dragOffset / spacing;
          const virtualOffset = wrappedOffset + dragShift;

          // Continuous looping visual
          const adjustedOffset = ((virtualOffset + templates.length * 10) % templates.length) - center;

          const x = adjustedOffset * spacing;
          const scale = Math.max(0.5, 1 - Math.abs(adjustedOffset) * 0.2);
          const opacity = Math.max(0, 1 - Math.abs(adjustedOffset) / center);

          const style: React.CSSProperties = {
            transform: `translateX(${x}px) scale(${scale})`,
            opacity,
            transition: isDragging.current ? 'none' : 'transform 0.2s ease, opacity 0.2s ease',
          };

          return (
            <div
              key={template.id}
              className={`absolute text-lg font-bold ${i === index ? 'text-white' : 'text-gray-300'}`}
              style={style}
            >
              {template.name}
            </div>
          );
        })}
      </div>
    </div>
  );
}
