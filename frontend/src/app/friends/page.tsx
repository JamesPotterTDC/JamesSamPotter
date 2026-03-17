'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Nav from '@/components/Nav';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface FriendProfile {
  username: string;
  display_name: string;
  avatar_url: string | null;
  visibility: string;
}

interface FriendRequest {
  id: number;
  from_user: FriendProfile;
  to_user: FriendProfile;
  status: string;
  created_at: string;
}

function Avatar({ src, name }: { src: string | null; name: string }) {
  if (src) return <img src={src} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />;
  return (
    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
      <span className="text-sm text-slate-400 font-medium">{name[0]?.toUpperCase()}</span>
    </div>
  );
}

export default function FriendsPage() {
  const { isAuthenticated, isLoading, user, fetchWithAuth } = useAuth();
  const router = useRouter();

  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [removingFriend, setRemovingFriend] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/');
  }, [isLoading, isAuthenticated, router]);

  const loadData = async () => {
    if (!isAuthenticated) return;
    setDataLoading(true);
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        fetchWithAuth(`${API_URL}/friends/`),
        fetchWithAuth(`${API_URL}/friend-requests/`),
      ]);
      if (friendsRes.ok) setFriends(await friendsRes.json());
      if (requestsRes.ok) setPendingRequests(await requestsRes.json());
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [isAuthenticated]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetchWithAuth(`${API_URL}/users/search/?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) setSearchResults(await res.json());
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const sendRequest = async (targetUsername: string) => {
    setSendingTo(targetUsername);
    try {
      const res = await fetchWithAuth(`${API_URL}/friend-requests/send/`, {
        method: 'POST',
        body: JSON.stringify({ username: targetUsername }),
      });
      if (res.ok) {
        setSentTo(prev => new Set([...prev, targetUsername]));
        await loadData();
      }
    } finally {
      setSendingTo(null);
    }
  };

  const respondToRequest = async (requestId: number, action: 'accept' | 'reject') => {
    await fetchWithAuth(`${API_URL}/friend-requests/${requestId}/respond/`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
    await loadData();
  };

  const removeFriend = async (friendUsername: string) => {
    setRemovingFriend(friendUsername);
    try {
      await fetchWithAuth(`${API_URL}/friends/${friendUsername}/`, { method: 'DELETE' });
      await loadData();
    } finally {
      setRemovingFriend(null);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const friendUsernames = new Set(friends.map(f => f.username));

  return (
    <div className="min-h-screen bg-void">
      <Nav />
      <div className="max-w-2xl mx-auto px-6 pt-28 pb-20 space-y-12">

        {/* Pending requests */}
        {pendingRequests.length > 0 && (
          <section>
            <h2 className="text-xs text-slate-500 tracking-widest uppercase mb-4">
              Pending Requests ({pendingRequests.length})
            </h2>
            <div className="space-y-2">
              {pendingRequests.map(req => (
                <div key={req.id} className="flex items-center gap-4 p-4 card rounded-xl">
                  <Avatar src={req.from_user.avatar_url} name={req.from_user.display_name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{req.from_user.display_name}</p>
                    <p className="text-xs text-slate-500">@{req.from_user.username}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => respondToRequest(req.id, 'accept')}
                      className="px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => respondToRequest(req.id, 'reject')}
                      className="px-3 py-1.5 text-slate-400 hover:text-slate-200 border border-white/[0.08] hover:border-white/20 text-xs rounded-lg transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Find people */}
        <section>
          <h2 className="text-xs text-slate-500 tracking-widest uppercase mb-4">Find People</h2>
          <input
            type="text"
            placeholder="Search by username…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-orange-500/50 transition-colors"
          />

          {searching && (
            <p className="text-slate-500 text-xs mt-3">Searching…</p>
          )}

          {searchResults.length > 0 && (
            <div className="mt-3 space-y-2">
              {searchResults.map(result => {
                const isSelf = result.username === user.username;
                const isFriend = friendUsernames.has(result.username);
                const sent = sentTo.has(result.username);

                return (
                  <div key={result.username} className="flex items-center gap-4 p-4 card rounded-xl">
                    <Avatar src={result.avatar_url} name={result.display_name} />
                    <div className="flex-1 min-w-0">
                      <Link href={`/u/${result.username}`} className="text-sm font-medium text-white hover:text-orange-400 transition-colors truncate block">
                        {result.display_name}
                      </Link>
                      <p className="text-xs text-slate-500">@{result.username}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {isSelf ? (
                        <span className="text-xs text-slate-600">You</span>
                      ) : isFriend ? (
                        <span className="text-xs text-green-400">Friends</span>
                      ) : sent ? (
                        <span className="text-xs text-slate-500">Request sent</span>
                      ) : (
                        <button
                          onClick={() => sendRequest(result.username)}
                          disabled={sendingTo === result.username}
                          className="px-3 py-1.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          {sendingTo === result.username ? '…' : 'Add friend'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
            <p className="text-slate-600 text-xs mt-3">No users found for "{searchQuery}".</p>
          )}
        </section>

        {/* Your friends */}
        <section>
          <h2 className="text-xs text-slate-500 tracking-widest uppercase mb-4">
            Your Friends {friends.length > 0 && `(${friends.length})`}
          </h2>

          {dataLoading ? (
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          ) : friends.length === 0 ? (
            <p className="text-slate-600 text-sm">No friends yet. Search above to find people.</p>
          ) : (
            <div className="space-y-2">
              {friends.map(friend => (
                <div key={friend.username} className="flex items-center gap-4 p-4 card rounded-xl">
                  <Avatar src={friend.avatar_url} name={friend.display_name} />
                  <div className="flex-1 min-w-0">
                    <Link href={`/u/${friend.username}`} className="text-sm font-medium text-white hover:text-orange-400 transition-colors truncate block">
                      {friend.display_name}
                    </Link>
                    <p className="text-xs text-slate-500">@{friend.username}</p>
                  </div>
                  <button
                    onClick={() => removeFriend(friend.username)}
                    disabled={removingFriend === friend.username}
                    className="text-xs text-slate-600 hover:text-red-400 transition-colors flex-shrink-0 disabled:opacity-50"
                  >
                    {removingFriend === friend.username ? '…' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
