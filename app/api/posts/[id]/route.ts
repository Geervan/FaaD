import { NextResponse } from 'next/server';
import { FigmaStore } from '@/lib/figmaStore';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await FigmaStore.ensureHydrated();
    const { id } = await params;
    const post = FigmaStore.getPostById(id);

    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found.' }, { status: 404 });
    }

    const session = await getSessionUser();
    const author = FigmaStore.getUserById(post.authorId);
    const community = FigmaStore.getCommunityById(post.communityId);
    const rawComments = FigmaStore.getCommentsByPost(post.id);
    const voteTally = FigmaStore.getVoteTally(post.id);
    const userVote = session ? FigmaStore.getUserVote(post.id, session.id) : 0;

    let userRole = 'GUEST';
    if (session && community) {
      const mem = FigmaStore.getMembership(community.id, session.id);
      if (mem) userRole = mem.role;
      if (community.ownerId === session.id) userRole = 'OWNER';
    }

    const enrichedComments = rawComments.map((cmt) => {
      const cmtAuthor = FigmaStore.getUserById(cmt.authorId);
      const cmtMem = community ? FigmaStore.getMembership(community.id, cmt.authorId) : null;
      const cmtVoteTally = FigmaStore.getVoteTally(cmt.id);
      const cmtUserVote = session ? FigmaStore.getUserVote(cmt.id, session.id) : 0;

      let cmtRole = cmtMem ? cmtMem.role : 'MEMBER';
      if (community && community.ownerId === cmt.authorId) cmtRole = 'OWNER';

      return {
        id: cmt.id,
        content: cmt.content,
        parentCommentId: cmt.parentCommentId,
        createdAt: cmt.createdAt,
        author: cmtAuthor
          ? {
              id: cmtAuthor.id,
              username: cmtAuthor.username,
              avatarUrl: cmtAuthor.avatarUrl,
              bio: cmtAuthor.bio,
              role: cmtRole,
            }
          : { id: cmt.authorId, username: 'Unknown', role: 'MEMBER' },
        voteScore: cmtVoteTally.score,
        userVote: cmtUserVote,
      };
    });

    const authorMembership = community ? FigmaStore.getMembership(community.id, post.authorId) : null;
    let authorRole = authorMembership ? authorMembership.role : 'MEMBER';
    if (community && community.ownerId === post.authorId) authorRole = 'OWNER';

    return NextResponse.json({
      success: true,
      data: {
        id: post.id,
        title: post.title,
        content: post.content,
        type: post.type,
        imageUrl: post.imageUrl || null,
        createdAt: post.createdAt,
        author: author
          ? {
              id: author.id,
              username: author.username,
              avatarUrl: author.avatarUrl,
              bio: author.bio,
              createdAt: author.createdAt,
              role: authorRole,
            }
          : { id: post.authorId, username: 'Unknown', role: 'MEMBER' },
        community: community ? { id: community.id, slug: community.slug, name: community.name, ownerId: community.ownerId } : null,
        comments: enrichedComments,
        voteScore: voteTally.score,
        userVote,
        currentUserRole: userRole,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

async function handlePostUpdate(req: Request, id: string) {
  try {
    await FigmaStore.ensureHydrated();
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const post = FigmaStore.getPostById(id);

    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found.' }, { status: 404 });
    }

    if (post.authorId !== session.id) {
      return NextResponse.json({ success: false, error: 'Only the author can edit this post.' }, { status: 403 });
    }

    const { title, content, type, imageUrl } = await req.json();
    const updated = await FigmaStore.updatePost(id, session.id, { title, content, type, imageUrl });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handlePostUpdate(req, id);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handlePostUpdate(req, id);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await FigmaStore.ensureHydrated();
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const { id } = await params;
    const post = FigmaStore.getPostById(id);
    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found.' }, { status: 404 });
    }

    const community = FigmaStore.getCommunityById(post.communityId);
    const membership = community ? FigmaStore.getMembership(community.id, session.id) : null;

    const isAuthor = post.authorId === session.id;
    const isOwner = community && community.ownerId === session.id;
    const isMod = membership && (membership.role === 'MODERATOR' || membership.role === 'OWNER');

    if (!isAuthor && !isOwner && !isMod) {
      return NextResponse.json({ success: false, error: 'Not authorized to delete this post.' }, { status: 403 });
    }

    await FigmaStore.deletePost(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
