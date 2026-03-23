'use client';

import { auth } from '@/firebase/client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyEmailPage() {
  const [checking, setChecking] = useState(false);
  const router = useRouter();

  const checkVerification = async () => {
    setChecking(true);

    await auth.currentUser?.reload();

    if (auth.currentUser?.emailVerified) {
      router.push('/account/dashboard?signup=true');
    } else {
      setChecking(false);
      alert('Email not verified yet.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Verify your email
        </h1>

        <p className="text-gray-600 mb-6">
          Check your inbox and click the verification link to continue.
        </p>

        <button
          onClick={checkVerification}
          disabled={checking}
          className="w-full mb-3 px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-300 transition disabled:opacity-50"
        >
          {checking ? 'Checking...' : 'I’ve verified'}
        </button>

        <button
          onClick={() => router.back()}
          className="w-full px-5 py-2 rounded-lg bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 transition"
        >
          Back to signup
        </button>
      </div>
    </div>
  );
}