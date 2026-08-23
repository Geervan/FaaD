import { NextResponse } from 'next/server';
import { FigmaStore } from '@/lib/figmaStore';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await FigmaStore.ensureHydrated();
    const { slug } = await params;
    const community = FigmaStore.getCommunityBySlug(slug);
    if (!community) {
      return NextResponse.json({ success: false, error: 'Community not found.' }, { status: 404 });
    }

    const memberships = FigmaStore.getCommunityMemberships(community.id);
    const moderators = memberships
      .filter((m) => m.role === 'MODERATOR')
      .map((m) => {
        const u = FigmaStore.getUserById(m.userId);
        return u ? { id: u.id, username: u.username, avatarUrl: u.avatarUrl } : null;
      })
      .filter(Boolean);

    return NextResponse.json({ success: true, data: moderators });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

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

    if (community.ownerId !== session.id) {
      return NextResponse.json({ success: false, error: 'Only the community owner can assign moderators.' }, { status: 403 });
    }

    const { username } = await req.json();
    if (!username) {
      return NextResponse.json({ success: false, error: 'Target username is required.' }, { status: 400 });
    }

    const targetUser = FigmaStore.getUserByUsername(username);
    if (!targetUser) {
      return NextResponse.json({ success: false, error: `User "${username}" not found.` }, { status: 404 });
    }

    if (targetUser.id === community.ownerId) {
      return NextResponse.json({ success: false, error: 'User is already the community owner.' }, { status: 400 });
    }

    const membership = await FigmaStore.setMembership(community.id, targetUser.id, 'MODERATOR');
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

    if (community.ownerId !== session.id) {
      return NextResponse.json({ success: false, error: 'Only the community owner can unassign moderators.' }, { status: 403 });
    }

    const { username } = await req.json();
    const targetUser = FigmaStore.getUserByUsername(username);
    if (!targetUser) {
      return NextResponse.json({ success: false, error: `User "${username}" not found.` }, { status: 404 });
    }

    const membership = await FigmaStore.setMembership(community.id, targetUser.id, 'MEMBER');
    return NextResponse.json({ success: true, data: membership });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
