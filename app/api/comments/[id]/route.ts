import { NextResponse } from 'next/server';
import { FigmaStore } from '@/lib/figmaStore';
import { getSessionUser } from '@/lib/auth';

async function handleCommentUpdate(req: Request, id: string) {
  try {
    await FigmaStore.ensureHydrated();
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const comment = FigmaStore.getCommentById(id);

    if (!comment) {
      return NextResponse.json({ success: false, error: 'Comment not found.' }, { status: 404 });
    }

    if (comment.authorId !== session.id) {
      return NextResponse.json({ success: false, error: 'Only the comment author can edit this comment.' }, { status: 403 });
    }

    const { content } = await req.json();
    if (!content || !content.trim()) {
      return NextResponse.json({ success: false, error: 'Comment content cannot be empty.' }, { status: 400 });
    }

    const updated = await FigmaStore.updateComment(id, session.id, content.trim());
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleCommentUpdate(req, id);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleCommentUpdate(req, id);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await FigmaStore.ensureHydrated();
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const { id } = await params;
    const comment = FigmaStore.getCommentById(id);
    if (!comment) {
      return NextResponse.json({ success: false, error: 'Comment not found.' }, { status: 404 });
    }

    const post = FigmaStore.getPostById(comment.postId);
    const community = post ? FigmaStore.getCommunityById(post.communityId) : null;
    const membership = community ? FigmaStore.getMembership(community.id, session.id) : null;

    const isAuthor = comment.authorId === session.id;
    const isOwner = community && community.ownerId === session.id;
    const isMod = membership && (membership.role === 'MODERATOR' || membership.role === 'OWNER');

    if (!isAuthor && !isOwner && !isMod) {
      return NextResponse.json({ success: false, error: 'Not authorized to delete this comment.' }, { status: 403 });
    }

    await FigmaStore.deleteComment(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
