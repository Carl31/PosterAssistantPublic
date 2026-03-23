'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { applyActionCode } from 'firebase/auth';
import { auth } from '@/firebase/client';

export default function VerifyEmailSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const oobCode = searchParams!.get('oobCode');

  useEffect(() => {
    const verify = async () => {
      if (!oobCode) return;

      try {
        await applyActionCode(auth, oobCode);
        router.push('/account/dashboard');
      } catch (err) {
        router.push('/verify-email');
      }
    };

    verify();
  }, [oobCode, router]);

  return <div>Verifying email...</div>;
}