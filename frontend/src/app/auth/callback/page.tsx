'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success) {
      setTimeout(() => {
        router.push('/?connected=true');
      }, 2000);
    } else if (error) {
      setTimeout(() => {
        router.push(`/?error=${error}`);
      }, 2000);
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900">Connecting to Strava...</h2>
        <p className="text-gray-600 mt-2">Please wait while we sync your activities.</p>
      </div>
    </div>
  );
}
