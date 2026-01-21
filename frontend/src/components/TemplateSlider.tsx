'use client';

interface TemplateSliderProps {
  length: number;
  index: number;
}

export default function TemplateSlider({ length, index }: TemplateSliderProps) {
  const indicatorWidth = 100 / length;
  const indicatorPosition = indicatorWidth * index;

  return (
    <div className="relative w-full h-2 bg-blue-900 rounded-full mt-4 pointer-events-none">
      <div
        className="absolute h-2 rounded-full"
        style={{
          width: `${indicatorWidth}%`,
          left: `${indicatorPosition}%`,
          backgroundColor: '#0095ff',
          transition: 'left 0.2s ease',
        }}
      />
    </div>
  );
}
