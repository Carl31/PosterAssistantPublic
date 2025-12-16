// app/error.tsx
'use client';

import { useEffect } from 'react';

export default function ErrorPage({ error }: { error: Error }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4 ml-1">App Error</h1>

      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-3xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm opacity-70">
            The page failed to load.
          </p>
          <p className="mt-2 text-sm opacity-70">
            If you are seeing this page, please let me know!
            <br />
            - Carlos @sickshotsnz
          </p>

          <p className="mt-6 text-xs text-gray-500 break-words">
            {error.message}
          </p>
        </div>
      </main>
    </div>
  );
}
