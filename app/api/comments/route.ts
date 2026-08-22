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

    const { postId, content, parentCommentId } = await req.json();

    if (!postId || !content || !content.trim()) {
      return NextResponse.json({ success: false, error: 'Post ID and content are required.' }, { status: 400 });
    }

    const post = FigmaStore.getPostById(postId);
    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found.' }, { status: 404 });
    }

    const comment = await FigmaStore.createComment(postId, session.id, content.trim(), parentCommentId || null);

    return NextResponse.json({ success: true, data: comment });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
