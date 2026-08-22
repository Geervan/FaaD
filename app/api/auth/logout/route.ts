import { NextResponse } from 'next/server';
import { getSessionUser, TOKEN_COOKIE_NAME } from '@/lib/auth';
import { FigmaStore } from '@/lib/figmaStore';

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set({
    name: TOKEN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  return res;
}
