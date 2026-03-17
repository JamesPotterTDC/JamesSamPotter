import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { refresh } = await request.json();

  if (!refresh) {
    return NextResponse.json({ error: 'Missing refresh token' }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set('velo_refresh', refresh, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
  return response;
}
