'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const StravaIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
  </svg>
);

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void flex flex-col items-center justify-center px-6">
      {/* Logo / wordmark */}
      <p className="font-bebas text-3xl tracking-[0.2em] text-white mb-2">VELO</p>
      <p className="text-slate-600 text-xs tracking-widest uppercase mb-12">Cycling Dashboard</p>

      {/* Hero */}
      <h1 className="font-display font-semibold text-2xl sm:text-3xl text-white text-center mb-3 max-w-md">
        Your rides. Your data. Your dashboard.
      </h1>
      <p className="text-slate-500 text-sm text-center mb-10 max-w-sm leading-relaxed">
        Connect your Strava account and get a beautiful, shareable cycling dashboard — completely free.
      </p>

      {/* CTA */}
      <a
        href={`${API_URL}/strava/oauth/start/`}
        className="inline-flex items-center gap-2.5 bg-orange-500 hover:bg-orange-400 text-white font-semibold px-7 py-3.5 rounded-xl transition-colors text-sm"
      >
        <StravaIcon />
        Connect with Strava
      </a>

      {error && (
        <p className="mt-6 text-red-400 text-xs text-center">
          Something went wrong ({error}). Please try again.
        </p>
      )}

      {/* Feature highlights */}
      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl w-full text-center">
        {[
          { title: 'Private by default', body: 'Only you see your data until you choose to share.' },
          { title: 'Share with friends', body: 'Accept friend requests and view each other\'s dashboards.' },
          { title: 'Public profile', body: 'Make your profile public with a shareable link.' },
        ].map(({ title, body }) => (
          <div key={title} className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <p className="text-white text-sm font-medium mb-1.5">{title}</p>
            <p className="text-slate-500 text-xs leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      <footer className="mt-16 text-xs text-slate-700 tracking-widest">
        POWERED BY{' '}
        <a href="https://www.strava.com" target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition-colors">
          STRAVA
        </a>
      </footer>
    </div>
  );
}
