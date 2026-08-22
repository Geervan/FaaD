export type Role = 'OWNER' | 'MODERATOR' | 'MEMBER';

export interface User {
  id: string; // e.g. usr_12345678
  username: string;
  passwordHash: string;
  bio: string;
  avatarUrl: string;
  createdAt: number;
  figmaCommentId?: string;
}

export interface Community {
  id: string; // e.g. com_12345678
  slug: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: number;
  figmaCommentId?: string;
}

export interface Membership {
  id: string; // e.g. mem_12345678
  communityId: string;
  userId: string;
  role: Role;
  joinedAt: number;
  figmaCommentId?: string;
}

export interface Post {
  id: string; // e.g. pst_12345678
  communityId: string;
  authorId: string;
  title: string;
  content: string;
  type: 'text' | 'image';
  imageUrl?: string;
  createdAt: number;
  figmaCommentId?: string;
}

export interface Comment {
  id: string; // e.g. cmt_12345678
  postId: string;
  authorId: string;
  parentCommentId: string | null;
  content: string;
  createdAt: number;
  figmaCommentId?: string;
}

export interface VoteBatch {
  batchId: string;
  // targetId -> userId -> 1 | -1
  votes: Record<string, Record<string, number>>;
  updatedAt: number;
  figmaCommentId?: string;
}

export interface SessionUser {
  id: string;
  username: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
