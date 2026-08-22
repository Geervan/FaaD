import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { FigmaStore } from '@/lib/figmaStore';

export async function GET() {
  try {
    await FigmaStore.ensureHydrated();
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: true, data: null });
    }

    const user = FigmaStore.getUserById(session.id);
    if (!user) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
