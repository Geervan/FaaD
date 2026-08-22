import { NextResponse } from 'next/server';
import { FigmaStore } from '@/lib/figmaStore';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await FigmaStore.ensureHydrated();
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const { targetId, direction } = await req.json();

    if (!targetId || (direction !== 1 && direction !== -1 && direction !== 0)) {
      return NextResponse.json({ success: false, error: 'Target ID and valid direction (1, -1, or 0) are required.' }, { status: 400 });
    }

    const result = await FigmaStore.castVote(targetId, session.id, direction);

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
