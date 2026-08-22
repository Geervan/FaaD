import { NextResponse } from 'next/server';
import { FigmaStore } from '@/lib/figmaStore';
import { hashPassword, signToken, TOKEN_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await FigmaStore.ensureHydrated();
    const { username, password, avatarUrl } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username and password are required.' }, { status: 400 });
    }

    const cleanUsername = username.trim();
    if (cleanUsername.length < 3 || cleanUsername.length > 20) {
      return NextResponse.json({ success: false, error: 'Username must be between 3 and 20 characters.' }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      return NextResponse.json({ success: false, error: 'Username can only contain letters, numbers, and underscores.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const existingUser = FigmaStore.getUserByUsername(cleanUsername);
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'Username is already taken.' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const finalAvatarUrl = avatarUrl && avatarUrl.trim() ? avatarUrl.trim() : `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(cleanUsername)}`;

    const newUser = await FigmaStore.createUser({
      username: cleanUsername,
      passwordHash,
      bio: 'Member of the community.',
      avatarUrl: finalAvatarUrl,
    });

    const token = signToken({ id: newUser.id, username: newUser.username });

    const res = NextResponse.json({
      success: true,
      data: {
        id: newUser.id,
        username: newUser.username,
        bio: newUser.bio,
        avatarUrl: newUser.avatarUrl,
      },
    });

    res.cookies.set({
      name: TOKEN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
