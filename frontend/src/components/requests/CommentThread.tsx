import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import '../../styles/components/comments.css';
import { useAddComment, useComments } from '../../hooks/useRequests';
import { useToast } from '../../hooks/useToast';
import { commentFormSchema, type CommentFormValues } from '../../schemas/admin.schema';
import { errorMessage } from '../../services/api-client';
import type { RequestComment, Role } from '../../types/api';
import { cx } from '../../utils/cx';
import { formatDateTime } from '../../utils/format';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ErrorState } from '../ui/EmptyState';
import { LoadMore } from '../ui/LoadMore';
import { Skeleton } from '../ui/Skeleton';
import { Textarea } from '../ui/Textarea';

function authorName(comment: RequestComment, viewerRole: Role): string {
  if (comment.authorRole === 'admin') {
    return viewerRole === 'admin' && comment.authorName ? comment.authorName : 'County officer';
  }
  return viewerRole === 'citizen' ? 'You' : (comment.authorName ?? 'Citizen');
}

function CommentItem({ comment, viewerRole }: { comment: RequestComment; viewerRole: Role }) {
  return (
    <li
      className={cx(
        'comment',
        comment.authorRole === 'admin' && 'comment--officer',
        !comment.isPublic && 'comment--internal',
      )}
    >
      <div className="comment__header">
        <span className="comment__author">{authorName(comment, viewerRole)}</span>
        {!comment.isPublic && <Badge icon="bx-lock-alt">Internal note</Badge>}
        <time className="comment__time" dateTime={comment.createdAt}>
          {formatDateTime(comment.createdAt)}
        </time>
      </div>
      <p className="comment__body">{comment.body}</p>
    </li>
  );
}

interface CommentThreadProps {
  requestId: string;
  viewerRole: Role;
}

export function CommentThread({ requestId, viewerRole }: CommentThreadProps) {
  const comments = useComments(requestId);
  const addComment = useAddComment(requestId);
  const toast = useToast();
  const isOfficer = viewerRole === 'admin';

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { body: '', isPublic: true },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await addComment.mutateAsync(values);
      reset({ body: '', isPublic: values.isPublic });
      toast.show({
        tone: 'success',
        title: values.isPublic ? 'Message sent' : 'Internal note saved',
      });
    } catch (error) {
      toast.show({ tone: 'error', title: 'Could not send message', message: errorMessage(error) });
    }
  });

  const items = comments.data?.pages.flatMap((page) => page.items) ?? [];
  const body = watch('body');

  return (
    <div className="comments">
      {comments.isPending ? (
        <div className="skeleton-stack" role="status" aria-label="Loading messages">
          <Skeleton variant="text" />
          <Skeleton variant="short" />
        </div>
      ) : comments.isError ? (
        <ErrorState
          message={errorMessage(comments.error)}
          onRetry={() => void comments.refetch()}
        />
      ) : items.length === 0 ? (
        <p className="field__hint">No messages yet.</p>
      ) : (
        <ul className="comments__list" aria-label="Messages">
          {items.map((comment) => (
            <CommentItem key={comment.id} comment={comment} viewerRole={viewerRole} />
          ))}
        </ul>
      )}
      <LoadMore
        hasMore={comments.hasNextPage}
        loading={comments.isFetchingNextPage}
        onLoadMore={() => void comments.fetchNextPage()}
        label="Load more messages"
      />
      <form className="form" onSubmit={(event) => void onSubmit(event)} noValidate>
        <Textarea
          label={isOfficer ? 'Add a note' : 'Send a message to the county'}
          rows={3}
          error={errors.body?.message}
          counter={`${body.length} / 2000`}
          {...register('body')}
        />
        <div className="form__actions">
          {isOfficer && (
            <label className="checkbox">
              <input type="checkbox" className="checkbox__input" {...register('isPublic')} />
              Visible to the citizen
            </label>
          )}
          <Button type="submit" icon="bx-send" loading={addComment.isPending}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
