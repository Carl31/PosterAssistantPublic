'use client';

import { useEffect, useRef, useState } from 'react';

export default function PosterPreview({ posterUrl, onLinkGenerated }: { posterUrl: string; onLinkGenerated?: (link: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!posterUrl) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const mockupFrame = new Image();
    const posterImg = new Image();

    // Enable CORS for images served from Firebase
    mockupFrame.crossOrigin = 'anonymous';
    posterImg.crossOrigin = 'anonymous';

    // Set the canvas dimensions (match your mockup frame resolution)
    canvas.width = 1149;
    canvas.height = 1920;

    mockupFrame.src = '/mockup_frame_light.png';
    posterImg.src = posterUrl;

    mockupFrame.onload = () => {
      ctx.drawImage(mockupFrame, 0, 0, canvas.width, canvas.height);

      posterImg.onload = () => {
        // Adjust these values to match where your poster should appear
        const scale = 1.298;
        const x = 132;
        const y = 342;
        const width = 680 * scale;
        const height = 960 * scale;

        ctx.drawImage(posterImg, x, y, width, height);

        const url = canvas.toDataURL('image/png');
        //setDownloadUrl(url);
        onLinkGenerated!(url);
      };
    };
  }, [posterUrl]);

  return (
    <div className="">
      {/* <p className="font-semibold mb-2">Your poster with mockup preview:</p> */}
      <canvas ref={canvasRef} className="w-full max-w-md" />


      {/* {downloadUrl && (
        <a
          href={downloadUrl}
          download="mockup.png"
          className="mt-2 inline-block text-blue-600 underline"
        >
          Download Mockup as PNG
        </a>
      )} */}
    </div>
  );
}
