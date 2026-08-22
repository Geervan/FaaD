import { NextResponse } from 'next/server';
import { FigmaStore } from '@/lib/figmaStore';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  try {
    await FigmaStore.ensureHydrated();
    const { username } = await params;
    const user = FigmaStore.getUserByUsername(username);

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    const posts = FigmaStore.getPostsByUser(user.id);
    const comments = FigmaStore.getCommentsByUser(user.id);
    const memberships = FigmaStore.getUserMemberships(user.id);

    const joinedCommunities = memberships.map((m) => {
      const com = FigmaStore.getCommunityById(m.communityId);
      return {
        id: m.communityId,
        slug: com ? com.slug : 'unknown',
        name: com ? com.name : 'Unknown Community',
        role: m.role,
        joinedAt: m.joinedAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        stats: {
          postCount: posts.length,
          commentCount: comments.length,
          communityCount: joinedCommunities.length,
        },
        posts: posts.map((p) => {
          const com = FigmaStore.getCommunityById(p.communityId);
          return {
            id: p.id,
            title: p.title,
            type: p.type,
            createdAt: p.createdAt,
            community: com ? { slug: com.slug, name: com.name } : null,
          };
        }),
        joinedCommunities,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ username: string }> }) {
  try {
    await FigmaStore.ensureHydrated();
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const { username } = await params;
    const user = FigmaStore.getUserByUsername(username);

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    if (user.id !== session.id) {
      return NextResponse.json({ success: false, error: 'Cannot edit another user profile.' }, { status: 403 });
    }

    const { bio, avatarUrl } = await req.json();
    const updated = await FigmaStore.updateUserBio(user.id, bio || '', avatarUrl || undefined);

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
