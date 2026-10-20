import type { RequestComment } from '../models/comment.js';
import type { AuthContext } from '../models/context.js';
import type { Page, PageRequest } from '../models/pagination.js';
import type { CommentRepository } from '../repositories/comment.repository.js';
import { toPage } from '../utils/cursor.js';

export interface CommentService {
  list(ctx: AuthContext, requestId: string, page: PageRequest): Promise<Page<RequestComment>>;
  create(
    ctx: AuthContext,
    requestId: string,
    input: { body: string; isPublic: boolean },
  ): Promise<RequestComment>;
}

export function createCommentService(deps: { comments: CommentRepository }): CommentService {
  return {
    async list(ctx, requestId, page) {
      const rows = await deps.comments.list(ctx.db, requestId, page);
      return toPage(rows, page.limit);
    },

    async create(ctx, requestId, input) {
      // Only officers may write internal notes; the DB enforces this too.
      const isPublic = ctx.user.role === 'admin' ? input.isPublic : true;
      return deps.comments.insert(ctx.db, { requestId, body: input.body, isPublic });
    },
  };
}
