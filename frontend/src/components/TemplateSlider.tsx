'use client';

import { useRef } from 'react';

interface TemplateSliderProps {
  length: number;      // number of templates in filtered array
  index: number;       // current template index
  onSwipe: (direction: number) => void; // called with -1 or 1
  selectedStyle: string;
}

export default function TemplateSlider({ length, index, onSwipe, selectedStyle }: TemplateSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (startX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - startX.current;
    const threshold = 20;
    if (deltaX > threshold) onSwipe(-1);
    else if (deltaX < -threshold) onSwipe(1);
    startX.current = null;
  };

  const indicatorWidth = 100 / length;
  const indicatorPosition = indicatorWidth * index;

  // Conditional color
  const indicatorColor = "#0095ff";
  //const indicatorColor = selectedStyle === "Favourites" ? "#910a00" : "#0095ff"; // dark red vs blue

  return (
    <div
      ref={sliderRef}
      className="relative w-full h-2 bg-blue-900 rounded-full mt-4 touch-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="absolute h-2 rounded-full"
        style={{
          width: `${indicatorWidth}%`,
          left: `${indicatorPosition}%`,
          backgroundColor: indicatorColor,
          transition: 'left 0.2s ease',
        }}
      />
    </div>
  );
}