import fs from 'fs';
import path from 'path';

export interface FigmaComment {
  id: string;
  file_key: string;
  parent_id?: string;
  user: {
    handle: string;
    img_url: string;
  };
  created_at: string;
  message: string;
  client_meta?: {
    x?: number;
    y?: number;
  };
}

const globalForFigmaAdapter = globalThis as unknown as {
  figmaCachedComments: FigmaComment[] | null;
  figmaLastCommentsFetch: number;
};

// Force clear stale dev cache
globalForFigmaAdapter.figmaCachedComments = null;
globalForFigmaAdapter.figmaLastCommentsFetch = 0;

const FALLBACK_FILE_PATH = path.join(process.cwd(), '.figma_fallback_comments.json');

export class FigmaAdapter {
  private static commentsCacheTTLMs = 5000; // 5 seconds cache TTL for instant live sync

  public static isConfigured(): boolean {
    const { token, fileKey } = this.getCredentials();
    return Boolean(token && fileKey);
  }

  public static clearMemoryCache(): void {
    globalForFigmaAdapter.figmaCachedComments = null;
    globalForFigmaAdapter.figmaLastCommentsFetch = 0;
  }

  private static getCredentials(): { token: string | undefined; fileKey: string | undefined } {
    return {
      token: process.env.FIGMA_ACCESS_TOKEN || process.env.NEXT_PUBLIC_FIGMA_ACCESS_TOKEN,
      fileKey: process.env.FIGMA_FILE_KEY || process.env.NEXT_PUBLIC_FIGMA_FILE_KEY,
    };
  }

