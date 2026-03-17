import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('peaklog_refresh')?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  try {
    const res = await fetch(`${API_URL}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!res.ok) {
      const response = NextResponse.json({ error: 'Token refresh failed' }, { status: 401 });
      response.cookies.delete('peaklog_refresh');
      return response;
    }

    const data = await res.json();
    const response = NextResponse.json({ access: data.access });

    // simplejwt ROTATE_REFRESH_TOKENS is on — store the new refresh token
    if (data.refresh) {
      response.cookies.set('peaklog_refresh', data.refresh, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      });
    }

    return response;
  } catch {
    return NextResponse.json({ error: 'Refresh failed' }, { status: 500 });
  }
}
