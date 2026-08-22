import { NextResponse } from 'next/server';
import { FigmaStore } from '@/lib/figmaStore';
import { getSessionUser } from '@/lib/auth';

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
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

    if (community.ownerId !== session.id) {
      return NextResponse.json({ success: false, error: 'Only the community owner can edit this community.' }, { status: 403 });
    }

    const { name, description } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Community name is required.' }, { status: 400 });
    }

    const updated = await FigmaStore.updateCommunity(community.id, name.trim(), (description || '').trim());
    return NextResponse.json({ success: true, community: updated });
  } catch (err: any) {
    console.error('Community update error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error.' }, { status: 500 });
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

    if (community.ownerId !== session.id) {
      return NextResponse.json({ success: false, error: 'Only the community owner can delete this community.' }, { status: 403 });
    }

    await FigmaStore.deleteCommunity(community.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Community deletion error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error.' }, { status: 500 });
  }
}
