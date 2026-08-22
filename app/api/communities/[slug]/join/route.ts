import { NextResponse } from 'next/server';
import { FigmaStore } from '@/lib/figmaStore';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await FigmaStore.ensureHydrated();
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const { slug } = await params;
    const community = FigmaStore.getCommunityBySlug(slug);
    if (!community) {
      return NextResponse.json({ success: false, error: 'Community not found.' }, { status: 404 });
    }

    const membership = await FigmaStore.setMembership(community.id, session.id, 'MEMBER');
    return NextResponse.json({ success: true, data: membership });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await FigmaStore.ensureHydrated();
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const { slug } = await params;
    const community = FigmaStore.getCommunityBySlug(slug);
    if (!community) {
      return NextResponse.json({ success: false, error: 'Community not found.' }, { status: 404 });
    }

    if (community.ownerId === session.id) {
      return NextResponse.json({ success: false, error: 'Community owner cannot leave their community.' }, { status: 400 });
    }

    await FigmaStore.removeMembership(community.id, session.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
