import { FigmaAdapter, FigmaComment } from './figmaAdapter';
import { User, Community, Membership, Post, Comment, VoteBatch, Role } from './types';
import { replaceEmojiShortcodes } from './emoji';

class FigmaStoreEngine {
  private users: Map<string, User> = new Map();
  private communities: Map<string, Community> = new Map();
  private memberships: Map<string, Membership> = new Map();
  private posts: Map<string, Post> = new Map();
  private comments: Map<string, Comment> = new Map();
  private votes: Record<string, Record<string, number>> = {}; // targetId -> userId -> 1 | -1
  private deletedEntityIds: Set<string> = new Set();
  private lastVoteBatchFigmaId: string | null = null;
  private isHydrated: boolean = false;
  private lastHydratedAt: number = 0;
  private cacheTTLMs: number = 5000; // 5 seconds cache TTL for live sync
  private isSyncing: boolean = false;
  private hasSeededInitialData: boolean = false;

  public async ensureHydrated(force = false): Promise<void> {
    const now = Date.now();
    if (!force && this.isHydrated && now - this.lastHydratedAt < this.cacheTTLMs) {
      return;
    }
    await this.hydrateFromFigma(force);
  }

  public async hydrateFromFigma(force = false): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;
    try {
      if (force) {
        FigmaAdapter.clearMemoryCache();
      }
      const figmaComments = await FigmaAdapter.getComments(force);
      if (!figmaComments || !Array.isArray(figmaComments)) {
        console.warn('[FigmaStore] Invalid figmaComments array, retaining existing memory state.');
        return;
      }

      // Parse comments into temporary staging maps first for an atomic swap
      const tempUsers = new Map<string, User>();
      const tempCommunities = new Map<string, Community>();
      const tempMemberships = new Map<string, Membership>();
      const tempPosts = new Map<string, Post>();
      const tempComments = new Map<string, Comment>();
      let tempVotes: Record<string, Record<string, number>> = {};
      let tempVoteBatchId: string | null = null;

      // Process in chronological order (oldest first, newest last) so edit revisions override older states
      const chronologicalComments = [...figmaComments].reverse();

      for (const comment of chronologicalComments) {
        this.parseCommentToStaging(
          comment,
          tempUsers,
          tempCommunities,
          tempMemberships,
          tempPosts,
          tempComments,
          (votes, figmaId) => {
            tempVotes = votes;
            tempVoteBatchId = figmaId;
          }
        );
      }

      // Atomic swap of in-memory store
      this.users = tempUsers;
      this.communities = tempCommunities;
      this.memberships = tempMemberships;
      this.posts = tempPosts;
      this.comments = tempComments;
      if (Object.keys(tempVotes).length > 0) {
        this.votes = tempVotes;
        this.lastVoteBatchFigmaId = tempVoteBatchId;
      }

      this.isHydrated = true;
      this.lastHydratedAt = Date.now();

      // Seed initial demo data ONLY if Figma credentials are NOT configured (local dev fallback)
      if (figmaComments.length === 0 && !this.hasSeededInitialData && !FigmaAdapter.isConfigured()) {
        this.hasSeededInitialData = true;
        await this.seedInitialData();
      }
    } catch (err) {
      console.error('[FigmaStore] Error during hydration, retaining existing memory state:', err);
      this.isHydrated = true;
      this.lastHydratedAt = Date.now();
    } finally {
      this.isSyncing = false;
    }
  }

  private async seedInitialData(): Promise<void> {
    try {
      const admin = await this.createUser({
        username: 'admin',
        passwordHash: '$2b$10$e8p.sL.8n3g.W6a5Y7e8n.x3z1y2w3v4u5t6s7r8q9p0',
        bio: 'Forum administrator & community coordinator.',
        avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=admin',
      });

      const gen = await this.createCommunity('General Discussion', 'Open forum for general conversations and community feedback.', admin.id);
      const des = await this.createCommunity('Design Critique', 'Share your UI/UX design concepts, Figma frames, and visual work.', admin.id);

      const p1 = await this.createPost({
        communityId: gen.id,
        authorId: admin.id,
        title: 'Welcome to the Figma-Backed Community Forum!',
        content: 'This forum uses Figma as its persistent data store via the Figma REST API. Explore communities, start topics, post image links, upvote posts, and participate in discussions!',
        type: 'text',
      });

      const p2 = await this.createPost({
        communityId: des.id,
        authorId: admin.id,
        title: 'Clean 2000s Forum UI Concept',
        content: 'Check out the clean, high-density layout inspired by classic 2000s internet forums (vBulletin & phpBB). Feedback and design discussions are welcome below!',
        type: 'image',
        imageUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1000&q=80',
      });

      await this.createComment(p1.id, admin.id, 'Replies and vote scores are indexed in real time!');
    } catch (e) {
      console.error('[FigmaStore] Error seeding initial data:', e);
    }
  }

  public clearAll(resetDeletedTrackers = true): void {
    this.users.clear();
    this.communities.clear();
    this.memberships.clear();
    this.posts.clear();
    this.comments.clear();
    this.votes = {};
    if (resetDeletedTrackers) {
      this.deletedEntityIds.clear();
    }
    this.lastVoteBatchFigmaId = null;
    this.isHydrated = false;
    this.lastHydratedAt = 0;
  }

  private parseCommentToStaging(
    comment: FigmaComment,
    stagedUsers: Map<string, User>,
    stagedCommunities: Map<string, Community>,
    stagedMemberships: Map<string, Membership>,
    stagedPosts: Map<string, Post>,
    stagedComments: Map<string, Comment>,
    setStagedVotes: (votes: Record<string, Record<string, number>>, figmaId: string) => void
  ): void {
    const msg = comment.message;
    if (!msg || !msg.includes('[DB_ENTITY:')) return;

    try {
      const idx = msg.indexOf('[DB_ENTITY:');
      const entitySection = msg.substring(idx);

      if (entitySection.startsWith('[DB_ENTITY:USER]')) {
        const jsonStr = entitySection.replace('[DB_ENTITY:USER]', '').trim();
        const user: User = JSON.parse(jsonStr);
        if (this.deletedEntityIds.has(user.id)) return;
        const existing = stagedUsers.get(user.id);
        const commentTime = new Date(comment.created_at).getTime();
        const existingTime = (existing as any)?._commentCreatedAt || 0;
        if (!existing || commentTime >= existingTime) {
          (user as any)._commentCreatedAt = commentTime;
          user.figmaCommentId = comment.id;
          stagedUsers.set(user.id, user);
        }
      } else if (entitySection.startsWith('[DB_ENTITY:COMMUNITY]')) {
        const jsonStr = entitySection.replace('[DB_ENTITY:COMMUNITY]', '').trim();
        const community: Community = JSON.parse(jsonStr);
        if (this.deletedEntityIds.has(community.id)) return;
        const existing = stagedCommunities.get(community.id);
        const commentTime = new Date(comment.created_at).getTime();
        const existingTime = (existing as any)?._commentCreatedAt || 0;
        if (!existing || commentTime >= existingTime) {
          (community as any)._commentCreatedAt = commentTime;
          community.figmaCommentId = comment.id;
          stagedCommunities.set(community.id, community);
        }
      } else if (entitySection.startsWith('[DB_ENTITY:MEMBERSHIP]')) {
        const jsonStr = entitySection.replace('[DB_ENTITY:MEMBERSHIP]', '').trim();
        const membership: Membership = JSON.parse(jsonStr);
        if (this.deletedEntityIds.has(membership.id)) return;
        const existing = stagedMemberships.get(membership.id);
        const commentTime = new Date(comment.created_at).getTime();
        const existingTime = (existing as any)?._commentCreatedAt || 0;
        if (!existing || commentTime >= existingTime) {
          (membership as any)._commentCreatedAt = commentTime;
          membership.figmaCommentId = comment.id;
          stagedMemberships.set(membership.id, membership);
        }
      } else if (entitySection.startsWith('[DB_ENTITY:POST]')) {
        const jsonStr = entitySection.replace('[DB_ENTITY:POST]', '').trim();
        const post: Post = JSON.parse(jsonStr);
        if (this.deletedEntityIds.has(post.id)) return;
        const existing = stagedPosts.get(post.id);
        const commentTime = new Date(comment.created_at).getTime();
        const existingTime = (existing as any)?._commentCreatedAt || 0;
        if (!existing || commentTime >= existingTime) {
          (post as any)._commentCreatedAt = commentTime;
          post.figmaCommentId = comment.id;
          stagedPosts.set(post.id, post);
        }
      } else if (entitySection.startsWith('[DB_ENTITY:COMMENT]')) {
        const jsonStr = entitySection.replace('[DB_ENTITY:COMMENT]', '').trim();
        const cmt: Comment = JSON.parse(jsonStr);
        if (this.deletedEntityIds.has(cmt.id)) return;
        const existing = stagedComments.get(cmt.id);
        const commentTime = new Date(comment.created_at).getTime();
        const existingTime = (existing as any)?._commentCreatedAt || 0;
        if (!existing || commentTime >= existingTime) {
          (cmt as any)._commentCreatedAt = commentTime;
          cmt.figmaCommentId = comment.id;
          stagedComments.set(cmt.id, cmt);
        }
      } else if (entitySection.startsWith('[DB_ENTITY:VOTE_BATCH]')) {
        const jsonStr = entitySection.replace('[DB_ENTITY:VOTE_BATCH]', '').trim();
        const batch: VoteBatch = JSON.parse(jsonStr);
        setStagedVotes(batch.votes || {}, comment.id);
      }
    } catch (err) {
      console.error('[FigmaStore] Failed to parse comment entity:', comment.id, err);
    }
  }

  // --- USER ENTITY METHODS ---
  public getUsers(): User[] {
    return Array.from(this.users.values());
  }

  public getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  public getUserByUsername(username: string): User | undefined {
    const lower = username.toLowerCase();
    return this.getUsers().find((u) => u.username.toLowerCase() === lower);
  }

  public async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const user: User = {
      ...userData,
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now(),
    };
    this.users.set(user.id, user);

    const index = this.users.size - 1;
    const header = `USER: @${user.username}`;
    const payload = `${header}\n[DB_ENTITY:USER]\n${JSON.stringify(user)}`;

    try {
      const clientMeta = await FigmaAdapter.calculateCommentCoordinates('USERS', index);
      const figmaId = await FigmaAdapter.postComment(payload, undefined, clientMeta);
      user.figmaCommentId = figmaId;
    } catch (e) {
      console.warn('[FigmaStore] User persistence warning:', e);
    }

    return user;
  }

  public async updateUserBio(userId: string, bio: string, avatarUrl?: string): Promise<User | null> {
    const user = this.users.get(userId);
    if (!user) return null;

    const oldFigmaId = user.figmaCommentId;

    user.bio = bio;
    if (avatarUrl) user.avatarUrl = avatarUrl;

    const index = Array.from(this.users.keys()).indexOf(userId);
    const header = `USER: @${user.username} (Updated Profile)`;
    const payload = `${header}\n[DB_ENTITY:USER]\n${JSON.stringify(user)}`;

    try {
      const clientMeta = await FigmaAdapter.calculateCommentCoordinates('USERS', index >= 0 ? index : 0);
      const newFigmaId = await FigmaAdapter.postComment(payload, undefined, clientMeta);
      user.figmaCommentId = newFigmaId;
      if (oldFigmaId && oldFigmaId !== newFigmaId) {
        try {
          await FigmaAdapter.deleteComment(oldFigmaId);
        } catch (e) {}
      }
    } catch (e) {
      console.warn('[FigmaStore] Bio update warning:', e);
    }

    return user;
  }

  // --- COMMUNITY ENTITY METHODS ---
  public getCommunities(): Community[] {
    return Array.from(this.communities.values());
  }

  public getCommunityBySlug(slug: string): Community | undefined {
    const lower = slug.toLowerCase();
    return this.getCommunities().find((c) => c.slug.toLowerCase() === lower);
  }

  public getCommunityById(id: string): Community | undefined {
    return this.communities.get(id);
  }

  public async createCommunity(name: string, description: string, ownerId: string): Promise<Community> {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const existing = this.getCommunityBySlug(slug);
    if (existing) {
      throw new Error(`A community with slug "${slug}" already exists.`);
    }

    const community: Community = {
      id: `com_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      slug,
      name,
      description,
      ownerId,
      createdAt: Date.now(),
    };
    this.communities.set(community.id, community);

    // Auto-create OWNER membership
    await this.setMembership(community.id, ownerId, 'OWNER');

    const index = this.communities.size - 1;
    const header = `COMMUNITY: /c/${community.slug} (${community.name})`;
    const payload = `${header}\n[DB_ENTITY:COMMUNITY]\n${JSON.stringify(community)}`;

    try {
      const clientMeta = await FigmaAdapter.calculateCommentCoordinates('COMMUNITIES', index);
      const figmaId = await FigmaAdapter.postComment(payload, undefined, clientMeta);
      community.figmaCommentId = figmaId;
    } catch (e) {
      console.warn('[FigmaStore] Community creation warning:', e);
    }

    return community;
  }

  public async updateCommunity(communityId: string, name: string, description: string): Promise<Community | null> {
    const community = this.communities.get(communityId);
    if (!community) return null;

    const oldFigmaId = community.figmaCommentId;

    community.name = name;
    community.description = description;

    const index = Array.from(this.communities.keys()).indexOf(communityId);
    const header = `COMMUNITY (Updated): /c/${community.slug} (${community.name})`;
    const payload = `${header}\n[DB_ENTITY:COMMUNITY]\n${JSON.stringify(community)}`;

    try {
      const clientMeta = await FigmaAdapter.calculateCommentCoordinates('COMMUNITIES', index >= 0 ? index : 0);
      const newFigmaId = await FigmaAdapter.postComment(payload, undefined, clientMeta);
      community.figmaCommentId = newFigmaId;
      if (oldFigmaId && oldFigmaId !== newFigmaId) {
        try {
          await FigmaAdapter.deleteComment(oldFigmaId);
        } catch (e) {}
      }
    } catch (e) {
      console.warn('[FigmaStore] Community update warning:', e);
    }

    return community;
  }

  public async deleteCommunity(communityId: string): Promise<boolean> {
    const community = this.communities.get(communityId);
    if (!community) return false;

    this.deletedEntityIds.add(community.id);
    this.communities.delete(communityId);

    if (community.figmaCommentId) {
      try {
        await FigmaAdapter.deleteComment(community.figmaCommentId);
      } catch (e) { }
    }
    await FigmaAdapter.deleteComment(community.id);

    // Delete associated posts
    const communityPosts = this.getPostsByCommunity(communityId);
    for (const post of communityPosts) {
      await this.deletePost(post.id);
    }

    // Delete associated memberships
    const communityMemberships = this.getCommunityMemberships(communityId);
    for (const mem of communityMemberships) {
      this.deletedEntityIds.add(mem.id);
      this.memberships.delete(mem.id);
      if (mem.figmaCommentId) {
        try {
          await FigmaAdapter.deleteComment(mem.figmaCommentId);
        } catch (e) { }
      }
      await FigmaAdapter.deleteComment(mem.id);
    }

    return true;
  }

  // --- MEMBERSHIP METHODS ---
  public getMemberships(): Membership[] {
    return Array.from(this.memberships.values());
  }

  public getCommunityMemberships(communityId: string): Membership[] {
    return this.getMemberships().filter((m) => m.communityId === communityId);
  }

  public getUserMemberships(userId: string): Membership[] {
    return this.getMemberships().filter((m) => m.userId === userId);
  }

  public getMembership(communityId: string, userId: string): Membership | undefined {
    return this.getMemberships().find((m) => m.communityId === communityId && m.userId === userId);
  }

  public async setMembership(communityId: string, userId: string, role: Role): Promise<Membership> {
    const oldMemberships = this.getMemberships().filter((m) => m.communityId === communityId && m.userId === userId);
    for (const oldM of oldMemberships) {
      this.deletedEntityIds.delete(oldM.id);
      this.memberships.delete(oldM.id);
      if (oldM.figmaCommentId) {
        try {
          await FigmaAdapter.deleteComment(oldM.figmaCommentId);
        } catch (e) {}
      }
    }

    const user = this.getUserById(userId);
    const com = this.getCommunityById(communityId);

    const membership: Membership = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      communityId,
      userId,
      role,
      joinedAt: Date.now(),
    };

    this.deletedEntityIds.delete(membership.id);
    this.memberships.set(membership.id, membership);

    const index = this.memberships.size - 1;
    const header = `MEMBERSHIP: @${user?.username || userId} is ${role} of /c/${com?.slug || communityId}`;
    const payload = `${header}\n[DB_ENTITY:MEMBERSHIP]\n${JSON.stringify(membership)}`;

    try {
      const clientMeta = await FigmaAdapter.calculateCommentCoordinates('MEMBERSHIPS', index);
      const figmaId = await FigmaAdapter.postComment(payload, undefined, clientMeta);
      membership.figmaCommentId = figmaId;
    } catch (e) {
      console.warn('[FigmaStore] Membership creation warning:', e);
    }

    return membership;
  }

  public async removeMembership(communityId: string, userId: string): Promise<boolean> {
    const matching = this.getMemberships().filter((m) => m.communityId === communityId && m.userId === userId);
    if (matching.length === 0) return false;

    for (const m of matching) {
      this.deletedEntityIds.add(m.id);
      this.memberships.delete(m.id);
      if (m.figmaCommentId) {
        try {
          await FigmaAdapter.deleteComment(m.figmaCommentId);
        } catch (e) { }
      }
      await FigmaAdapter.deleteComment(m.id);
    }
    return true;
  }

  // --- POST ENTITY METHODS ---
  public getPosts(): Post[] {
    return Array.from(this.posts.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public getPostsByCommunity(communityId: string): Post[] {
    return this.getPosts().filter((p) => p.communityId === communityId);
  }

  public getPostsByUser(userId: string): Post[] {
    return this.getPosts().filter((p) => p.authorId === userId);
  }

  public getPostById(id: string): Post | undefined {
    return this.posts.get(id);
  }

  public async createPost(postData: Omit<Post, 'id' | 'createdAt'>): Promise<Post> {
    const post: Post = {
      ...postData,
      title: replaceEmojiShortcodes(postData.title),
      content: replaceEmojiShortcodes(postData.content),
      id: `pst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now(),
    };
    this.posts.set(post.id, post);

    const index = this.posts.size - 1;
    const author = this.getUserById(post.authorId);
    const com = this.getCommunityById(post.communityId);
    const header = `POST: "${post.title}" by @${author?.username || 'user'} in /c/${com?.slug || 'community'}`;
    const payload = `${header}\n[DB_ENTITY:POST]\n${JSON.stringify(post)}`;

    try {
      const clientMeta = await FigmaAdapter.calculateCommentCoordinates('POSTS', index);
      const figmaId = await FigmaAdapter.postComment(payload, undefined, clientMeta);
      post.figmaCommentId = figmaId;
    } catch (e) {
      console.warn('[FigmaStore] Post creation warning:', e);
    }

    return post;
  }

  public async updatePost(postId: string, userId: string, updates: { title?: string; content?: string; type?: 'text' | 'image'; imageUrl?: string }): Promise<Post | null> {
    const post = this.posts.get(postId);
    if (!post || post.authorId !== userId) return null;

    const oldFigmaId = post.figmaCommentId;

    if (updates.title) post.title = replaceEmojiShortcodes(updates.title);
    if (updates.content) post.content = replaceEmojiShortcodes(updates.content);
    if (updates.type) post.type = updates.type;
    if (updates.imageUrl !== undefined) post.imageUrl = updates.imageUrl;

    const index = Array.from(this.posts.keys()).indexOf(postId);
    const author = this.getUserById(post.authorId);
    const header = `POST (Updated): "${post.title}" by @${author?.username || 'user'}`;
    const payload = `${header}\n[DB_ENTITY:POST]\n${JSON.stringify(post)}`;

    try {
      const clientMeta = await FigmaAdapter.calculateCommentCoordinates('POSTS', index >= 0 ? index : 0);
      const newFigmaId = await FigmaAdapter.postComment(payload, undefined, clientMeta);
      post.figmaCommentId = newFigmaId;
      if (oldFigmaId && oldFigmaId !== newFigmaId) {
        try {
          await FigmaAdapter.deleteComment(oldFigmaId);
        } catch (e) {}
      }
    } catch (e) {
      console.warn('[FigmaStore] Post update warning:', e);
    }

    return post;
  }

  public async deletePost(postId: string): Promise<boolean> {
    const post = this.posts.get(postId);
    if (!post) return false;

    this.deletedEntityIds.add(post.id);
    this.posts.delete(postId);

    if (post.figmaCommentId) {
      try {
        await FigmaAdapter.deleteComment(post.figmaCommentId);
      } catch (e) { }
    }

    // Delete associated comments from memory
    for (const [cmtId, cmt] of this.comments.entries()) {
      if (cmt.postId === postId) {
        this.deletedEntityIds.add(cmt.id);
        this.comments.delete(cmtId);
        if (cmt.figmaCommentId) {
          try {
            await FigmaAdapter.deleteComment(cmt.figmaCommentId);
          } catch (e) { }
        }
      }
    }

    return true;
  }

  // --- COMMENT ENTITY METHODS ---
  public getComments(): Comment[] {
    return Array.from(this.comments.values()).sort((a, b) => a.createdAt - b.createdAt);
  }

  public getCommentsByPost(postId: string): Comment[] {
    return this.getComments().filter((c) => c.postId === postId);
  }

  public getCommentsByUser(userId: string): Comment[] {
    return this.getComments().filter((c) => c.authorId === userId);
  }

  public getCommentById(id: string): Comment | undefined {
    return this.comments.get(id);
  }

  public async createComment(postId: string, authorId: string, content: string, parentCommentId: string | null = null): Promise<Comment> {
    const comment: Comment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      postId,
      authorId,
      parentCommentId,
      content: replaceEmojiShortcodes(content),
      createdAt: Date.now(),
    };
    this.comments.set(comment.id, comment);

    const index = this.comments.size - 1;
    const author = this.getUserById(authorId);
    const post = this.getPostById(postId);
    const snippet = comment.content.length > 40 ? comment.content.substring(0, 40) + '...' : comment.content;
    const header = `COMMENT by @${author?.username || 'user'} on "${post?.title || 'post'}": "${snippet}"`;
    const payload = `${header}\n[DB_ENTITY:COMMENT]\n${JSON.stringify(comment)}`;

    try {
      const clientMeta = await FigmaAdapter.calculateCommentCoordinates('COMMENTS', index);
      const figmaId = await FigmaAdapter.postComment(payload, undefined, clientMeta);
      comment.figmaCommentId = figmaId;
    } catch (e) {
      console.warn('[FigmaStore] Comment creation warning:', e);
    }

    return comment;
  }

  public async updateComment(commentId: string, userId: string, content: string): Promise<Comment | null> {
    const comment = this.comments.get(commentId);
    if (!comment || comment.authorId !== userId) return null;

    const oldFigmaId = comment.figmaCommentId;
    comment.content = replaceEmojiShortcodes(content);

    const index = Array.from(this.comments.keys()).indexOf(commentId);
    const author = this.getUserById(userId);
    const snippet = comment.content.length > 40 ? comment.content.substring(0, 40) + '...' : comment.content;
    const header = `COMMENT (Updated) by @${author?.username || 'user'}: "${snippet}"`;
    const payload = `${header}\n[DB_ENTITY:COMMENT]\n${JSON.stringify(comment)}`;

    try {
      const clientMeta = await FigmaAdapter.calculateCommentCoordinates('COMMENTS', index >= 0 ? index : 0);
      const newFigmaId = await FigmaAdapter.postComment(payload, undefined, clientMeta);
      comment.figmaCommentId = newFigmaId;
      if (oldFigmaId && oldFigmaId !== newFigmaId) {
        try {
          await FigmaAdapter.deleteComment(oldFigmaId);
        } catch (e) {}
      }
    } catch (e) {
      console.warn('[FigmaStore] Comment update warning:', e);
    }

    return comment;
  }

  public async deleteComment(commentId: string): Promise<boolean> {
    const comment = this.comments.get(commentId);
    if (!comment) return false;

    this.deletedEntityIds.add(comment.id);
    this.comments.delete(commentId);

    if (comment.figmaCommentId) {
      try {
        await FigmaAdapter.deleteComment(comment.figmaCommentId);
      } catch (e) { }
    }
    return true;
  }

  // --- VOTING METHODS ---
  public getVoteTally(targetId: string): { score: number; upvotes: number; downvotes: number } {
    const targetVotes = this.votes[targetId] || {};
    let upvotes = 0;
    let downvotes = 0;

    for (const val of Object.values(targetVotes)) {
      if (val === 1) upvotes++;
      if (val === -1) downvotes++;
    }

    return { score: upvotes - downvotes, upvotes, downvotes };
  }

  public getUserVote(targetId: string, userId: string): number {
    return this.votes[targetId]?.[userId] || 0;
  }

  public async castVote(targetId: string, userId: string, direction: 1 | -1 | 0): Promise<{ score: number; userVote: number }> {
    if (!this.votes[targetId]) {
      this.votes[targetId] = {};
    }

    if (direction === 0) {
      delete this.votes[targetId][userId];
    } else {
      this.votes[targetId][userId] = direction;
    }

    try {
      await this.flushVoteBatch();
    } catch (e) { }

    const tally = this.getVoteTally(targetId);
    return { score: tally.score, userVote: direction };
  }

  private async flushVoteBatch(): Promise<void> {
    const voteBatch: VoteBatch = {
      batchId: `vbt_${Date.now()}`,
      votes: this.votes,
      updatedAt: Date.now(),
    };

    const clientMeta = await FigmaAdapter.calculateCommentCoordinates('VOTES', 0);
    const totalVotes = Object.values(this.votes).reduce((acc, map) => acc + Object.keys(map).length, 0);
    const header = `VOTE REGISTER BATCH: ${totalVotes} Total Cast Votes`;

    const oldFigmaId = this.lastVoteBatchFigmaId;
    const payload = `${header}\n[DB_ENTITY:VOTE_BATCH]\n${JSON.stringify(voteBatch)}`;
    const newFigmaId = await FigmaAdapter.postComment(payload, undefined, clientMeta);
    this.lastVoteBatchFigmaId = newFigmaId;

    if (oldFigmaId) {
      try {
        await FigmaAdapter.deleteComment(oldFigmaId);
      } catch (e) { }
    }
  }
}

// Attach FigmaStore to globalThis so Next.js serverless functions share in-memory singleton per container
const globalForFigmaStore = globalThis as unknown as {
  figmaStore: FigmaStoreEngine | undefined;
};

if (!globalForFigmaStore.figmaStore) {
  globalForFigmaStore.figmaStore = new FigmaStoreEngine();
} else {
  Object.setPrototypeOf(globalForFigmaStore.figmaStore, FigmaStoreEngine.prototype);
}

export const FigmaStore = globalForFigmaStore.figmaStore;
