import { NextResponse } from 'next/server';
import { FigmaStore } from '@/lib/figmaStore';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await FigmaStore.ensureHydrated();
    const { searchParams } = new URL(req.url);
    const communitySlug = searchParams.get('community');
    const authorUsername = searchParams.get('author');

    let posts = FigmaStore.getPosts();

    if (communitySlug) {
      const community = FigmaStore.getCommunityBySlug(communitySlug);
      if (community) {
        posts = posts.filter((p) => p.communityId === community.id);
      } else {
        posts = [];
      }
    }

    if (authorUsername) {
      const author = FigmaStore.getUserByUsername(authorUsername);
      if (author) {
        posts = posts.filter((p) => p.authorId === author.id);
      } else {
        posts = [];
      }
    }

    const session = await getSessionUser();

    const data = posts.map((post) => {
      const author = FigmaStore.getUserById(post.authorId);
      const community = FigmaStore.getCommunityById(post.communityId);
      const comments = FigmaStore.getCommentsByPost(post.id);
      const voteTally = FigmaStore.getVoteTally(post.id);
      const userVote = session ? FigmaStore.getUserVote(post.id, session.id) : 0;

      return {
        id: post.id,
        title: post.title,
        content: post.content,
        type: post.type,
        imageUrl: post.imageUrl || null,
        createdAt: post.createdAt,
        author: author ? { id: author.id, username: author.username, avatarUrl: author.avatarUrl } : { id: post.authorId, username: 'Unknown' },
        community: community ? { id: community.id, slug: community.slug, name: community.name } : null,
        commentCount: comments.length,
        voteScore: voteTally.score,
        userVote,
      };
    });

    return NextResponse.json({ success: true, data });
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

    const { communitySlug, title, content, type, imageUrl } = await req.json();

    if (!communitySlug || !title || !content) {
      return NextResponse.json({ success: false, error: 'Community, title, and content are required.' }, { status: 400 });
    }

    const community = FigmaStore.getCommunityBySlug(communitySlug);
    if (!community) {
      return NextResponse.json({ success: false, error: 'Target community not found.' }, { status: 404 });
    }

    const postType = type === 'image' ? 'image' : 'text';
    if (postType === 'image' && !imageUrl) {
      return NextResponse.json({ success: false, error: 'An Image URL is required for image posts.' }, { status: 400 });
    }

    const post = await FigmaStore.createPost({
      communityId: community.id,
      authorId: session.id,
      title: title.trim(),
      content: content.trim(),
      type: postType,
      imageUrl: imageUrl ? imageUrl.trim() : undefined,
    });

    return NextResponse.json({ success: true, data: post });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
