'use client';

import PosterPreview from '@/components/PosterPreview';
import { useSearchParams } from 'next/navigation';

export default function MockupPage() {
  const searchParams = useSearchParams();
  const posterUrl = searchParams.get('url');

  if (!posterUrl) return <p>Missing poster URL</p>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Poster Mockup Preview</h1>
      <PosterPreview posterUrl={posterUrl} />
    </div>
  );
}
