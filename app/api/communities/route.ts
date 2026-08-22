import { NextResponse } from 'next/server';
import { FigmaStore } from '@/lib/figmaStore';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    await FigmaStore.ensureHydrated();
    const communities = FigmaStore.getCommunities();
    const result = communities.map((c) => {
      const posts = FigmaStore.getPostsByCommunity(c.id);
      const members = FigmaStore.getCommunityMemberships(c.id);
      const owner = FigmaStore.getUserById(c.ownerId);

      let totalComments = 0;
      let lastActivity = c.createdAt;

      for (const p of posts) {
        if (p.createdAt > lastActivity) lastActivity = p.createdAt;
        const cmts = FigmaStore.getCommentsByPost(p.id);
        totalComments += cmts.length;
        for (const cmt of cmts) {
          if (cmt.createdAt > lastActivity) lastActivity = cmt.createdAt;
        }
      }

      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        owner: owner ? { id: owner.id, username: owner.username } : null,
        topicCount: posts.length,
        postCount: posts.length + totalComments,
        memberCount: members.length,
        lastActivity,
        createdAt: c.createdAt,
      };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await FigmaStore.ensureHydrated();
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const { name, description } = await req.json();
    if (!name || name.trim().length < 3) {
      return NextResponse.json({ success: false, error: 'Community name must be at least 3 characters.' }, { status: 400 });
    }

    const newCommunity = await FigmaStore.createCommunity(name.trim(), description || '', session.id);

    return NextResponse.json({ success: true, data: newCommunity });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
