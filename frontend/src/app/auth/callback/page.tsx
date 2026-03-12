'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const success = searchParams.get('success');

    if (success) {
      // Already processed by backend, redirect to dashboard
      window.location.href = '/?connected=true';
      return;
    }

    if (error) {
      // OAuth error from backend
      window.location.href = `/?error=${error}`;
      return;
    }

    if (code) {
      // Got authorization code from Strava, send to backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      window.location.href = `${apiUrl}/strava/oauth/callback/?code=${code}&scope=${searchParams.get('scope') || ''}`;
      return;
    }

    // No code, no success, no error - something went wrong
    window.location.href = '/?error=no_code';
  }, [searchParams]);

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