  private static async fetchWithRetry(url: string, options: RequestInit, retries = 2, initialDelayMs = 1000): Promise<Response> {
    let delay = initialDelayMs;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const res = await fetch(url, options);
      if (res.status === 429 && attempt < retries) {
        console.warn(`[FigmaAdapter] Rate limit HTTP 429 encountered. Retrying in ${delay}ms (attempt ${attempt + 1}/${retries})...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 1.5;
        continue;
      }
      return res;
    }
    throw new Error('Fetch failed after max retries');
  }

  public static async calculateCommentCoordinates(
    category: 'USERS' | 'COMMUNITIES' | 'MEMBERSHIPS' | 'POSTS' | 'COMMENTS' | 'VOTES',
    itemIndex: number
  ): Promise<{ x: number; y: number }> {
    const regions: Record<string, { x: number; y: number; width: number; height: number }> = {
      USERS: { x: 50, y: 50, width: 400, height: 600 },
      COMMUNITIES: { x: 500, y: 50, width: 400, height: 600 },
      MEMBERSHIPS: { x: 950, y: 50, width: 400, height: 600 },
      POSTS: { x: 50, y: 700, width: 600, height: 800 },
      COMMENTS: { x: 700, y: 700, width: 650, height: 800 },
      VOTES: { x: 1400, y: 50, width: 300, height: 400 },
    };

    const region = regions[category] || { x: 50, y: 50, width: 400, height: 600 };
    const cols = 2;
    const colWidth = Math.floor(region.width / cols);
    const rowHeight = 40;

    const col = itemIndex % cols;
    const row = Math.floor(itemIndex / cols);

    const paddingTop = 60;
    const paddingLeft = 20;

    const x = Math.round(region.x + paddingLeft + (col * colWidth) + (colWidth / 2));
    const y = Math.round(region.y + paddingTop + (row * rowHeight) + (rowHeight / 2));

    return { x, y };
  }

  // Read comments with 5s TTL cache
  public static async getComments(forceRefresh = false): Promise<FigmaComment[]> {
    const now = Date.now();
    if (!forceRefresh && globalForFigmaAdapter.figmaCachedComments !== null && now - globalForFigmaAdapter.figmaLastCommentsFetch < this.commentsCacheTTLMs) {
      return globalForFigmaAdapter.figmaCachedComments;
    }

    const { token, fileKey } = this.getCredentials();

    if (token && fileKey) {
      try {
        const res = await this.fetchWithRetry(`https://api.figma.com/v1/files/${fileKey}/comments`, {
          headers: { 'X-Figma-Token': token },
          cache: 'no-store',
        });

        if (res.ok) {
          const data = await res.json();
          const comments: FigmaComment[] = data.comments || [];
          
          // Overwrite local fallback file with live API comment list
          this.writeLocalFallbackComments(comments);

          globalForFigmaAdapter.figmaCachedComments = comments;
          globalForFigmaAdapter.figmaLastCommentsFetch = now;
          return comments;
        }
      } catch (err) {
        console.warn('[FigmaAdapter] getComments API error, serving memory cache or fallback:', err);
        if (globalForFigmaAdapter.figmaCachedComments !== null) return globalForFigmaAdapter.figmaCachedComments;
      }
    }

    // Fallback local file storage
    const fallback = this.readLocalFallbackComments();
    globalForFigmaAdapter.figmaCachedComments = fallback;
    globalForFigmaAdapter.figmaLastCommentsFetch = now;
    return fallback;
  }

  // Post a new comment to Figma
  public static async postComment(
    message: string,
    parentId?: string,
    clientMeta?: { x: number; y: number }
  ): Promise<string> {
    const { token, fileKey } = this.getCredentials();
    const fallbackId = `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newComment: FigmaComment = {
      id: fallbackId,
      file_key: fileKey || 'local_file',
      parent_id: parentId,
      user: { handle: 'ForumEngine', img_url: '' },
      created_at: new Date().toISOString(),
      message,
      client_meta: clientMeta ? { x: clientMeta.x, y: clientMeta.y } : undefined,
    };

    if (globalForFigmaAdapter.figmaCachedComments !== null) {
      globalForFigmaAdapter.figmaCachedComments.unshift(newComment);
    } else {
      globalForFigmaAdapter.figmaCachedComments = [newComment];
    }

    const localComments = this.readLocalFallbackComments();
    localComments.push(newComment);
    this.writeLocalFallbackComments(localComments);

    if (token && fileKey) {
      const body: Record<string, any> = { message };
      if (parentId) body.parent_id = parentId;
      if (clientMeta) body.client_meta = { x: clientMeta.x, y: clientMeta.y };

      try {
        const res = await this.fetchWithRetry(`https://api.figma.com/v1/files/${fileKey}/comments`, {
          method: 'POST',
          headers: {
            'X-Figma-Token': token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.id && globalForFigmaAdapter.figmaCachedComments) {
            const item = globalForFigmaAdapter.figmaCachedComments.find((c) => c.id === fallbackId);
            if (item) item.id = data.id;
          }
          return data.id || fallbackId;
        }
      } catch (err) {
        console.warn('[FigmaAdapter] postComment API error, saved locally:', err);
      }
    }

    return fallbackId;
  }

  // Delete a comment or entity ID from Figma, memory cache, and local fallback
  public static async deleteComment(commentOrEntityId: string): Promise<boolean> {
    if (globalForFigmaAdapter.figmaCachedComments !== null) {
      globalForFigmaAdapter.figmaCachedComments = globalForFigmaAdapter.figmaCachedComments.filter(
        (c) => c.id !== commentOrEntityId && !c.message.includes(commentOrEntityId)
      );
    }

    let comments = this.readLocalFallbackComments();
    comments = comments.filter((c) => c.id !== commentOrEntityId && !c.message.includes(commentOrEntityId));
    this.writeLocalFallbackComments(comments);

    const { token, fileKey } = this.getCredentials();
    if (token && fileKey && !commentOrEntityId.startsWith('local_cmt_') && !commentOrEntityId.startsWith('cmt_') && !commentOrEntityId.startsWith('mem_')) {
      try {
        const res = await this.fetchWithRetry(`https://api.figma.com/v1/files/${fileKey}/comments/${commentOrEntityId}`, {
          method: 'DELETE',
          headers: { 'X-Figma-Token': token },
        });

        if (res.ok) {
          return true;
        }
      } catch (err) {
        console.warn('[FigmaAdapter] deleteComment API error:', err);
      }
    }

    return true;
  }

  public static readLocalFallbackComments(): FigmaComment[] {
    try {
      if (fs.existsSync(FALLBACK_FILE_PATH)) {
        const content = fs.readFileSync(FALLBACK_FILE_PATH, 'utf-8');
        return JSON.parse(content);
      }
    } catch (e) {
      console.error('[FigmaAdapter] Error reading fallback file:', e);
    }
    return [];
  }

  private static writeLocalFallbackComments(comments: FigmaComment[]): void {
    try {
      fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(comments, null, 2), 'utf-8');
    } catch (e) {
      console.error('[FigmaAdapter] Error writing fallback file:', e);
    }
  }
}
