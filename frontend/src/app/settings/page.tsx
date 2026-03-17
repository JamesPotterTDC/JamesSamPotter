'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Nav from '@/components/Nav';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const VISIBILITY_LABELS: Record<string, { label: string; description: string }> = {
  private: { label: 'Private', description: 'Only you can see your dashboard.' },
  friends: { label: 'Friends', description: 'Friends you approve can view your dashboard.' },
  public: { label: 'Public', description: 'Anyone with the link can see your dashboard.' },
};

export default function SettingsPage() {
  const { isAuthenticated, isLoading, user, fetchWithAuth, refreshUser, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isWelcome = searchParams.get('welcome') === 'true';

  const [username, setUsername] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'friends' | 'public'>('private');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setVisibility(user.visibility);
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const res = await fetchWithAuth(`${API_URL}/profile/`, {
        method: 'PATCH',
        body: JSON.stringify({ username, visibility }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.username?.[0] || data.visibility?.[0] || data.detail || 'Failed to save.';
        setSaveError(msg);
      } else {
        await refreshUser();
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void">
      <Nav />
      <div className="max-w-2xl mx-auto px-6 pt-28 pb-20">

        {isWelcome && (
          <div className="mb-8 p-4 rounded-xl border border-orange-500/20 bg-orange-500/5">
            <p className="text-orange-400 text-sm font-medium mb-1">Welcome aboard!</p>
            <p className="text-slate-400 text-sm">
              Your account is set up. You can customise your username and choose who can see your dashboard below.
            </p>
          </div>
        )}

        <div className="flex items-center gap-4 mb-10">
          {user.avatar_url && (
            <img src={user.avatar_url} alt="" className="w-14 h-14 rounded-full" />
          )}
          <div>
            <h1 className="font-display font-semibold text-white text-xl">{user.display_name}</h1>
            <p className="text-slate-500 text-sm">@{user.username}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-8">

          {/* Username */}
          <div>
            <label className="block text-xs text-slate-500 tracking-widest uppercase mb-3">
              Username
            </label>
            <div className="flex items-center gap-2">
              <span className="text-slate-600 text-sm">/u/</span>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase())}
                pattern="[a-z0-9][a-z0-9_\-]{1,48}[a-z0-9]"
                minLength={3}
                maxLength={50}
                required
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
              />
            </div>
            <p className="text-slate-600 text-xs mt-1.5">
              3–50 characters, lowercase letters, numbers, hyphens and underscores only.
            </p>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-xs text-slate-500 tracking-widest uppercase mb-3">
              Dashboard Visibility
            </label>
            <div className="space-y-2">
              {(['private', 'friends', 'public'] as const).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    visibility === v
                      ? 'border-orange-500/40 bg-orange-500/5'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{VISIBILITY_LABELS[v].label}</span>
                    {visibility === v && (
                      <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{VISIBILITY_LABELS[v].description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Public link preview */}
          {visibility !== 'private' && (
            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <p className="text-xs text-slate-500 mb-1.5 tracking-wide">Your shareable link</p>
              <p className="text-slate-300 text-sm font-mono">
                {typeof window !== 'undefined' ? window.location.origin : ''}/u/{username}
              </p>
            </div>
          )}

          {saveError && (
            <p className="text-red-400 text-sm">{saveError}</p>
          )}

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            {saveSuccess && (
              <p className="text-green-400 text-sm">Saved!</p>
            )}
          </div>
        </form>

        <div className="mt-16 pt-8 border-t border-white/[0.05]">
          <h2 className="text-xs text-slate-500 tracking-widest uppercase mb-4">Account</h2>
          <div className="flex items-center justify-between p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <div>
              <p className="text-sm text-white">Sign out</p>
              <p className="text-xs text-slate-500 mt-0.5">You'll need to reconnect Strava to sign back in.</p>
            </div>
            <button
              onClick={() => { logout(); router.push('/'); }}
              className="px-4 py-2 text-xs text-red-400 hover:text-red-300 border border-red-400/20 hover:border-red-400/40 rounded-lg transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
