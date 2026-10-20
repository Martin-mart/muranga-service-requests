import { ButtonLink } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <EmptyState
      icon="bx-map-pin"
      title="Page not found"
      text="The page you are looking for does not exist or has moved."
      action={<ButtonLink to="/">Go to home</ButtonLink>}
    />
  );
}
