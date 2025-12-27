'use client';

import React from 'react';
import Spinner from './Spinner';

export default function LoadingPage({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen min-w-screen bg-white">
      <Spinner />
      <p className="text-lg pt-2 font-medium text-black">{text}</p>
    </div>
  );
}
