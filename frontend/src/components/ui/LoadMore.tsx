import '../../styles/components/pager.css';
import { Button } from './Button';

interface LoadMoreProps {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  label?: string;
}

/** Cursor pagination for feeds: append the next page on demand. */
export function LoadMore({ hasMore, loading, onLoadMore, label = 'Load more' }: LoadMoreProps) {
  if (!hasMore) return null;
  return (
    <div className="load-more">
      <Button variant="secondary" icon="bx-chevron-down" loading={loading} onClick={onLoadMore}>
        {label}
      </Button>
    </div>
  );
}
