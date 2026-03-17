'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth, AuthUser } from '@/contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setTokens } = useAuth();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const access = searchParams.get('access');
    const refresh = searchParams.get('refresh');
    const username = searchParams.get('username');
    const isNew = searchParams.get('is_new') === 'true';
    const error = searchParams.get('error');

    if (error) {
      router.replace(`/?error=${error}`);
      return;
    }

    // Legacy path: Strava sent the code directly here (before backend processed it)
    const code = searchParams.get('code');
    if (code && !access) {
      window.location.href = `${API_URL}/strava/oauth/callback/?code=${code}&scope=${searchParams.get('scope') || ''}`;
      return;
    }

    if (!access || !refresh || !username) {
      router.replace('/?error=missing_tokens');
      return;
    }

    // Fetch the full user profile from /api/auth/me/ using the new access token
    fetch(`${API_URL}/auth/me/`, {
      headers: { Authorization: `Bearer ${access}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const user: AuthUser = data
          ? {
              username: data.username,
              display_name: data.display_name,
              avatar_url: data.avatar_url,
              visibility: data.visibility,
              ftp: data.ftp,
              primary_bike_distance_m: data.primary_bike_distance_m,
              data_start_date: data.data_start_date,
            }
          : {
              username,
              display_name: username,
              avatar_url: null,
              visibility: 'private',
            };

        setTokens(access, refresh, user);
        // New users go to settings to customise their profile
        router.replace(isNew ? '/settings?welcome=true' : '/dashboard');
      })
      .catch(() => {
        router.replace('/?error=profile_fetch_failed');
      });
  }, [searchParams, router, setTokens]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-void">
      <div className="text-center">
        <div className="inline-block w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm tracking-wide">Connecting your account…</p>
      </div>
    </div>
  );
}
